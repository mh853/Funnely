'use client'

// 루트 layout.tsx 자체가 던지는 에러까지 잡는 최후 방어선 에러 바운더리
// globals.css를 import해도 프로덕션에서 CSS 청크 링크가 누락되어 Tailwind가 전혀
// 적용되지 않는 문제가 있어, 외부 CSS에 의존하지 않는 인라인 style로 직접 지정한다
import { useEffect, useState, type CSSProperties } from 'react'

const containerStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f9fafb',
  margin: 0,
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

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isResetHovered, setIsResetHovered] = useState(false)

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="ko">
      <body style={{ margin: 0 }}>
        <div style={containerStyle}>
          <div style={contentStyle}>
            <h1 style={titleStyle}>오류</h1>
            <p style={subtitleStyle}>문제가 발생했습니다</p>
            <p style={descriptionStyle}>
              일시적인 오류로 페이지를 표시할 수 없습니다. 잠시 후 다시 시도해주세요.
            </p>
            <button
              onClick={() => reset()}
              onMouseEnter={() => setIsResetHovered(true)}
              onMouseLeave={() => setIsResetHovered(false)}
              style={isResetHovered ? { ...primaryButtonStyle, ...primaryButtonHoverStyle } : primaryButtonStyle}
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
