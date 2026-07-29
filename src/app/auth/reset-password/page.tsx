// auth/callback이 심어준 pwreset_verified 쿠키 존재 여부를 서버에서 확인해 클라이언트 폼에 전달하는 페이지
import { cookies } from 'next/headers'
import ResetPasswordForm from './ResetPasswordForm'

export default async function ResetPasswordPage() {
  const cookieStore = await cookies()
  const verified = cookieStore.get('pwreset_verified')?.value === '1'

  return <ResetPasswordForm verified={verified} />
}
