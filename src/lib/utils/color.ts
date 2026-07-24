// 배경색 대비 흰색/검은색 중 WCAG 대비 기준을 더 잘 만족하는 텍스트 색을 골라주는 유틸

/**
 * hex 배경색에 대해 흰색(#ffffff) 또는 검정(#000000) 중
 * 상대 휘도 기준으로 더 밝은/어두운 쪽 텍스트 색을 반환한다.
 * 고객사가 랜딩페이지 CTA 버튼 색을 자유롭게 고를 수 있어, 어떤 색을 골라도
 * 텍스트가 읽히도록 매번 계산한다 (WCAG 1.4.3 Contrast Minimum).
 * 짙은 회색(#111827) 대신 순검정을 쓰는 이유: #6366f1처럼 중간 밝기 배경에서는
 * 흰색·짙은 회색 둘 다 4.5:1에 못 미치는 구간이 있고, 그 구간에서 대비 여유가
 * 더 큰 건 순검정 쪽이라 실제로 기준을 통과시키려면 순검정이 필요하다.
 */
function getLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function getContrastTextColor(hexColor: string): string {
  if (hexColor.replace('#', '').length !== 6) return '#ffffff'

  const bgLuminance = getLuminance(hexColor)
  const contrastWithWhite = getContrastRatio(bgLuminance, 1)
  const contrastWithBlack = getContrastRatio(bgLuminance, 0)

  return contrastWithWhite >= contrastWithBlack ? '#ffffff' : '#000000'
}
