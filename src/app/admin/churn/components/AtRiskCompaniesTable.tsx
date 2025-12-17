'use client'

import Link from 'next/link'
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import type { AtRiskCompany } from '@/types/churn'

interface AtRiskCompaniesTableProps {
  companies: AtRiskCompany[]
}

const RISK_COLORS = {
  90: 'bg-red-100 text-red-800',
  70: 'bg-orange-100 text-orange-800',
  50: 'bg-yellow-100 text-yellow-800',
  0: 'bg-gray-100 text-gray-800',
}

function getRiskColor(score: number): string {
  if (score >= 90) return RISK_COLORS[90]
  if (score >= 70) return RISK_COLORS[70]
  if (score >= 50) return RISK_COLORS[50]
  return RISK_COLORS[0]
}

export default function AtRiskCompaniesTable({
  companies,
}: AtRiskCompaniesTableProps) {
  if (companies.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          고위험 회사
        </h3>
        <p className="text-gray-500 text-center py-12">
          고위험 회사가 없습니다
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              고위험 회사 ({companies.length})
            </h3>
            <p className="text-sm text-gray-500">
              이탈 위험이 높은 회사 목록
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                회사명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                위험 점수
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                사용 기간
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                마지막 로그인
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {companies.map((company) => (
              <tr key={company.company_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {company.company_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(company.risk_score)}`}
                  >
                    {company.risk_score}점
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {company.tenure_days}일
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {company.last_login
                    ? new Date(company.last_login).toLocaleDateString('ko-KR')
                    : '없음'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/admin/companies/${company.company_id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    상세보기
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
