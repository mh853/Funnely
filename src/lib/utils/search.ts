// ILIKE 패턴에 검색어를 삽입하기 전 와일드카드 문자를 이스케이프하는 유틸
// %, _가 검색어에 리터럴로 포함돼도 PostgREST가 이를 패턴으로 해석하지 않도록 한다

export function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}
