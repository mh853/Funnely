import { redirect } from 'next/navigation'

// 이 기능은 어떤 랜딩페이지와도 연결된 적 없는 미완성 기능이라 접근을 차단한다.
// 자세한 이유는 src/app/dashboard/form-templates/page.tsx 참고.
export default async function NewFormTemplatePage() {
  redirect('/dashboard')
}
