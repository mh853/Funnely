// 엑셀/CSV로 내보낼 값에 수식 인젝션(CSV Injection) 방어를 적용하는 유틸.
// 값이 =, +, -, @ 로 시작하면 엑셀이 수식으로 해석할 수 있어(OWASP CSV Injection),
// 앞에 어퍼스트로피(')를 붙여 텍스트로 강제 고정한다.

const FORMULA_TRIGGER_CHARS = ['=', '+', '-', '@', '\t', '\r']

export function sanitizeForSpreadsheet(value: unknown): unknown {
  if (typeof value !== 'string') return value
  if (value.length === 0) return value
  return FORMULA_TRIGGER_CHARS.includes(value[0]) ? `'${value}` : value
}

/** 내보내기 직전의 행 배열(객체 리스트) 전체에 재귀적으로 적용 */
export function sanitizeRowsForSpreadsheet<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((row) => {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      sanitized[key] = sanitizeForSpreadsheet(value)
    }
    return sanitized as T
  })
}
