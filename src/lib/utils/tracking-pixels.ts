// 추적 픽셀 ID를 <script> 문자열 보간 전에 검증하는 화이트리스트 유틸리티

// 픽셀 ID에 따옴표/꺾쇠괄호 등 안전하지 않은 문자가 섞여 있으면, dangerouslySetInnerHTML로
// <script> 안에 그대로 문자열 보간될 때 문자열 리터럴을 이탈해 임의 스크립트가 실행될 수 있다
// (저장형 XSS - 회사 소유자가 설정 화면에서 입력한 값이 인증 없이 누구나 보는 공개
// 랜딩페이지에 그대로 렌더링됨). 실제 각 플랫폼의 픽셀/측정 ID는 전부 영문자/숫자/
// 하이픈/언더스코어로만 구성되므로 화이트리스트로 제한한다.
const PIXEL_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export function isValidPixelId(id: string | null | undefined): id is string {
  return typeof id === 'string' && PIXEL_ID_PATTERN.test(id)
}
