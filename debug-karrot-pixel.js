// 당근 픽셀 디버깅 스크립트
// 브라우저 콘솔에서 실행하여 당근 픽셀 상태 확인

console.log('=== 당근 픽셀 디버깅 시작 ===');

// 1. karrot-pixel.js 스크립트가 로드되었는지 확인
const karrotScripts = Array.from(document.scripts).filter(s =>
  s.src.includes('karrot-pixel') || s.innerHTML.includes('karrotPixel')
);
console.log('1. 당근 픽셀 스크립트 발견:', karrotScripts.length, '개');
karrotScripts.forEach((script, idx) => {
  console.log(`   [${idx}] src:`, script.src || '(inline)');
  if (script.innerHTML) {
    console.log(`   [${idx}] 인라인 내용 (처음 100자):`, script.innerHTML.substring(0, 100));
  }
});

// 2. window.karrotPixel 객체가 존재하는지 확인
console.log('2. window.karrotPixel 존재 여부:', typeof window.karrotPixel);
if (window.karrotPixel) {
  console.log('   ✅ karrotPixel 객체 존재');
  console.log('   karrotPixel 객체:', window.karrotPixel);
} else {
  console.log('   ❌ karrotPixel 객체 없음 - 스크립트 로딩 실패');
}

// 3. Network 탭에서 karrot 관련 요청 확인 가이드
console.log('3. Network 탭 확인 가이드:');
console.log('   - F12 → Network 탭');
console.log('   - "karrot"로 필터링');
console.log('   - karrot-pixel.js 로드 성공 확인 (200 OK)');
console.log('   - track API 호출 확인');

// 4. 수동으로 당근 픽셀 실행 테스트
console.log('4. 수동 테스트 명령어:');
console.log('   window.karrotPixel 객체가 있다면:');
console.log('   window.karrotPixel.init("1767945792331556001")');
console.log('   window.karrotPixel.track("ViewPage")');

// 5. Tracking Pixels 데이터 확인
console.log('5. 페이지에서 tracking pixels 데이터 확인:');
console.log('   React DevTools에서 PublicLandingPage 컴포넌트의 trackingPixels prop 확인');

console.log('=== 당근 픽셀 디버깅 완료 ===');
