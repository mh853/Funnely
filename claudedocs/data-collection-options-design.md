# DB 수집 항목 옵션 설계 (옵션1: 기본 / 옵션2: 외부 페이지)

## 개요

랜딩 페이지의 DB 수집 항목 기능을 두 가지 옵션으로 확장합니다:
- **옵션1 (기본)**: 현재 기능 유지 - 랜딩 페이지 내부에서 직접 DB 수집
- **옵션2 (외부 페이지)**: 새로운 외부 페이지로 이동하여 더 많은 정보 수집

## 주요 기능

### 1. 옵션 선택 시스템
- 랜딩 페이지 생성/수정 시 두 옵션 중 선택 가능
- 라디오 버튼으로 명확한 선택 UI
- 선택한 옵션에 따라 다른 설정 UI 표시

### 2. 옵션1 (기본 - 현재 기능)
- **동작**: 랜딩 페이지 내에서 직접 폼 작성 및 제출
- **표시 섹션**: 모든 섹션 표시 (form, realtime_status, cta_button, call_button, timer 등)
- **DB 저장**: `landing_pages.collection_mode = 'inline'`

### 3. 옵션2 (외부 페이지)
- **동작**: CTA 버튼 클릭 시 새로운 외부 페이지로 이동
- **표시 섹션**: CTA 버튼만 표시 (form, realtime_status, call_button은 숨김)
- **외부 페이지**: 고정된 파라미터로 설정된 별도의 상세 정보 수집 페이지
- **DB 저장**: `landing_pages.collection_mode = 'external'`
- **추적**: 외부 페이지 방문 및 제출 정보도 추적

### 4. CTA 버튼 화면 고정 기능 (옵션2 전용)
- **위치 선택**: 상단 고정 / 하단 고정 / 고정 안함
- **적용**: 옵션2 선택 시 CTA 버튼의 sticky position 설정 가능
- **미리보기**: 모바일/데스크탑 미리보기에서 실시간 확인

### 5. 타이머 화면 고정 기능 (공통 적용)
- **위치 선택**: 상단 고정 / 하단 고정 / 고정 안함
- **적용**: 옵션1, 옵션2 모두 적용 가능
- **미리보기**: sticky position으로 스크롤해도 고정된 위치에 표시

## 데이터베이스 설계

### 1. landing_pages 테이블 확장

```sql
-- 기존 테이블에 컬럼 추가
ALTER TABLE landing_pages
-- 수집 모드 (옵션1: inline, 옵션2: external)
ADD COLUMN collection_mode TEXT CHECK (collection_mode IN ('inline', 'external')) DEFAULT 'inline',

-- 외부 페이지 설정 (옵션2 전용)
ADD COLUMN external_page_slug TEXT, -- 외부 페이지 고정 슬러그
ADD COLUMN external_page_params JSONB DEFAULT '{}', -- 외부 페이지 파라미터

-- 타이머 화면 고정 위치 (공통)
ADD COLUMN timer_sticky_position TEXT CHECK (timer_sticky_position IN ('none', 'top', 'bottom')) DEFAULT 'none';

-- 인덱스 추가
CREATE INDEX idx_landing_pages_collection_mode ON landing_pages(collection_mode);
CREATE INDEX idx_landing_pages_external_page_slug ON landing_pages(external_page_slug);

-- 코멘트
COMMENT ON COLUMN landing_pages.collection_mode IS 'DB 수집 모드: inline (페이지 내), external (외부 페이지)';
COMMENT ON COLUMN landing_pages.external_page_slug IS '외부 수집 페이지 슬러그 (옵션2 전용)';
COMMENT ON COLUMN landing_pages.external_page_params IS '외부 페이지 파라미터 (utm_source, campaign_id 등)';
COMMENT ON COLUMN landing_pages.timer_sticky_position IS '타이머 화면 고정 위치: none, top, bottom';
```

### 2. external_collection_pages 테이블 생성

```sql
-- 외부 수집 페이지 정보 관리 (옵션2 전용)
CREATE TABLE external_collection_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 페이지 식별
  slug TEXT UNIQUE NOT NULL, -- 고정 슬러그 (예: collect-detail)
  title TEXT NOT NULL, -- 페이지 제목
  description TEXT, -- 페이지 설명

  -- 수집 항목 설정 (더 많은 정보)
  collect_fields JSONB NOT NULL DEFAULT '[
    {"type": "name", "label": "이름", "required": true},
    {"type": "phone", "label": "연락처", "required": true},
    {"type": "email", "label": "이메일", "required": false},
    {"type": "address", "label": "주소", "required": false},
    {"type": "birth_date", "label": "생년월일", "required": false},
    {"type": "gender", "label": "성별", "required": false},
    {"type": "consultation_type", "label": "상담 종류", "required": true},
    {"type": "message", "label": "상담 내용", "required": false}
  ]',

  -- 디자인 및 설정
  theme JSONB DEFAULT '{"primaryColor": "#6366f1", "backgroundColor": "#ffffff"}',
  success_message TEXT DEFAULT '신청이 완료되었습니다. 곧 연락드리겠습니다.',
  redirect_url TEXT, -- 제출 후 리디렉션 URL

  -- 통계
  views_count INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- 인덱스
CREATE INDEX idx_external_collection_pages_company ON external_collection_pages(company_id);
CREATE INDEX idx_external_collection_pages_slug ON external_collection_pages(slug);
CREATE INDEX idx_external_collection_pages_active ON external_collection_pages(is_active);

-- RLS 정책
ALTER TABLE external_collection_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's external pages"
ON external_collection_pages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.company_id = external_collection_pages.company_id
    AND user_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their company's external pages"
ON external_collection_pages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.company_id = external_collection_pages.company_id
    AND user_profiles.user_id = auth.uid()
  )
);

-- 코멘트
COMMENT ON TABLE external_collection_pages IS '외부 상세 정보 수집 페이지 관리';
```

### 3. leads 테이블 확장

```sql
-- 외부 페이지 수집 정보 추가
ALTER TABLE leads
-- 수집 소스 구분
ADD COLUMN collection_source TEXT CHECK (collection_source IN ('inline', 'external')) DEFAULT 'inline',

-- 외부 페이지 ID (옵션2로 수집된 경우)
ADD COLUMN external_page_id UUID REFERENCES external_collection_pages(id) ON DELETE SET NULL,

-- 추가 수집 정보 (옵션2 전용)
ADD COLUMN email TEXT,
ADD COLUMN address TEXT,
ADD COLUMN birth_date DATE,
ADD COLUMN gender TEXT,
ADD COLUMN consultation_type TEXT,
ADD COLUMN detailed_message TEXT;

-- 인덱스
CREATE INDEX idx_leads_collection_source ON leads(collection_source);
CREATE INDEX idx_leads_external_page_id ON leads(external_page_id);

-- 코멘트
COMMENT ON COLUMN leads.collection_source IS 'DB 수집 소스: inline (랜딩 페이지 내), external (외부 페이지)';
COMMENT ON COLUMN leads.external_page_id IS '외부 수집 페이지 ID (옵션2로 수집된 경우)';
```

## 프론트엔드 설계

### 1. LandingPageNewForm 컴포넌트 수정

#### 새로운 State 변수

```typescript
// Collection mode state
const [collectionMode, setCollectionMode] = useState<'inline' | 'external'>('inline')

// External page settings (옵션2 전용)
const [externalPageSlug, setExternalPageSlug] = useState('collect-detail')
const [externalPageParams, setExternalPageParams] = useState({
  utm_source: 'landing',
  campaign_id: '',
})

// Timer sticky position (공통)
const [timerStickyPosition, setTimerStickyPosition] = useState<'none' | 'top' | 'bottom'>('none')
```

#### UI 구조 변경

```typescript
{/* DB 수집 항목 - 옵션 선택 */}
<div className="bg-white rounded-2xl shadow-lg p-6">
  <h2 className="text-xl font-bold text-gray-900 mb-6">DB 수집 항목</h2>

  {/* 옵션 선택 */}
  <div className="space-y-4 mb-6">
    <div className="flex items-center gap-6">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="radio"
          checked={collectionMode === 'inline'}
          onChange={() => setCollectionMode('inline')}
          className="w-5 h-5 text-indigo-600"
        />
        <div>
          <span className="font-semibold text-gray-900">옵션1: 페이지 내 수집</span>
          <p className="text-xs text-gray-500">랜딩 페이지에서 직접 정보 수집</p>
        </div>
      </label>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="radio"
          checked={collectionMode === 'external'}
          onChange={() => setCollectionMode('external')}
          className="w-5 h-5 text-indigo-600"
        />
        <div>
          <span className="font-semibold text-gray-900">옵션2: 외부 페이지 수집</span>
          <p className="text-xs text-gray-500">별도 페이지에서 상세 정보 수집</p>
        </div>
      </label>
    </div>
  </div>

  {/* 옵션1 설정 (기존 기능) */}
  {collectionMode === 'inline' && (
    <div className="space-y-4 pt-4 border-t border-gray-200">
      {/* 기존 수집 항목 설정 UI */}
      {/* collectName, collectPhone, customFields 등 */}
    </div>
  )}

  {/* 옵션2 설정 (새로운 기능) */}
  {collectionMode === 'external' && (
    <div className="space-y-4 pt-4 border-t border-gray-200">
      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
        <p className="text-sm text-blue-800 flex items-start gap-2">
          <svg className="h-5 w-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <strong>외부 페이지 모드:</strong><br />
            CTA 버튼 클릭 시 상세 정보 수집 페이지로 이동합니다.<br />
            외부 페이지 URL: <code className="bg-blue-100 px-2 py-1 rounded">https://funnely.co.kr/collect/{externalPageSlug}</code>
          </span>
        </p>
      </div>

      {/* 외부 페이지 슬러그 (고정값) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          외부 페이지 슬러그 (고정값)
        </label>
        <input
          type="text"
          value={externalPageSlug}
          readOnly
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
        />
        <p className="text-xs text-gray-500">
          * 외부 페이지 URL은 시스템에서 자동 관리됩니다
        </p>
      </div>

      {/* 캠페인 ID (추적용) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          캠페인 ID (추적용, 선택)
        </label>
        <input
          type="text"
          value={externalPageParams.campaign_id}
          onChange={(e) => setExternalPageParams({ ...externalPageParams, campaign_id: e.target.value })}
          placeholder="예: summer-2025"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </div>
    </div>
  )}
</div>
```

### 2. CTA 버튼 Sticky Position (옵션2 전용)

```typescript
{/* CTA 버튼 설정 */}
<div className="bg-white rounded-2xl shadow-lg p-6">
  <h2 className="text-xl font-bold text-gray-900 mb-6">CTA 버튼</h2>

  {/* 기존 CTA 설정 */}
  <div className="space-y-4">
    {/* ... 기존 UI ... */}

    {/* 화면 고정 위치 (옵션2일 때만 표시) */}
    {collectionMode === 'external' && ctaEnabled && (
      <div className="space-y-2 pt-4 border-t border-gray-200">
        <label className="block text-sm font-medium text-gray-700">
          화면 고정 위치 (옵션2 전용)
        </label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={ctaStickyPosition === 'none'}
              onChange={() => setCtaStickyPosition('none')}
              className="w-4 h-4 text-indigo-600"
            />
            <span className="text-sm text-gray-700">고정 안함</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={ctaStickyPosition === 'top'}
              onChange={() => setCtaStickyPosition('top')}
              className="w-4 h-4 text-indigo-600"
            />
            <span className="text-sm text-gray-700">상단 고정</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={ctaStickyPosition === 'bottom'}
              onChange={() => setCtaStickyPosition('bottom')}
              className="w-4 h-4 text-indigo-600"
            />
            <span className="text-sm text-gray-700">하단 고정</span>
          </label>
        </div>

        {ctaStickyPosition !== 'none' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              💡 외부 페이지 모드에서 CTA 버튼을 {ctaStickyPosition === 'top' ? '상단' : '하단'}에 고정합니다.
            </p>
          </div>
        )}
      </div>
    )}
  </div>
</div>
```

### 3. 타이머 Sticky Position (공통 적용)

```typescript
{/* 타이머 설정 */}
<div className="bg-white rounded-2xl shadow-lg p-6">
  <h2 className="text-xl font-bold text-gray-900 mb-6">타이머</h2>

  <div className="space-y-4">
    {/* 기존 타이머 설정 */}
    {/* ... */}

    {/* 타이머가 활성화된 경우에만 화면 고정 옵션 표시 */}
    {timerEnabled && (
      <div className="space-y-2 pt-4 border-t border-gray-200">
        <label className="block text-sm font-medium text-gray-700">
          화면 고정 위치
        </label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={timerStickyPosition === 'none'}
              onChange={() => setTimerStickyPosition('none')}
              className="w-4 h-4 text-indigo-600"
            />
            <span className="text-sm text-gray-700">고정 안함</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={timerStickyPosition === 'top'}
              onChange={() => setTimerStickyPosition('top')}
              className="w-4 h-4 text-indigo-600"
            />
            <span className="text-sm text-gray-700">상단 고정</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={timerStickyPosition === 'bottom'}
              onChange={() => setTimerStickyPosition('bottom')}
              className="w-4 h-4 text-indigo-600"
            />
            <span className="text-sm text-gray-700">하단 고정</span>
          </label>
        </div>

        {timerStickyPosition !== 'none' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              💡 타이머를 {timerStickyPosition === 'top' ? '상단' : '하단'}에 고정하여 항상 보이게 합니다.
            </p>
          </div>
        )}
      </div>
    )}
  </div>
</div>
```

### 4. 미리보기 섹션 필터링 로직

```typescript
// 옵션2일 때 특정 섹션 숨김 처리
const getPreviewContent = (section: Section) => {
  // 옵션2 (외부 페이지 모드)일 때 특정 섹션 숨김
  if (collectionMode === 'external') {
    if (section.type === 'form') return null // 폼 숨김
    if (section.type === 'realtime_status') return null // 실시간 현황 숨김
    if (section.type === 'call_button') return null // 전화 버튼 숨김
    if (section.type === 'privacy_consent') return null // 개인정보 동의 숨김
  }

  // 나머지 섹션은 기존 로직 사용
  switch (section.type) {
    // ... 기존 코드 ...
  }
}

// renderStickyButtons 수정 (타이머 추가)
const renderStickyButtons = (position: 'top' | 'bottom', isDesktop: boolean = false) => {
  const buttons = []

  // 타이머 (공통)
  if (timerEnabled && timerStickyPosition === position) {
    buttons.push(
      <div
        key="timer"
        className={`rounded-lg ${isDesktop ? 'p-4' : 'p-3'} border-2`}
        style={{ borderColor: timerColor, backgroundColor: `${timerColor}10` }}
      >
        <div className="flex items-center justify-center gap-2">
          <ClockIcon className={`${isDesktop ? 'h-5 w-5' : 'h-4 w-4'}`} style={{ color: timerColor }} />
          <span className={`${isDesktop ? 'text-base' : 'text-sm'} font-bold`} style={{ color: timerColor }}>
            {timerCountdown}
          </span>
        </div>
      </div>
    )
  }

  // CTA Button (옵션2일 때만 sticky 가능)
  if (collectionMode === 'external' && ctaEnabled && ctaStickyPosition === position) {
    buttons.push(
      <button
        key="cta"
        className={`w-full ${isDesktop ? 'py-4 text-base' : 'py-3 text-sm'} rounded-lg font-bold text-white shadow-lg`}
        style={{ backgroundColor: ctaColor }}
      >
        {ctaText || '상담 신청하기'}
      </button>
    )
  }

  // Call Button (옵션1일 때만 sticky 가능 - 기존 로직)
  if (collectionMode === 'inline' && callButtonEnabled && callButtonStickyPosition === position) {
    buttons.push(
      <button
        key="call"
        className={`w-full ${isDesktop ? 'py-4 text-base' : 'py-3 text-sm'} text-white rounded-lg font-bold shadow-lg flex items-center justify-center gap-2`}
        style={{ backgroundColor: callButtonColor }}
      >
        <svg className={`${isDesktop ? 'h-5 w-5' : 'h-4 w-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        {callButtonPhone ? `전화: ${callButtonPhone}` : '전화 상담 받기'}
      </button>
    )
  }

  if (buttons.length === 0) return null

  return (
    <div
      className={`${position === 'top' ? 'sticky top-0' : 'sticky bottom-0'} z-10 bg-white ${isDesktop ? 'p-4' : 'p-3'} border-${position === 'top' ? 'b' : 't'} border-gray-200 shadow-md space-y-${isDesktop ? '3' : '2'}`}
    >
      {buttons}
    </div>
  )
}
```

### 5. 저장 로직 수정

```typescript
const handleSave = async () => {
  setSaving(true)
  setError('')

  try {
    const { error: insertError } = await supabase
      .from('landing_pages')
      .insert({
        company_id: companyId,
        slug,
        title,
        images,
        collect_data: collectData,
        collection_mode: collectionMode,
        external_page_slug: collectionMode === 'external' ? externalPageSlug : null,
        external_page_params: collectionMode === 'external' ? externalPageParams : null,
        collect_fields: collectionMode === 'inline' ? collectFields : [],
        cta_enabled: ctaEnabled,
        cta_text: ctaText,
        cta_color: ctaColor,
        cta_sticky_position: collectionMode === 'external' ? ctaStickyPosition : 'none',
        timer_enabled: timerEnabled,
        timer_sticky_position: timerStickyPosition,
        call_button_sticky_position: collectionMode === 'inline' ? callButtonStickyPosition : 'none',
        is_active: true,
      })

    if (insertError) throw insertError

    router.push('/dashboard/landing-pages')
    router.refresh()
  } catch (err: any) {
    setError(err.message || '저장 중 오류가 발생했습니다.')
  } finally {
    setSaving(false)
  }
}
```

## 외부 수집 페이지 구현

### 1. 라우트 생성

**파일**: `/src/app/collect/[slug]/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ExternalCollectionForm from '@/components/collection/ExternalCollectionForm'

interface PageProps {
  params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function ExternalCollectionPage({ params, searchParams }: PageProps) {
  const supabase = await createClient()

  // 외부 페이지 정보 조회
  const { data: externalPage, error } = await supabase
    .from('external_collection_pages')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (error || !externalPage) {
    return notFound()
  }

  // 유입 출처 확인 (landing_page_id from searchParams)
  const landingPageId = searchParams.ref as string | undefined
  const utmSource = searchParams.utm_source as string | undefined
  const campaignId = searchParams.campaign_id as string | undefined

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <ExternalCollectionForm
        externalPage={externalPage}
        landingPageId={landingPageId}
        utmSource={utmSource}
        campaignId={campaignId}
      />
    </div>
  )
}
```

### 2. ExternalCollectionForm 컴포넌트

**파일**: `/src/components/collection/ExternalCollectionForm.tsx`

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ExternalCollectionFormProps {
  externalPage: any
  landingPageId?: string
  utmSource?: string
  campaignId?: string
}

export default function ExternalCollectionForm({
  externalPage,
  landingPageId,
  utmSource,
  campaignId,
}: ExternalCollectionFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    birth_date: '',
    gender: '',
    consultation_type: '',
    detailed_message: '',
  })

  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      // 필수 동의 확인
      if (!privacyConsent) {
        throw new Error('개인정보 수집·이용 동의는 필수입니다.')
      }

      // 전화번호 해시 생성
      const phoneHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(formData.phone)
      )
      const phoneHashHex = Array.from(new Uint8Array(phoneHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // 리드 정보 저장
      const { error: insertError } = await supabase
        .from('leads')
        .insert({
          company_id: externalPage.company_id,
          landing_page_id: landingPageId || null,
          external_page_id: externalPage.id,
          collection_source: 'external',
          name: formData.name,
          phone: formData.phone,
          phone_hash: phoneHashHex,
          email: formData.email || null,
          address: formData.address || null,
          birth_date: formData.birth_date || null,
          gender: formData.gender || null,
          consultation_type: formData.consultation_type || null,
          detailed_message: formData.detailed_message || null,
          privacy_consent_agreed: privacyConsent,
          marketing_consent_agreed: marketingConsent,
          consented_at: new Date().toISOString(),
          utm_source: utmSource || null,
          utm_campaign: campaignId || null,
          status: 'new',
        })

      if (insertError) throw insertError

      // 제출 카운트 증가
      await supabase
        .from('external_collection_pages')
        .update({ submissions_count: externalPage.submissions_count + 1 })
        .eq('id', externalPage.id)

      // 성공 후 리디렉션
      if (externalPage.redirect_url) {
        router.push(externalPage.redirect_url)
      } else {
        // 기본 성공 메시지 페이지로 이동
        router.push(`/collect/${externalPage.slug}/success`)
      }
    } catch (err: any) {
      setError(err.message || '제출 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {externalPage.title}
          </h1>
          {externalPage.description && (
            <p className="text-gray-600">{externalPage.description}</p>
          )}
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 동적으로 수집 항목 렌더링 */}
          {externalPage.collect_fields.map((field: any, idx: number) => (
            <div key={idx} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {field.type === 'short_answer' && (
                <input
                  type="text"
                  required={field.required}
                  value={formData[field.type as keyof typeof formData] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.type]: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              )}

              {field.type === 'textarea' && (
                <textarea
                  required={field.required}
                  value={formData[field.type as keyof typeof formData] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.type]: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-none"
                />
              )}

              {field.type === 'select' && field.options && (
                <select
                  required={field.required}
                  value={formData[field.type as keyof typeof formData] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.type]: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">선택하세요</option>
                  {field.options.map((opt: string, optIdx: number) => (
                    <option key={optIdx} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
            </div>
          ))}

          {/* 개인정보 동의 */}
          <div className="space-y-3 border-t border-gray-200 pt-6">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyConsent}
                onChange={(e) => setPrivacyConsent(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300"
                required
              />
              <span className="text-sm text-gray-700">
                개인정보 수집·이용 동의 (필수)
              </span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">
                마케팅 활용 동의 (선택)
              </span>
            </label>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: externalPage.theme?.primaryColor || '#6366f1' }}
          >
            {submitting ? '제출 중...' : '신청하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

## 추적 및 분석

### 1. 페이지 뷰 추적

```typescript
// 외부 페이지 진입 시
useEffect(() => {
  async function trackPageView() {
    await supabase
      .from('external_collection_pages')
      .update({ views_count: externalPage.views_count + 1 })
      .eq('id', externalPage.id)
  }
  trackPageView()
}, [])
```

### 2. 유입 경로 분석

```typescript
// 랜딩 페이지에서 외부 페이지로 이동 시 파라미터 전달
const externalPageUrl = `/collect/${externalPageSlug}?ref=${landingPageId}&utm_source=landing&campaign_id=${campaignId}`

// 외부 페이지에서 리드 저장 시 유입 정보 기록
{
  landing_page_id: landingPageId,
  external_page_id: externalPageId,
  utm_source: 'landing',
  utm_campaign: campaignId,
}
```

## 배포 체크리스트

- [ ] 데이터베이스 마이그레이션 실행
- [ ] external_collection_pages 테이블 생성
- [ ] landing_pages 테이블 컬럼 추가
- [ ] leads 테이블 컬럼 추가
- [ ] RLS 정책 설정
- [ ] LandingPageNewForm 컴포넌트 수정
- [ ] 외부 수집 페이지 라우트 생성 (`/collect/[slug]`)
- [ ] ExternalCollectionForm 컴포넌트 구현
- [ ] 미리보기 로직 업데이트 (섹션 필터링)
- [ ] renderStickyButtons 함수 수정 (타이머 추가)
- [ ] 타입스크립트 타입 체크
- [ ] 빌드 테스트

## 향후 개선 사항

1. **외부 페이지 커스터마이징**:
   - 관리자가 외부 페이지 디자인 직접 수정
   - 수집 항목 동적 추가/삭제
   - 테마 색상 변경

2. **A/B 테스팅**:
   - 옵션1 vs 옵션2 전환율 비교
   - 최적 수집 방식 분석

3. **진행률 표시**:
   - 외부 페이지 폼 작성 시 단계별 진행률 표시

4. **자동 저장**:
   - 외부 페이지 폼 작성 중 자동 임시 저장

## 결론

이 설계를 통해:
- ✅ 두 가지 DB 수집 모드 (페이지 내 / 외부 페이지) 제공
- ✅ 외부 페이지에서 더 많은 정보 수집 가능
- ✅ CTA 버튼 화면 고정 (옵션2 전용)
- ✅ 타이머 화면 고정 (공통)
- ✅ 유입 경로 추적 및 분석 강화
- ✅ 유연한 랜딩 페이지 운영 전략 지원

사용자는 간단한 정보만 필요할 때는 옵션1을, 상세한 정보가 필요할 때는 옵션2를 선택하여 최적화된 DB 수집 전략을 수립할 수 있습니다.
