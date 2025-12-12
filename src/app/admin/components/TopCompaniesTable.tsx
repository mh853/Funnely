'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ArrowUpRight, TrendingUp } from 'lucide-react'

interface Company {
  id: string
  name: string
  totalUsers: number
  totalLeads: number
  leadsLast30d: number
  totalPages: number
  growth: string
}

interface TopCompaniesTableProps {
  companies: Company[]
}

export default function TopCompaniesTable({ companies }: TopCompaniesTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>상위 활성 회사 (최근 30일)</CardTitle>
        <Link
          href="/admin/companies"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          전체 보기
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  회사명
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  사용자
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  총 리드
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  30일 리드
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  페이지
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  성장률
                </th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr
                  key={company.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/companies/${company.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                    {company.totalUsers}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                    {company.totalLeads}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      {company.leadsLast30d}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                    {company.totalPages}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-sm font-medium ${
                        parseFloat(company.growth) > 0
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {company.growth}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {companies.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              데이터가 없습니다
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
