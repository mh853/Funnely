'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { CompanyDetail } from '@/types/admin'

interface CompanyHeaderProps {
  company: CompanyDetail
  onToggleStatus: () => void
  isUpdating: boolean
}

export default function CompanyHeader({
  company,
  onToggleStatus,
  isUpdating,
}: CompanyHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-8 py-6">
        {/* 뒤로 가기 */}
        <Link
          href="/admin/companies"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          목록으로
        </Link>

        {/* 회사 정보 */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              <Badge variant={company.is_active ? 'default' : 'secondary'}>
                {company.is_active ? '활성' : '비활성'}
              </Badge>
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-500">ID: {company.id}</p>
              <p className="text-sm text-gray-500">
                가입일: {format(new Date(company.created_at), 'yyyy년 MM월 dd일', { locale: ko })}
              </p>
              <p className="text-sm text-gray-500">
                담당자: {company.admin_user?.full_name || '미지정'}
                {company.admin_user?.email && `(${company.admin_user.email})`}
              </p>
            </div>
          </div>

          {/* 액션 버튼 */}
          <Button
            variant={company.is_active ? 'destructive' : 'default'}
            onClick={onToggleStatus}
            disabled={isUpdating}
          >
            {isUpdating
              ? '처리 중...'
              : company.is_active
              ? '비활성화'
              : '활성화'}
          </Button>
        </div>
      </div>
    </div>
  )
}
