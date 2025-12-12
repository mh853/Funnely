import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Company {
  id: string
  name: string
  joinedAt: string
  totalUsers: number
  status: 'active' | 'inactive'
}

interface RecentCompaniesProps {
  companies: Company[]
  maxItems?: number
}

export default function RecentCompanies({
  companies,
  maxItems = 5,
}: RecentCompaniesProps) {
  const displayCompanies = companies.slice(0, maxItems)

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 가입 회사</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayCompanies.map((company) => (
            <Link
              key={company.id}
              href={`/admin/companies/${company.id}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{company.name}</p>
                  <Badge
                    variant={company.status === 'active' ? 'default' : 'secondary'}
                  >
                    {company.status === 'active' ? '활성' : '비활성'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(company.joinedAt), {
                    addSuffix: true,
                    locale: ko,
                  })}
                  {' · '}
                  사용자 {company.totalUsers}명
                </p>
              </div>
            </Link>
          ))}

          {displayCompanies.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              최근 가입한 회사가 없습니다
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
