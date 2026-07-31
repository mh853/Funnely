// Storage 파일 업로드 서버 프록시. 브라우저가 Supabase Storage에 직접 업로드하던
// 기존 구조는 클라이언트가 선언한 Content-Type만 저장되고 실제 파일 내용은 검증할
// 방법이 없었다(48차 QA에서 HTML을 image/jpeg로 위장해 그대로 공개 서빙됨을 라이브로
// 확인). 모든 업로드를 이 라우트로 통과시켜 매직넘버로 실제 내용을 검증한 뒤에만
// 서비스 롤로 올린다 - storage.objects의 INSERT 정책은 authenticated 대상으로는
// 더 이상 존재하지 않는다(같은 마이그레이션에서 제거).
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateFileContent } from '@/lib/storage/validate-file'

type UploadKind = 'landing-page-image' | 'completion-background' | 'support-attachment'

const KIND_CONFIG: Record<
  UploadKind,
  { bucket: string; allowedMimeTypes: string[]; maxSize: number }
> = {
  'landing-page-image': {
    bucket: 'public-assets',
    // 클라이언트가 canvas로 항상 image/jpeg로 재압축한 뒤 업로드하므로 실제 형식은 항상 jpeg
    allowedMimeTypes: ['image/jpeg'],
    maxSize: 50 * 1024 * 1024,
  },
  'completion-background': {
    bucket: 'landing-page-images',
    allowedMimeTypes: ['image/jpeg'],
    maxSize: 2 * 1024 * 1024,
  },
  'support-attachment': {
    bucket: 'support-attachments',
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/json',
      'text/csv',
    ],
    maxSize: 10 * 1024 * 1024,
  },
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const kind = formData.get('kind') as UploadKind | null
    const ticketId = formData.get('ticketId') as string | null

    if (!(file instanceof File) || !kind || !(kind in KIND_CONFIG)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const config = KIND_CONFIG[kind]

    if (file.size > config.maxSize) {
      return NextResponse.json(
        { error: `파일 크기는 최대 ${Math.floor(config.maxSize / 1024 / 1024)}MB까지 업로드 가능합니다.` },
        { status: 400 }
      )
    }

    const svc = createServiceClient()
    const { data: profile } = await svc
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // 업로드 경로는 서버가 직접 구성한다 - 클라이언트가 회사 경로를 지정하게 하면
    // 크로스테넌트 업로드가 그대로 재현되므로(48차 QA) 본인 소속 회사만 쓸 수 있다.
    let filePath: string
    if (kind === 'support-attachment') {
      if (!ticketId) {
        return NextResponse.json({ error: '티켓 정보가 누락되었습니다.' }, { status: 400 })
      }
      const { data: ticket } = await svc
        .from('support_tickets')
        .select('company_id')
        .eq('id', ticketId)
        .maybeSingle()
      if (!ticket || ticket.company_id !== profile.company_id) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
      }
      const sanitized = sanitizeFileName(file.name)
      filePath = `${ticketId}/${Date.now()}_${sanitized}`
    } else {
      const prefix = kind === 'landing-page-image' ? 'landing-pages' : 'completion-backgrounds'
      const ext = kind === 'completion-background' ? file.name.split('.').pop() || 'jpg' : 'jpg'
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${ext}`
      filePath = `${prefix}/${profile.company_id}/${fileName}`
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const validation = validateFileContent(buffer, file.type, config.allowedMimeTypes)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 400 })
    }

    const { error: uploadError } = await svc.storage
      .from(config.bucket)
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('[Storage Upload Proxy] 업로드 실패:', uploadError)
      return NextResponse.json({ error: '파일 업로드에 실패했습니다.' }, { status: 500 })
    }

    if (kind === 'support-attachment') {
      return NextResponse.json({ path: filePath })
    }

    const { data: publicUrlData } = svc.storage.from(config.bucket).getPublicUrl(filePath)
    return NextResponse.json({ path: filePath, publicUrl: publicUrlData.publicUrl })
  } catch (error) {
    console.error('[Storage Upload Proxy] 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
