// 팀원 관리는 /dashboard/team으로 일원화됨 - 예전 경로 호환을 위한 리다이렉트
import { redirect } from 'next/navigation'

export default function UsersPage() {
  redirect('/dashboard/team')
}
