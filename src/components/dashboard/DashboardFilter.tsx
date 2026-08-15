'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { toKSTDateStr } from '@/lib/utils/date'

export default function DashboardFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 서버(UTC) 첫 렌더와 클라이언트(KST) 하이드레이션이 다른 "이번달"을 그리지 않도록
  // ReportsClient(87차)와 같은 결정적 헬퍼로 통일한다. 이 컴포넌트는 아직 대시보드에
  // 연결되지 않았지만, 연결되는 순간 같은 하이드레이션 버그가 바로 난다.
  const [nowYear, nowMonth] = toKSTDateStr(new Date()).split('-').map(Number)
  const currentYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : nowYear
  const currentMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : nowMonth

  const isCurrentMonth = currentYear === nowYear && currentMonth === nowMonth

  // 월 변경 함수
  const changeMonth = (direction: 'prev' | 'next') => {
    let newYear = currentYear
    let newMonth = currentMonth

    if (direction === 'prev') {
      if (currentMonth === 1) {
        newYear = currentYear - 1
        newMonth = 12
      } else {
        newMonth = currentMonth - 1
      }
    } else {
      if (currentMonth === 12) {
        newYear = currentYear + 1
        newMonth = 1
      } else {
        newMonth = currentMonth + 1
      }
    }

    // 미래 월은 선택 불가
    const targetDate = new Date(newYear, newMonth - 1, 1)
    const nowDate = new Date(nowYear, nowMonth - 1, 1)
    if (targetDate > nowDate) return

    router.push(`/dashboard?year=${newYear}&month=${newMonth}`)
  }

  // 이번달로 이동
  const goToCurrentMonth = () => {
    router.push('/dashboard')
  }

  // 월 선택 목록 생성 (최근 12개월)
  const monthOptions = []
  for (let i = 0; i < 12; i++) {
    const date = new Date(nowYear, nowMonth - 1 - i, 1)
    monthOptions.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: `${date.getFullYear()}년 ${date.getMonth() + 1}월`
    })
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [year, month] = e.target.value.split('-')
    if (parseInt(year) === nowYear && parseInt(month) === nowMonth) {
      router.push('/dashboard')
    } else {
      router.push(`/dashboard?year=${year}&month=${month}`)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* 이전 월 버튼 */}
      <button
        onClick={() => changeMonth('prev')}
        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        title="이전 달"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>

      {/* 월 선택 드롭다운 */}
      <div className="relative">
        <select
          value={`${currentYear}-${currentMonth}`}
          onChange={handleSelectChange}
          className="appearance-none bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 pr-8 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          {monthOptions.map(opt => (
            <option
              key={`${opt.year}-${opt.month}`}
              value={`${opt.year}-${opt.month}`}
              className="text-gray-900"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
      </div>

      {/* 다음 월 버튼 */}
      <button
        onClick={() => changeMonth('next')}
        disabled={isCurrentMonth}
        className={`p-2 rounded-lg transition-colors ${
          isCurrentMonth
            ? 'bg-white/5 text-white/30 cursor-not-allowed'
            : 'bg-white/10 hover:bg-white/20'
        }`}
        title="다음 달"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>

      {/* 이번달 버튼 */}
      {!isCurrentMonth && (
        <button
          onClick={goToCurrentMonth}
          className="ml-2 px-3 py-2 text-sm font-medium bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
        >
          이번달
        </button>
      )}
    </div>
  )
}
