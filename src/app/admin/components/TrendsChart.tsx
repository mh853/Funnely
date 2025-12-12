'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface TrendsChartProps {
  data: Array<{
    date: string
    companies: number
    users: number
    leads: number
  }>
}

export default function TrendsChart({ data }: TrendsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>성장 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value)
                return `${date.getMonth() + 1}/${date.getDate()}`
              }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              labelFormatter={(value) => {
                const date = new Date(value as string)
                return date.toLocaleDateString('ko-KR')
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="companies"
              stroke="#8884d8"
              name="회사"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="users"
              stroke="#82ca9d"
              name="사용자"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="leads"
              stroke="#ffc658"
              name="리드"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
