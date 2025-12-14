# 완료 페이지 배경 이미지 및 미리보기 설계

## 📋 요구사항 분석

### 1. 배경 이미지 업로드
- **목적**: 완료 페이지 상단 파란색 배경을 커스텀 이미지로 교체
- **위치**: 현재 `bg-gradient-to-br from-blue-400 to-indigo-600` 영역
- **요구**: 이미지 업로드 UI + 이미지 크기 가이드

### 2. 완료 페이지 미리보기
- **목적**: 우측 미리보기 사이드바에 완료 화면 탭 추가
- **기능**: 랜딩 페이지 미리보기와 완료 페이지 미리보기 탭 전환

### 3. 참고 스크린샷 분석
완료 페이지 구조:
```
┌─────────────────────────────────────────────┐
│  [파란색 배경 - 이미지로 교체 가능 영역]      │
│                                             │
│         ✓ 아이콘 (흰색 원)                   │
│                                             │
│       신청 완료!                             │
│    성공적으로 접수되었습니다                  │
│                                             │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  [흰색 배경]                                 │
│                                             │
│  신청이 완료되었습니다. 곧 연락드리겠습니다.   │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ ℹ️ 담당자가 빠른 시일 내에...          │  │
│  │    문의사항이 있으시면...              │  │
│  └───────────────────────────────────────┘  │
│                                             │
│         [× 창 닫기 버튼]                     │
│                                             │
└─────────────────────────────────────────────┘
```

## 🏗️ 데이터베이스 스키마 설계

### landing_pages 테이블 확장

```sql
ALTER TABLE landing_pages
ADD COLUMN completion_bg_image TEXT,
ADD COLUMN completion_bg_color VARCHAR(7) DEFAULT '#5b8def';

COMMENT ON COLUMN landing_pages.completion_bg_image IS
'완료 페이지 배경 이미지 URL (Supabase Storage)';

COMMENT ON COLUMN landing_pages.completion_bg_color IS
'완료 페이지 배경 색상 (이미지 없을 때 사용)';
```

### 마이그레이션 파일
```sql
-- 20251214000008_add_completion_bg_image.sql
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS completion_bg_image TEXT,
ADD COLUMN IF NOT EXISTS completion_bg_color VARCHAR(7) DEFAULT '#5b8def';

COMMENT ON COLUMN landing_pages.completion_bg_image IS
'완료 페이지 배경 이미지 URL (Supabase Storage path)';

COMMENT ON COLUMN landing_pages.completion_bg_color IS
'완료 페이지 배경 색상 (이미지 없을 때 폴백)';
```

## 📐 이미지 업로드 UI 설계

### 컴포넌트 구조

```tsx
{/* Completion Page Settings */}
<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
  <div className="flex items-center gap-3 mb-4 sm:mb-6">
    <h2>완료 페이지 설정</h2>
  </div>

  <div className="space-y-4 sm:space-y-6">

    {/* NEW: 배경 이미지 업로드 */}
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        배경 이미지
        <span className="ml-2 text-xs font-normal text-gray-500">
          완료 페이지 상단 배경 (선택사항)
        </span>
      </label>

      {/* Image Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6">
        {completionBgImage ? (
          // 이미지 업로드 완료 상태
          <div className="relative">
            <img
              src={completionBgImage}
              alt="배경 미리보기"
              className="w-full h-40 object-cover rounded-lg"
            />
            <button
              onClick={handleRemoveCompletionBgImage}
              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          // 업로드 대기 상태
          <div className="text-center">
            <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-2">
              클릭하여 이미지 업로드
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleCompletionBgImageUpload}
              className="hidden"
              id="completion-bg-upload"
            />
            <label
              htmlFor="completion-bg-upload"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer"
            >
              이미지 선택
            </label>
          </div>
        )}
      </div>

      {/* 이미지 가이드 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800 font-semibold mb-1">
          📏 이미지 크기 가이드
        </p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 권장 크기: 1200 x 600 픽셀 (2:1 비율)</li>
          <li>• 최대 용량: 2MB</li>
          <li>• 지원 형식: JPG, PNG, WebP</li>
          <li>• 텍스트가 보이도록 어두운 배경 추천</li>
        </ul>
      </div>

      {/* 배경 색상 폴백 */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600">
          배경 색상 (이미지 없을 때)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={completionBgColor}
            onChange={(e) => setCompletionBgColor(e.target.value)}
            className="w-12 h-12 rounded-lg cursor-pointer"
          />
          <input
            type="text"
            value={completionBgColor}
            onChange={(e) => setCompletionBgColor(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
            placeholder="#5b8def"
          />
        </div>
      </div>
    </div>

    {/* 기존: 완료 메시지 */}
    <div className="space-y-2">...</div>

    {/* 기존: 안내 멘트 */}
    <div className="space-y-2">...</div>

    {/* 기존 미리보기 제거 - 우측 사이드바로 이동 */}
  </div>
</div>
```

## 🎨 우측 미리보기 탭 설계

### 탭 전환 UI

```tsx
{/* Interactive Preview Sidebar */}
<div className="sticky top-6 self-start w-full ml-2">
  <div className="h-[calc(100vh-3rem)] flex flex-col bg-white rounded-2xl shadow-lg p-6">

    {/* 탭 헤더 */}
    <div className="flex items-center justify-between mb-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        <EyeIcon className="h-6 w-6 text-indigo-600" />
        <h2 className="text-xl font-bold text-gray-900">미리보기</h2>
      </div>

      {/* Desktop Preview Button */}
      <button
        onClick={() => setShowDesktopPreview(true)}
        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs"
      >
        데스크탑
      </button>
    </div>

    {/* NEW: 탭 네비게이션 */}
    <div className="flex gap-2 mb-4 border-b border-gray-200 flex-shrink-0">
      <button
        onClick={() => setPreviewTab('landing')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          previewTab === 'landing'
            ? 'text-indigo-600 border-b-2 border-indigo-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        랜딩 페이지
      </button>
      <button
        onClick={() => setPreviewTab('completion')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          previewTab === 'completion'
            ? 'text-indigo-600 border-b-2 border-indigo-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        완료 페이지
      </button>
    </div>

    {/* 미리보기 콘텐츠 */}
    <div className="flex-1 overflow-hidden flex flex-col">
      {previewTab === 'landing' ? (
        // 기존 랜딩 페이지 미리보기
        <LandingPagePreview />
      ) : (
        // NEW: 완료 페이지 미리보기
        <CompletionPagePreview />
      )}
    </div>

    {/* Help Text */}
    <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl flex-shrink-0">
      ...
    </div>
  </div>
</div>
```

### 완료 페이지 미리보기 컴포넌트

```tsx
const CompletionPagePreview = () => {
  return (
    <div className="bg-gray-900 rounded-3xl p-3 shadow-2xl w-full max-w-[400px] h-full max-h-[700px] flex flex-col mx-auto">
      <div className="bg-white rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Phone Status Bar */}
        <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200 flex-shrink-0">
          <span className="text-xs font-medium text-gray-600">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-3 border border-gray-400 rounded-sm"></div>
            <div className="w-1 h-3 bg-gray-400 rounded-sm"></div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-white relative min-h-0">
          {/* 배경 이미지 또는 색상 영역 */}
          <div
            className="relative h-64 flex items-center justify-center text-white p-8"
            style={{
              backgroundImage: completionBgImage
                ? `url(${completionBgImage})`
                : 'none',
              backgroundColor: completionBgImage ? 'transparent' : completionBgColor,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* 체크 아이콘 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                  <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-center mb-2 drop-shadow-lg">
                신청 완료!
              </h1>
              <p className="text-sm text-center drop-shadow-lg">
                성공적으로 접수되었습니다
              </p>
            </div>
          </div>

          {/* 흰색 배경 콘텐츠 */}
          <div className="p-6 space-y-4">
            <p className="text-gray-700 text-base font-medium text-center">
              {successMessage || '신청이 완료되었습니다. 곧 연락드리겠습니다.'}
            </p>

            {completionInfoMessage && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-600 whitespace-pre-line">
                    {completionInfoMessage}
                  </p>
                </div>
              </div>
            )}

            <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium flex items-center justify-center gap-2">
              <XMarkIcon className="h-5 w-5" />
              창 닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

## 💾 이미지 업로드 로직

### Supabase Storage 설정

```typescript
// 이미지 업로드 함수
const handleCompletionBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  // 파일 크기 검증 (2MB)
  if (file.size > 2 * 1024 * 1024) {
    alert('이미지 크기는 2MB 이하여야 합니다.')
    return
  }

  // 파일 형식 검증
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    alert('JPG, PNG, WebP 형식만 지원됩니다.')
    return
  }

  try {
    setUploading(true)

    // Supabase Storage 업로드
    const fileExt = file.name.split('.').pop()
    const fileName = `${companyId}/${Date.now()}.${fileExt}`
    const filePath = `completion-backgrounds/${fileName}`

    const { data, error } = await supabase.storage
      .from('landing-page-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // Public URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from('landing-page-images')
      .getPublicUrl(filePath)

    setCompletionBgImage(publicUrl)
  } catch (error) {
    console.error('Image upload error:', error)
    alert('이미지 업로드 실패')
  } finally {
    setUploading(false)
  }
}

// 이미지 삭제 함수
const handleRemoveCompletionBgImage = async () => {
  if (!completionBgImage) return

  try {
    // Storage에서 파일 삭제
    const filePath = completionBgImage.split('/').slice(-2).join('/')

    await supabase.storage
      .from('landing-page-images')
      .remove([`completion-backgrounds/${filePath}`])

    setCompletionBgImage(null)
  } catch (error) {
    console.error('Image delete error:', error)
  }
}
```

### Storage Bucket 설정

```sql
-- Supabase Storage Bucket 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('landing-page-images', 'landing-page-images', true);

-- RLS 정책
CREATE POLICY "Staff can upload completion bg images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'landing-page-images'
  AND (storage.foldername(name))[1] = 'completion-backgrounds'
  AND auth.uid() IN (
    SELECT id FROM users
    WHERE role IN ('company_owner', 'hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff')
  )
);

CREATE POLICY "Public can view completion bg images"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-page-images');

CREATE POLICY "Staff can delete their completion bg images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'landing-page-images'
  AND (storage.foldername(name))[1] = 'completion-backgrounds'
  AND auth.uid() IN (
    SELECT id FROM users
    WHERE role IN ('company_owner', 'hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff')
  )
);
```

## 🎯 State 관리

### 추가 State

```typescript
// 완료 페이지 배경 설정
const [completionBgImage, setCompletionBgImage] = useState<string | null>(
  landingPage?.completion_bg_image || null
)
const [completionBgColor, setCompletionBgColor] = useState(
  landingPage?.completion_bg_color || '#5b8def'
)
const [uploading, setUploading] = useState(false)

// 미리보기 탭
const [previewTab, setPreviewTab] = useState<'landing' | 'completion'>('landing')
```

### Save 함수 업데이트

```typescript
const dataToSave = {
  // ... 기존 필드들
  success_message: successMessage || null,
  completion_info_message: completionInfoMessage || null,
  completion_bg_image: completionBgImage || null,  // NEW
  completion_bg_color: completionBgColor,          // NEW
  // ...
}
```

## 📱 반응형 고려사항

### 모바일 (< 1024px)
- 이미지 업로드: 터치 친화적 버튼 크기
- 미리보기: 데스크탑 모달로만 제공 (기존 동작 유지)

### 데스크탑 (≥ 1024px)
- 이미지 업로드: 드래그 앤 드롭 지원
- 미리보기: 우측 사이드바에 탭 표시

## 🧪 테스트 시나리오

### 이미지 업로드
- [ ] 2MB 이하 이미지 업로드 성공
- [ ] 2MB 초과 이미지 업로드 거부
- [ ] JPG, PNG, WebP 형식 업로드 성공
- [ ] GIF, BMP 등 미지원 형식 거부
- [ ] 이미지 삭제 정상 작동
- [ ] 업로드 중 로딩 표시

### 미리보기
- [ ] 랜딩 페이지 탭 정상 표시
- [ ] 완료 페이지 탭 정상 표시
- [ ] 탭 전환 애니메이션 부드러움
- [ ] 이미지 있을 때 배경 표시
- [ ] 이미지 없을 때 색상 폴백
- [ ] 텍스트 실시간 반영

### 데이터 저장
- [ ] 이미지 URL 저장 성공
- [ ] 배경 색상 저장 성공
- [ ] 수정 시 기존 이미지 불러오기
- [ ] 이미지 삭제 후 null 저장

## 📊 성능 최적화

### 이미지 최적화
- 업로드 전 클라이언트 리사이징 (1200x600)
- WebP 자동 변환 옵션
- Progressive JPEG 권장

### 캐싱 전략
- Storage: `cache-control: 3600` (1시간)
- Browser: 이미지 미리로드
- CDN: Supabase CDN 활용

## 🔐 보안 고려사항

### RLS 정책
- 업로드: 인증된 스태프만
- 조회: 공개 (public URL)
- 삭제: 본인 회사 이미지만

### 파일 검증
- MIME 타입 검증
- 파일 크기 제한
- 악성 파일 스캔 (Supabase 자동)

## 📝 구현 체크리스트

### 데이터베이스
- [ ] 마이그레이션 파일 생성
- [ ] 컬럼 추가 및 주석
- [ ] Storage bucket 생성
- [ ] RLS 정책 설정

### UI 컴포넌트
- [ ] 이미지 업로드 UI 추가
- [ ] 이미지 가이드 표시
- [ ] 배경 색상 선택기
- [ ] 탭 네비게이션 추가
- [ ] 완료 페이지 미리보기 컴포넌트

### 로직
- [ ] 이미지 업로드 함수
- [ ] 이미지 삭제 함수
- [ ] State 관리 추가
- [ ] Save 함수 업데이트
- [ ] 파일 검증 로직

### 테스트
- [ ] 기능 테스트 전체 실행
- [ ] 반응형 테스트
- [ ] 성능 테스트
- [ ] 보안 테스트
