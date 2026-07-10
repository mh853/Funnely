import { redirect } from 'next/navigation'

// 이 기능은 어떤 랜딩페이지와도 연결된 적 없는 미완성 기능이다 (랜딩페이지 에디터는
// 필드 수집을 sections JSONB 기반의 별도 시스템으로 처리하며 form_templates를
// 전혀 참조하지 않는다). 내비게이션에도 노출되지 않으며, 직접 URL 접근도 차단한다.
export default async function FormTemplatesPage() {
  redirect('/dashboard')
}
