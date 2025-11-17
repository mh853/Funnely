'use client'

import { useState, useEffect } from 'react'
import { Section } from '@/types/landing-page.types'

interface TimerSectionProps {
  section: Section
  themeColors: { primary: string; secondary: string }
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export default function TimerSection({ section, themeColors }: TimerSectionProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    // Calculate time left until deadline
    const calculateTimeLeft = () => {
      const deadline = section.props.deadline
        ? new Date(section.props.deadline)
        : new Date(Date.now() + 24 * 60 * 60 * 1000) // Default: 24 hours from now

      const difference = deadline.getTime() - Date.now()

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        }
      }

      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [section.props.deadline])

  return (
    <section className="py-16 px-6 bg-gray-900 text-white">
      <h2 className="text-3xl font-bold text-center mb-8">
        {section.props.title || '특별 할인 마감까지'}
      </h2>
      <div className="flex justify-center gap-4 flex-wrap">
        {section.props.showDays !== false && (
          <TimerUnit label="일" value={String(timeLeft.days).padStart(2, '0')} />
        )}
        {section.props.showHours !== false && (
          <TimerUnit label="시" value={String(timeLeft.hours).padStart(2, '0')} />
        )}
        {section.props.showMinutes !== false && (
          <TimerUnit label="분" value={String(timeLeft.minutes).padStart(2, '0')} />
        )}
        {section.props.showSeconds !== false && (
          <TimerUnit label="초" value={String(timeLeft.seconds).padStart(2, '0')} />
        )}
      </div>
    </section>
  )
}

function TimerUnit({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="bg-white text-gray-900 text-4xl font-bold rounded-lg p-4 min-w-[80px] mb-2">
        {value}
      </div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  )
}
