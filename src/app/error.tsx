'use client'

// 렌더링 중 발생한 예외를 잡아 기본 크래시 화면 대신 보여주는 에러 바운더리
// Next.js App Router에서 error.tsx는 CSS 청크 링크가 누락된 채 렌더링될 수 있어
// Tailwind 클래스 대신 인라인 style로 직접 지정한다 (CSS 미로드 상태에서도 정상 표시)
import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'

const containerStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f9fafb',
}

const contentStyle: CSSProperties = {
  textAlign: 'center',
}

const titleStyle: CSSProperties = {
  fontSize: '3.75rem',
  fontWeight: 700,
  color: '#111827',
  marginBottom: '1rem',
}

const subtitleStyle: CSSProperties = {
  fontSize: '1.25rem',
  color: '#4b5563',
  marginBottom: '2rem',
}

const descriptionStyle: CSSProperties = {
  fontSize: '0.875rem',
  color: '#6b7280',
  marginBottom: '2rem',
}

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
}

const primaryButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.75rem 1.5rem',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '1rem',
  fontWeight: 500,
  color: '#ffffff',
  backgroundColor: '#2563eb',
  cursor: 'pointer',
}

const primaryButtonHoverStyle: CSSProperties = {
  backgroundColor: '#1d4ed8',
}

const secondaryButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.75rem 1.5rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '1rem',
  fontWeight: 500,
  color: '#374151',
  backgroundColor: '#ffffff',
  textDecoration: 'none',
}

const secondaryButtonHoverStyle: CSSProperties = {
  backgroundColor: '#f9fafb',
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isResetHovered, setIsResetHovered] = useState(false)
  const [isHomeHovered, setIsHomeHovered] = useState(false)

  useEffect(() => {
    console.error(error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <h1 style={titleStyle}>오류</h1>
        <p style={subtitleStyle}>문제가 발생했습니다</p>
        <p style={descriptionStyle}>
          일시적인 오류로 페이지를 표시할 수 없습니다. 잠시 후 다시 시도해주세요.
        </p>
        <div style={buttonRowStyle}>
          <button
            onClick={() => reset()}
            onMouseEnter={() => setIsResetHovered(true)}
            onMouseLeave={() => setIsResetHovered(false)}
            style={isResetHovered ? { ...primaryButtonStyle, ...primaryButtonHoverStyle } : primaryButtonStyle}
          >
            다시 시도
          </button>
          <Link
            href="/"
            onMouseEnter={() => setIsHomeHovered(true)}
            onMouseLeave={() => setIsHomeHovered(false)}
            style={isHomeHovered ? { ...secondaryButtonStyle, ...secondaryButtonHoverStyle } : secondaryButtonStyle}
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
