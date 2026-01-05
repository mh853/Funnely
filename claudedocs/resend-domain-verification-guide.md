# Resend 도메인 인증 완전 가이드

## 목차
1. [왜 도메인 인증이 필요한가?](#왜-도메인-인증이-필요한가)
2. [도메인 추가 및 DNS 레코드 설정](#도메인-추가-및-dns-레코드-설정)
3. [DNS 제공업체별 설정 방법](#dns-제공업체별-설정-방법)
4. [DNS 전파 및 인증 확인](#dns-전파-및-인증-확인)
5. [트러블슈팅](#트러블슈팅)

---

## 왜 도메인 인증이 필요한가?

### 이메일 발송 도메인 인증의 중요성

Resend는 이메일 스팸 방지와 발송 신뢰도 향상을 위해 도메인 인증을 요구합니다.

**인증 전 (개발 환경)**:
- 발신자: `onboarding@resend.dev` (Resend 제공 도메인)
- 제한: 테스트 목적으로만 사용 가능
- 수신자 제한: 제한된 수신자에게만 전송 가능

**인증 후 (프로덕션)**:
- 발신자: `noreply@funnely.co.kr` (본인의 도메인)
- 장점:
  - 브랜드 신뢰도 향상 (사용자가 공식 도메인에서 온 메일로 인식)
  - 스팸 필터 회피율 향상
  - 무제한 수신자에게 전송 가능
  - 이메일 전달률(Deliverability) 향상

### 필요한 DNS 레코드

1. **SPF (Sender Policy Framework)**
   - 목적: 도메인에서 이메일을 보낼 수 있는 서버 지정
   - 필수 여부: ✅ 필수

2. **DKIM (DomainKeys Identified Mail)**
   - 목적: 이메일 무결성 검증 (변조 방지)
   - 필수 여부: ✅ 필수

3. **DMARC (Domain-based Message Authentication, Reporting & Conformance)**
   - 목적: SPF/DKIM 실패 시 처리 방법 정의
   - 필수 여부: ⚠️ 권장 (선택)

---

## 도메인 추가 및 DNS 레코드 설정

### Step 1: Resend Dashboard에 도메인 추가

1. **Resend Dashboard 접속**
   ```
   https://resend.com/domains
   ```

2. **Add Domain 버튼 클릭**
   - 오른쪽 상단 "Add Domain" 또는 "+" 버튼 클릭

3. **도메인 정보 입력**
   - **Domain**: `funnely.co.kr`
   - **Region**: `Asia Pacific (Seoul)` (한국 사용자용 최적화)
   - **Submit** 클릭

4. **DNS 레코드 확인**
   - Resend가 자동으로 3개의 DNS 레코드 생성
   - 각 레코드의 **Type**, **Name**, **Value** 복사 준비

### Step 2: DNS 레코드 예시

Resend가 제공하는 DNS 레코드 예시 (실제 값은 다를 수 있음):

#### SPF 레코드
```
Type: TXT
Name: @ (또는 funnely.co.kr)
Value: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```

#### DKIM 레코드
```
Type: TXT
Name: resend._domainkey (또는 resend._domainkey.funnely.co.kr)
Value: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC... [매우 긴 값]
TTL: 3600
```

#### DMARC 레코드 (권장)
```
Type: TXT
Name: _dmarc (또는 _dmarc.funnely.co.kr)
Value: v=DMARC1; p=none; rua=mailto:dmarc@funnely.co.kr
TTL: 3600
```

---

## DNS 제공업체별 설정 방법

### 가비아 (Gabia)

가비아는 한국에서 가장 많이 사용되는 도메인 등록업체입니다.

#### 1. My가비아 로그인
```
https://my.gabia.com
```

#### 2. DNS 설정 페이지 이동
1. 상단 메뉴 → **서비스 관리**
2. **도메인** 탭 클릭
3. `funnely.co.kr` 옆의 **관리** 버튼 클릭
4. **DNS 설정** 또는 **DNS 정보** 탭 선택
5. **레코드 수정** 버튼 클릭

#### 3. SPF 레코드 추가
```
레코드 추가 → TXT 선택
호스트: @ (또는 비워두기)
값/데이터: v=spf1 include:_spf.resend.com ~all
TTL: 3600 (기본값)
```

#### 4. DKIM 레코드 추가
```
레코드 추가 → TXT 선택
호스트: resend._domainkey
값/데이터: [Resend에서 제공한 긴 DKIM 값 전체 복사]
TTL: 3600 (기본값)
```

#### 5. DMARC 레코드 추가 (선택)
```
레코드 추가 → TXT 선택
호스트: _dmarc
값/데이터: v=DMARC1; p=none
TTL: 3600 (기본값)
```

#### 6. 저장 및 적용
- **저장** 또는 **적용** 버튼 클릭
- 변경사항 적용까지 5~10분 소요

---

### Cloudflare

Cloudflare는 DNS 관리와 CDN 서비스를 제공합니다.

#### 1. Cloudflare Dashboard 로그인
```
https://dash.cloudflare.com
```

#### 2. 도메인 선택
- 좌측 사이드바에서 `funnely.co.kr` 선택

#### 3. DNS 설정 페이지 이동
- 좌측 메뉴 → **DNS** → **Records** 클릭

#### 4. SPF 레코드 추가
```
Add record 클릭

Type: TXT
Name: @ (또는 funnely.co.kr)
Content: v=spf1 include:_spf.resend.com ~all
TTL: Auto
Proxy status: DNS only (⚠️ 중요: 프록시 비활성화 필수!)
```

#### 5. DKIM 레코드 추가
```
Add record 클릭

Type: TXT
Name: resend._domainkey
Content: [Resend DKIM 값 전체 복사]
TTL: Auto
Proxy status: DNS only (⚠️ 중요: 프록시 비활성화 필수!)
```

#### 6. DMARC 레코드 추가
```
Add record 클릭

Type: TXT
Name: _dmarc
Content: v=DMARC1; p=none
TTL: Auto
Proxy status: DNS only
```

#### 7. Save 클릭
- 각 레코드 추가 후 **Save** 버튼 클릭

⚠️ **Cloudflare 중요 주의사항**:
- **Proxy status는 반드시 "DNS only"로 설정**해야 합니다.
- "Proxied" 상태에서는 DNS 레코드가 제대로 전파되지 않을 수 있습니다.

---

### AWS Route53

AWS Route53은 아마존 웹 서비스의 DNS 서비스입니다.

#### 1. AWS Console 로그인
```
https://console.aws.amazon.com/route53
```

#### 2. Hosted Zones 선택
- 좌측 메뉴 → **Hosted zones** 클릭
- `funnely.co.kr` 선택

#### 3. SPF 레코드 추가
```
Create record 클릭

Record name: @ (또는 비워두기)
Record type: TXT - Text
Value: "v=spf1 include:_spf.resend.com ~all" (큰따옴표 포함 필수!)
TTL (seconds): 300
Routing policy: Simple routing
```
**Create records** 클릭

#### 4. DKIM 레코드 추가
```
Create record 클릭

Record name: resend._domainkey
Record type: TXT - Text
Value: "[Resend DKIM 값]" (큰따옴표 포함 필수!)
TTL (seconds): 300
Routing policy: Simple routing
```
**Create records** 클릭

#### 5. DMARC 레코드 추가
```
Create record 클릭

Record name: _dmarc
Record type: TXT - Text
Value: "v=DMARC1; p=none" (큰따옴표 포함 필수!)
TTL (seconds): 300
Routing policy: Simple routing
```
**Create records** 클릭

⚠️ **Route53 중요 주의사항**:
- TXT 레코드 값은 **반드시 큰따옴표(`"`)로 감싸야** 합니다.
- 예: `"v=spf1 include:_spf.resend.com ~all"`

---

### Netlify DNS

Netlify는 정적 사이트 호스팅과 DNS 서비스를 제공합니다.

#### 1. Netlify Dashboard 로그인
```
https://app.netlify.com
```

#### 2. 도메인 관리 페이지 이동
- 상단 메뉴 → **Domains** 클릭
- `funnely.co.kr` 선택

#### 3. DNS 레코드 추가
- **DNS records** 섹션으로 스크롤
- **Add new record** 버튼 클릭

#### 4. SPF 레코드 추가
```
Record type: TXT
Name: @ (또는 비워두기)
Value: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```
**Save** 클릭

#### 5. DKIM 레코드 추가
```
Record type: TXT
Name: resend._domainkey
Value: [Resend DKIM 값]
TTL: 3600
```
**Save** 클릭

#### 6. DMARC 레코드 추가
```
Record type: TXT
Name: _dmarc
Value: v=DMARC1; p=none
TTL: 3600
```
**Save** 클릭

---

### 기타 DNS 제공업체

위에서 다루지 않은 DNS 제공업체를 사용하는 경우:

1. **공통 단계**:
   - DNS 관리 페이지 접속
   - TXT 레코드 추가 기능 찾기
   - Resend가 제공한 3개 레코드 추가

2. **주의사항**:
   - 레코드 Type은 반드시 **TXT**로 설정
   - Name/Host 필드에 정확히 입력 (@ 또는 서브도메인)
   - Value 필드에 Resend 값 전체 복사
   - TTL은 기본값 사용 (보통 3600)

---

## DNS 전파 및 인증 확인

### DNS 전파 시간

DNS 레코드 추가 후 전파되기까지 시간이 필요합니다:

- **일반적**: 5분 ~ 1시간
- **최대**: 48시간 (드물게)
- **평균**: 10~30분

### Resend에서 인증 확인

#### 1. Resend Dashboard로 돌아가기
```
https://resend.com/domains
```

#### 2. 도메인 선택
- 추가한 `funnely.co.kr` 도메인 클릭

#### 3. Verify DNS records 클릭
- **Verify** 또는 **Check DNS** 버튼 클릭
- Resend가 자동으로 DNS 레코드 확인

#### 4. 인증 성공 확인
각 레코드 옆에 초록색 체크 마크(✅)가 나타나면 성공!

```
✅ SPF Record
✅ DKIM Record
✅ DMARC Record (선택)
```

### 수동 DNS 레코드 확인

터미널이나 명령 프롬프트에서 직접 확인할 수 있습니다.

#### macOS / Linux

```bash
# SPF 레코드 확인
dig TXT funnely.co.kr +short

# DKIM 레코드 확인
dig TXT resend._domainkey.funnely.co.kr +short

# DMARC 레코드 확인
dig TXT _dmarc.funnely.co.kr +short
```

#### Windows (PowerShell)

```powershell
# SPF 레코드 확인
nslookup -type=TXT funnely.co.kr

# DKIM 레코드 확인
nslookup -type=TXT resend._domainkey.funnely.co.kr

# DMARC 레코드 확인
nslookup -type=TXT _dmarc.funnely.co.kr
```

#### 정상 출력 예시

**SPF**:
```
"v=spf1 include:_spf.resend.com ~all"
```

**DKIM**:
```
"v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."
```

**DMARC**:
```
"v=DMARC1; p=none"
```

### 온라인 DNS 확인 도구

웹 브라우저에서 확인할 수 있는 도구들:

1. **MXToolbox**
   ```
   https://mxtoolbox.com/SuperTool.aspx
   ```
   - 입력: `funnely.co.kr` + TXT Lookup

2. **DNSChecker**
   ```
   https://dnschecker.org
   ```
   - 전 세계 DNS 서버에서 전파 상태 확인

3. **Google Admin Toolbox**
   ```
   https://toolbox.googleapps.com/apps/dig/
   ```
   - 구글 제공 DNS 조회 도구

---

## 트러블슈팅

### 문제 1: DNS 레코드가 확인되지 않음

**증상**:
```bash
dig TXT funnely.co.kr +short
# 출력 없음 또는 다른 값
```

**원인**:
- DNS 레코드가 아직 전파되지 않음
- DNS 레코드 설정이 잘못됨

**해결**:
1. **전파 대기**
   - 10~30분 대기 후 재확인
   - 최대 48시간까지 기다려야 할 수도 있음

2. **DNS 제공업체 설정 재확인**
   - Name/Host 필드 정확성 확인
   - Value 필드에 전체 값 복사되었는지 확인
   - TTL 값 적절성 확인 (3600 권장)

3. **DNS 캐시 초기화** (macOS/Linux)
   ```bash
   # macOS
   sudo dscacheutil -flushcache
   sudo killall -HUP mDNSResponder

   # Linux
   sudo systemd-resolve --flush-caches
   ```

4. **다른 DNS 서버로 확인**
   ```bash
   # Google DNS로 확인
   dig @8.8.8.8 TXT funnely.co.kr +short

   # Cloudflare DNS로 확인
   dig @1.1.1.1 TXT funnely.co.kr +short
   ```

---

### 문제 2: Resend 인증이 계속 실패함

**증상**:
- DNS 레코드는 확인되지만 Resend에서 인증 실패
- "DNS records not found" 에러

**원인**:
- Resend 서버가 아직 업데이트된 DNS를 확인하지 못함
- DNS 레코드 형식 오류

**해결**:
1. **1~2시간 대기 후 재시도**
   - DNS 전파 지연일 가능성

2. **레코드 값 재확인**
   - Resend Dashboard에 표시된 값과 정확히 일치하는지 확인
   - 공백, 따옴표, 특수문자 확인

3. **Resend 지원팀 문의**
   - [Resend Support](https://resend.com/support) 접속
   - DNS 레코드 스크린샷 첨부하여 문의

---

### 문제 3: Cloudflare에서 Proxy 상태 문제

**증상**:
- DNS 레코드 추가했지만 Resend에서 확인 안 됨
- Cloudflare의 주황색 구름 아이콘(Proxied) 활성화됨

**원인**:
- TXT 레코드가 Cloudflare 프록시를 통과하면서 변경됨

**해결**:
1. **DNS only로 변경**
   - Cloudflare Dashboard → DNS → Records
   - 각 TXT 레코드 옆의 주황색 구름 아이콘 클릭
   - "DNS only" (회색 구름) 상태로 변경

2. **변경 후 재확인**
   ```bash
   dig TXT resend._domainkey.funnely.co.kr +short
   ```

---

### 문제 4: Route53에서 큰따옴표 문제

**증상**:
- DNS 레코드 추가했지만 Resend 인증 실패
- 조회 시 큰따옴표 없이 출력됨

**원인**:
- Route53은 TXT 레코드 값을 큰따옴표로 감싸야 함

**해결**:
1. **레코드 수정**
   - Route53 → Hosted zones → 레코드 선택
   - Edit 클릭
   - Value 필드:
     ```
     잘못: v=spf1 include:_spf.resend.com ~all
     올바름: "v=spf1 include:_spf.resend.com ~all"
     ```

2. **저장 및 재확인**
   ```bash
   dig TXT funnely.co.kr +short
   ```

---

### 문제 5: DKIM 값이 너무 길어서 입력 안 됨

**증상**:
- DKIM 레코드 값이 너무 길어서 DNS 관리 페이지에 붙여넣기 불가
- 값이 잘림

**원인**:
- 일부 DNS 제공업체는 긴 TXT 레코드를 지원하지 않음

**해결**:
1. **값 분할 입력** (일부 제공업체 지원)
   - DKIM 값을 255자 단위로 나눠서 입력
   - 예:
     ```
     "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN..." (첫 번째 부분)
     "ADCBiQKBgQC8..." (두 번째 부분)
     ```

2. **DNS 제공업체 변경 고려**
   - Cloudflare, Route53, Netlify 등은 긴 TXT 레코드 지원

3. **Resend 지원팀 문의**
   - 대체 방법이나 짧은 DKIM 키 요청

---

## 도메인 인증 완료 후 작업

### 코드 업데이트

도메인 인증이 완료되면 발신 이메일 주소를 변경하세요.

**파일**: `src/lib/email/send-lead-notification.ts`

```typescript
// 변경 전 (개발용)
from: 'Funnely <onboarding@resend.dev>',

// 변경 후 (프로덕션용)
from: 'Funnely <noreply@funnely.co.kr>',
```

### 테스트 메일 발송

1. **로컬 환경 테스트**
   ```
   http://localhost:3000/dashboard/settings/notifications
   ```
   - "테스트 메일 보내기" 클릭
   - 이메일 수신 확인

2. **발신자 확인**
   - 받은 메일의 발신자가 `noreply@funnely.co.kr`인지 확인

3. **스팸 폴더 확인**
   - 처음에는 스팸 폴더로 분류될 수 있음
   - 정상 메일로 표시하여 신뢰도 향상

### Vercel 배포

1. **코드 커밋 및 푸시**
   ```bash
   git add src/lib/email/send-lead-notification.ts
   git commit -m "fix: 도메인 인증 완료 후 발신 이메일 변경"
   git push origin main
   ```

2. **Vercel 자동 배포 대기**
   - Vercel이 자동으로 배포 시작
   - 배포 완료 확인

3. **프로덕션 테스트**
   ```
   https://funnely.co.kr/dashboard/settings/notifications
   ```
   - 실제 리드 생성 및 이메일 수신 확인

---

## 추가 리소스

### Resend 공식 문서
- [Domain Authentication](https://resend.com/docs/dashboard/domains/introduction)
- [DNS Records Setup](https://resend.com/docs/dashboard/domains/dns-records)
- [Troubleshooting Guide](https://resend.com/docs/dashboard/domains/troubleshooting)

### DNS 학습 자료
- [Cloudflare DNS 학습 센터](https://www.cloudflare.com/learning/dns/what-is-dns/)
- [AWS Route53 튜토리얼](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html)

### 이메일 인증 표준
- [SPF 설명](https://dmarcian.com/what-is-spf/)
- [DKIM 설명](https://dmarcian.com/what-is-dkim/)
- [DMARC 설명](https://dmarcian.com/what-is-dmarc/)

---

## 요약 체크리스트

✅ **도메인 추가**
- [ ] Resend Dashboard에 `funnely.co.kr` 추가
- [ ] Region을 `Asia Pacific (Seoul)`로 설정

✅ **DNS 레코드 설정**
- [ ] SPF 레코드 추가 (필수)
- [ ] DKIM 레코드 추가 (필수)
- [ ] DMARC 레코드 추가 (권장)

✅ **DNS 전파 확인**
- [ ] 10~30분 대기
- [ ] `dig` 명령어로 수동 확인
- [ ] 온라인 DNS 도구로 전 세계 전파 확인

✅ **Resend 인증**
- [ ] Resend Dashboard에서 "Verify" 클릭
- [ ] 모든 레코드에 초록색 체크 마크 확인

✅ **코드 업데이트**
- [ ] 발신 이메일 `@funnely.co.kr`로 변경
- [ ] 로컬 테스트 성공
- [ ] Git 커밋 및 푸시

✅ **프로덕션 배포**
- [ ] Vercel 자동 배포 완료
- [ ] 프로덕션 환경 테스트
- [ ] 실제 리드 생성 및 이메일 수신 확인

---

**문서 작성일**: 2025-01-05
**최종 업데이트**: 2025-01-05
**작성자**: Claude Code
**프로젝트**: Funnely Lead Notification System
