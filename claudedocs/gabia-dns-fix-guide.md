# 가비아 DNS - Resend 도메인 인증 수정 가이드

## 🔍 문제 분석

### 현재 상황
- **가비아 DNS**: 루트 도메인(`@`)에 SPF/MX 레코드 설정됨
- **Resend 요구사항**: `send` 서브도메인에 SPF/MX 레코드 필요
- **결과**: Resend가 DNS 레코드를 찾지 못함 (Failed)

### Resend 스크린샷 분석
```
SPF 레코드 요구사항:
- Name: send
- Type: MX → feedback-smtp.ap-northeast-1.amazonses.com
- Type: TXT → v=spf1 include:amazonses.com ~all
```

## ✅ 해결 방법 A: 서브도메인 레코드 추가

Resend가 `send.funnely.co.kr` 서브도메인을 사용하도록 설정된 경우:

### 1. 가비아 DNS 관리 페이지 접속
```
https://dns.gabia.com
→ funnely.co.kr 선택
→ DNS 설정 → 레코드 수정
```

### 2. send 서브도메인 MX 레코드 추가

**현재 설정 유지** (이미 올바름):
```
Type: MX
호스트: @
값: feedback-smtp.ap-northeast-1.amazonses.com
우선순위: 10
TTL: 3600
```

**추가 필요한 레코드**:
```
레코드 추가 클릭

Type: MX
호스트: send
값: feedback-smtp.ap-northeast-1.amazonses.com
우선순위: 10
TTL: 3600

저장
```

### 3. send 서브도메인 TXT 레코드 추가

**현재 설정 유지** (이미 올바름):
```
Type: TXT
호스트: @
값: v=spf1 include:amazonses.com ~all
TTL: 3600
```

**추가 필요한 레코드**:
```
레코드 추가 클릭

Type: TXT
호스트: send
값: v=spf1 include:amazonses.com ~all
TTL: 3600

저장
```

### 4. DNS 전파 확인 (10~30분 후)

```bash
# send 서브도메인 MX 확인
dig MX send.funnely.co.kr +short

# send 서브도메인 TXT 확인
dig TXT send.funnely.co.kr +short

# 정상 출력:
# 10 feedback-smtp.ap-northeast-1.amazonses.com.
# "v=spf1 include:amazonses.com ~all"
```

### 5. Resend 재확인
```
Resend Dashboard → Domains → funnely.co.kr
→ Restart 버튼 클릭
→ 모든 레코드 ✅ 확인
```

---

## ✅ 해결 방법 B: Resend 도메인 재설정 (권장)

Resend에서 도메인 설정이 잘못된 경우, 삭제 후 재추가:

### 1. Resend에서 도메인 삭제

```
1. https://resend.com/domains 접속
2. funnely.co.kr 옆의 ⋮ (점 3개) 클릭
3. Delete 선택
4. 확인
```

### 2. 도메인 재추가

```
1. Add Domain 버튼 클릭
2. 입력 정보:
   - Domain: funnely.co.kr
   - Region: Tokyo (ap-northeast-1)
   - 서브도메인 사용 옵션: 체크 해제 (루트 도메인 사용)
3. Submit 클릭
```

### 3. 새로운 DNS 레코드 확인

Resend가 새로 생성한 DNS 레코드 확인:

**예상되는 레코드 (루트 도메인 기준)**:
```
DKIM:
Type: TXT
Name: resend._domainkey
Value: p=MIGfMA... (새로운 값)

SPF MX:
Type: MX
Name: @ (또는 비워두기)
Value: feedback-smtp.ap-northeast-1.amazonses.com

SPF TXT:
Type: TXT
Name: @ (또는 비워두기)
Value: v=spf1 include:amazonses.com ~all
```

### 4. 가비아 DNS 업데이트 (필요 시)

**DKIM 레코드 업데이트**:
- 기존: `resend._domainkey` 레코드 삭제
- 새로 추가: Resend가 제공한 새로운 DKIM 값으로 교체

**SPF 레코드**:
- 현재 설정 (`@` 호스트) 그대로 유지
- 변경 불필요

### 5. DNS 전파 대기 및 확인

```bash
# DKIM 새 값 확인
dig TXT resend._domainkey.funnely.co.kr +short

# SPF 확인
dig TXT funnely.co.kr +short
dig MX funnely.co.kr +short
```

### 6. Resend 인증 완료

```
Resend Dashboard → Domains → funnely.co.kr
→ Verify 또는 Check DNS 클릭
→ 모든 레코드 ✅ 초록색 체크 확인
```

---

## 🔍 문제 진단 체크리스트

### DNS 전파 확인 명령어

```bash
# 루트 도메인 확인
dig TXT funnely.co.kr +short
dig MX funnely.co.kr +short
dig TXT resend._domainkey.funnely.co.kr +short

# send 서브도메인 확인
dig TXT send.funnely.co.kr +short
dig MX send.funnely.co.kr +short

# 여러 DNS 서버로 확인
dig @8.8.8.8 TXT funnely.co.kr +short
dig @1.1.1.1 TXT funnely.co.kr +short
dig @168.126.63.1 TXT funnely.co.kr +short  # KT DNS
```

### 정상 출력 예시

**루트 도메인 (@)**:
```bash
# SPF TXT
"v=spf1 include:amazonses.com ~all"

# MX
10 feedback-smtp.ap-northeast-1.amazonses.com.

# DKIM
"p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."
```

**send 서브도메인** (방법 A 선택 시):
```bash
# SPF TXT
"v=spf1 include:amazonses.com ~all"

# MX
10 feedback-smtp.ap-northeast-1.amazonses.com.
```

---

## ⚠️ 주의사항

### 1. 기존 레코드 유지
- 현재 가비아에 설정된 `@` 호스트의 레코드는 **삭제하지 마세요**
- 추가로 `send` 호스트 레코드를 **추가**하는 것입니다

### 2. DNS 전파 시간
- 레코드 추가 후 5~30분 대기
- 최대 48시간까지 걸릴 수 있음 (드물게)

### 3. Resend Region 확인
- Resend에서 도메인 추가 시 **Tokyo (ap-northeast-1)** 선택
- 이미 추가된 경우 Region 변경 불가 → 삭제 후 재추가 필요

### 4. 가비아 호스트 필드 입력 규칙
```
✅ 올바름: send (서브도메인만 입력)
❌ 잘못: send.funnely.co.kr (전체 도메인 입력 X)

✅ 올바름: @ (루트 도메인)
❌ 잘못: funnely.co.kr (전체 도메인 입력 X)

✅ 올바름: resend._domainkey
❌ 잘못: resend._domainkey.funnely.co.kr
```

---

## 🆘 여전히 안 된다면

### 즉시 시도할 것

1. **DNS 캐시 초기화** (macOS/Linux)
   ```bash
   # macOS
   sudo dscacheutil -flushcache
   sudo killall -HUP mDNSResponder

   # Linux
   sudo systemd-resolve --flush-caches
   ```

2. **다른 DNS 서버로 확인**
   ```bash
   # Google DNS
   dig @8.8.8.8 TXT send.funnely.co.kr +short

   # Cloudflare DNS
   dig @1.1.1.1 MX send.funnely.co.kr +short
   ```

3. **온라인 DNS 확인 도구**
   ```
   https://dnschecker.org
   → TXT 선택
   → send.funnely.co.kr 입력
   → 전 세계 DNS 전파 상태 확인
   ```

### 가비아 고객센터 문의

**연락처**: 1544-4755

**요청사항**:
```
안녕하세요. funnely.co.kr 도메인의 DNS 레코드 설정을 확인하고 싶습니다.

Resend 이메일 서비스 사용을 위해 다음 레코드를 추가했습니다:
1. send 서브도메인에 MX 레코드: feedback-smtp.ap-northeast-1.amazonses.com
2. send 서브도메인에 TXT 레코드: v=spf1 include:amazonses.com ~all

DNS 전파가 정상적으로 되고 있는지 확인 부탁드립니다.
```

---

## 📋 최종 가비아 DNS 설정 목표

### 완료 후 예상되는 레코드 목록

```
타입    호스트                  값/데이터                                    TTL    우선순위
────────────────────────────────────────────────────────────────────────────────────────
CNAME   *                      fe22ad37e4365ed9.vercel-dns-017.com        3600   -
TXT     resend._domainkey      p=MIGfMA0GCSq... (긴 값)                   3600   -
TXT     _dmarc                 v=DMARC1; p=none;                          3600   -
TXT     @                      v=spf1 include:amazonses.com ~all          3600   -
TXT     send                   v=spf1 include:amazonses.com ~all          3600   -
MX      @                      feedback-smtp.ap-northeast-1.amazons...    3600   10
MX      send                   feedback-smtp.ap-northeast-1.amazons...    3600   10
```

### Resend에서 확인할 내용

```
Domain Verification: ✅ Verified
DKIM: ✅ resend._domainkey → p=MIGfMA0GCSq...
SPF: ✅ send → v=spf1 include:amazonses.com ~all
     ✅ send → feedback-smtp.ap-northeast-1.amazonses.com
```

---

**문서 작성일**: 2025-01-05
**최종 업데이트**: 2025-01-05
**작성자**: Claude Code
**프로젝트**: Funnely - Resend 도메인 인증 수정
