# Phase 4.3: 고급 내보내기 기능 설계

## 개요

관리자가 다양한 데이터를 여러 형식(CSV, Excel, PDF)으로 내보낼 수 있는 기능을 구현합니다.

## 목표

1. **유연한 데이터 선택**: 필터링된 데이터, 선택된 항목, 전체 데이터 내보내기
2. **다양한 형식 지원**: CSV, Excel (.xlsx), PDF
3. **커스터마이징**: 컬럼 선택, 정렬, 그룹화
4. **비동기 처리**: 대용량 데이터는 백그라운드 작업으로 처리
5. **다운로드 관리**: 생성된 파일 이력 및 재다운로드

## 데이터베이스 스키마

### export_jobs 테이블

```sql
CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 내보내기 정보
  export_type TEXT NOT NULL CHECK (export_type IN ('leads', 'companies', 'subscriptions', 'users', 'custom')),
  format TEXT NOT NULL CHECK (format IN ('csv', 'xlsx', 'pdf')),

  -- 필터 및 옵션
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  columns TEXT[] NOT NULL,  -- 포함할 컬럼 목록
  sort_by TEXT,
  sort_order TEXT CHECK (sort_order IN ('asc', 'desc')),

  -- 실행 정보
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,

  -- 결과 파일
  file_path TEXT,  -- Storage 경로
  file_size INTEGER,  -- bytes
  download_url TEXT,
  expires_at TIMESTAMPTZ,  -- 다운로드 만료 시간

  -- 에러 정보
  error_message TEXT,

  -- 메타데이터
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_export_jobs_type ON export_jobs(export_type);
CREATE INDEX idx_export_jobs_status ON export_jobs(status);
CREATE INDEX idx_export_jobs_executed_by ON export_jobs(executed_by);
CREATE INDEX idx_export_jobs_created_at ON export_jobs(created_at DESC);
CREATE INDEX idx_export_jobs_expires_at ON export_jobs(expires_at) WHERE status = 'completed';
```

### Supabase Storage 버킷

```sql
-- exports 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false);

-- RLS 정책: 본인이 생성한 export만 다운로드 가능
CREATE POLICY "Users can download their own exports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

## TypeScript 타입 정의

### src/types/export.ts

```typescript
export type ExportType = 'leads' | 'companies' | 'subscriptions' | 'users' | 'custom'
export type ExportFormat = 'csv' | 'xlsx' | 'pdf'
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ExportFilters {
  // Lead filters
  status?: string
  tags?: string[]
  assigned_to?: string
  date_from?: string
  date_to?: string

  // Company filters
  health_status?: string
  subscription_status?: string

  // Common filters
  search?: string
  company_id?: string
}

export interface ExportOptions {
  columns: string[]  // 컬럼 목록
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  include_header?: boolean  // CSV/Excel
  page_size?: 'A4' | 'Letter'  // PDF
  orientation?: 'portrait' | 'landscape'  // PDF
}

export interface ExportJob {
  id: string
  export_type: ExportType
  format: ExportFormat
  filters: ExportFilters
  columns: string[]
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  status: ExportStatus
  total_rows?: number
  processed_rows: number
  file_path?: string
  file_size?: number
  download_url?: string
  expires_at?: string
  error_message?: string
  executed_by: string
  started_at: string
  completed_at?: string
  created_at: string
}

export interface CreateExportRequest {
  export_type: ExportType
  format: ExportFormat
  filters: ExportFilters
  options: ExportOptions
}

export interface ExportJobResponse {
  success: boolean
  job_id: string
  message?: string
}

export interface ExportListResponse {
  exports: ExportJob[]
  total: number
}

// 내보내기 가능한 컬럼 정의
export const LEAD_EXPORT_COLUMNS = [
  { key: 'id', label: 'ID', required: false },
  { key: 'name', label: '이름', required: true },
  { key: 'email', label: '이메일', required: true },
  { key: 'phone', label: '전화번호', required: false },
  { key: 'company_name', label: '회사명', required: false },
  { key: 'status', label: '상태', required: false },
  { key: 'source', label: '소스', required: false },
  { key: 'tags', label: '태그', required: false },
  { key: 'assigned_to', label: '담당자', required: false },
  { key: 'created_at', label: '생성일', required: false },
] as const

export const COMPANY_EXPORT_COLUMNS = [
  { key: 'id', label: 'ID', required: false },
  { key: 'name', label: '회사명', required: true },
  { key: 'domain', label: '도메인', required: false },
  { key: 'industry', label: '산업', required: false },
  { key: 'size', label: '규모', required: false },
  { key: 'status', label: '상태', required: false },
  { key: 'health_score', label: '건강도', required: false },
  { key: 'mrr', label: 'MRR', required: false },
  { key: 'user_count', label: '사용자 수', required: false },
  { key: 'created_at', label: '생성일', required: false },
] as const

export const SUBSCRIPTION_EXPORT_COLUMNS = [
  { key: 'id', label: 'ID', required: false },
  { key: 'company_name', label: '회사명', required: true },
  { key: 'plan_name', label: '플랜', required: true },
  { key: 'status', label: '상태', required: false },
  { key: 'billing_cycle', label: '결제 주기', required: false },
  { key: 'amount', label: '금액', required: false },
  { key: 'start_date', label: '시작일', required: false },
  { key: 'end_date', label: '종료일', required: false },
  { key: 'next_billing_date', label: '다음 결제일', required: false },
] as const
```

## API 엔드포인트

### POST /api/admin/export

내보내기 작업 생성

```typescript
Request Body:
{
  export_type: 'leads' | 'companies' | 'subscriptions',
  format: 'csv' | 'xlsx' | 'pdf',
  filters: {
    status?: string,
    tags?: string[],
    date_from?: string,
    date_to?: string,
    // ... 필터 옵션
  },
  options: {
    columns: string[],
    sort_by?: string,
    sort_order?: 'asc' | 'desc',
    include_header?: boolean,
    page_size?: 'A4' | 'Letter',
    orientation?: 'portrait' | 'landscape'
  }
}

Response:
{
  success: true,
  job_id: "uuid",
  message: "내보내기 작업이 시작되었습니다"
}
```

### GET /api/admin/export

내보내기 작업 목록 조회

```typescript
Query Parameters:
- status: pending|processing|completed|failed
- export_type: leads|companies|subscriptions
- limit: number (default: 20)
- offset: number (default: 0)

Response:
{
  exports: ExportJob[],
  total: number
}
```

### GET /api/admin/export/[id]

특정 내보내기 작업 상태 조회

```typescript
Response:
{
  export: ExportJob
}
```

### GET /api/admin/export/[id]/download

파일 다운로드 (Supabase Storage signed URL 생성)

```typescript
Response:
{
  download_url: "https://..."
}
```

### DELETE /api/admin/export/[id]

내보내기 작업 및 파일 삭제

```typescript
Response:
{
  success: true,
  message: "내보내기가 삭제되었습니다"
}
```

## 내보내기 프로세서

### src/lib/export/exportProcessor.ts

```typescript
import { Parser } from 'json2csv'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import { createClient } from '@/lib/supabase/server'

export class ExportProcessor {
  constructor(private supabase: SupabaseClient) {}

  async processExport(jobId: string): Promise<void> {
    // 1. Job 정보 조회
    const job = await this.getJob(jobId)

    // 2. 상태를 'processing'으로 업데이트
    await this.updateJobStatus(jobId, 'processing')

    try {
      // 3. 데이터 조회
      const data = await this.fetchData(job)

      // 4. 형식에 따라 파일 생성
      let filePath: string
      switch (job.format) {
        case 'csv':
          filePath = await this.generateCSV(job, data)
          break
        case 'xlsx':
          filePath = await this.generateExcel(job, data)
          break
        case 'pdf':
          filePath = await this.generatePDF(job, data)
          break
      }

      // 5. Supabase Storage에 업로드
      const downloadUrl = await this.uploadToStorage(jobId, filePath)

      // 6. Job 완료 처리
      await this.completeJob(jobId, {
        file_path: filePath,
        download_url: downloadUrl,
        total_rows: data.length
      })

    } catch (error) {
      // 7. 에러 처리
      await this.failJob(jobId, error.message)
    }
  }

  private async generateCSV(job: ExportJob, data: any[]): Promise<string> {
    const parser = new Parser({
      fields: job.columns,
      header: true
    })

    const csv = parser.parse(data)
    const fileName = `${job.export_type}_${job.id}.csv`

    // 임시 파일로 저장
    await fs.writeFile(`/tmp/${fileName}`, csv)
    return `/tmp/${fileName}`
  }

  private async generateExcel(job: ExportJob, data: any[]): Promise<string> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Data')

    // 헤더 추가
    worksheet.columns = job.columns.map(col => ({
      header: this.getColumnLabel(col),
      key: col,
      width: 20
    }))

    // 데이터 추가
    worksheet.addRows(data)

    // 스타일 적용
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    const fileName = `${job.export_type}_${job.id}.xlsx`
    await workbook.xlsx.writeFile(`/tmp/${fileName}`)
    return `/tmp/${fileName}`
  }

  private async generatePDF(job: ExportJob, data: any[]): Promise<string> {
    const doc = new PDFDocument({
      size: job.options?.page_size || 'A4',
      layout: job.options?.orientation || 'landscape'
    })

    const fileName = `${job.export_type}_${job.id}.pdf`
    const stream = fs.createWriteStream(`/tmp/${fileName}`)
    doc.pipe(stream)

    // 제목
    doc.fontSize(16).text(`${job.export_type.toUpperCase()} Export`, {
      align: 'center'
    })
    doc.moveDown()

    // 테이블 생성 (간단한 구현)
    // 실제로는 pdfkit-table 같은 라이브러리 사용 권장
    const tableData = data.map(row =>
      job.columns.map(col => row[col]?.toString() || '')
    )

    // 헤더
    doc.fontSize(10)
    job.columns.forEach((col, i) => {
      doc.text(this.getColumnLabel(col), 50 + i * 100, doc.y)
    })

    doc.moveDown()

    // 데이터 행
    tableData.forEach(row => {
      row.forEach((cell, i) => {
        doc.text(cell, 50 + i * 100, doc.y)
      })
      doc.moveDown(0.5)
    })

    doc.end()

    return new Promise((resolve) => {
      stream.on('finish', () => resolve(`/tmp/${fileName}`))
    })
  }

  private async uploadToStorage(jobId: string, filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath)
    const fileName = path.basename(filePath)

    const { data, error } = await this.supabase.storage
      .from('exports')
      .upload(`${jobId}/${fileName}`, fileBuffer, {
        contentType: this.getContentType(filePath),
        upsert: false
      })

    if (error) throw error

    // Signed URL 생성 (7일간 유효)
    const { data: urlData } = await this.supabase.storage
      .from('exports')
      .createSignedUrl(data.path, 604800)  // 7 days

    return urlData.signedUrl
  }
}
```

## UI 컴포넌트

### 1. 내보내기 버튼 (각 목록 페이지에 추가)

```typescript
// src/app/admin/leads/page.tsx에 추가
<button
  onClick={() => setShowExportModal(true)}
  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
>
  <Download className="w-4 h-4" />
  내보내기
</button>
```

### 2. 내보내기 모달

```typescript
// src/components/export/ExportModal.tsx
interface ExportModalProps {
  exportType: ExportType
  filters: ExportFilters
  onClose: () => void
}

function ExportModal({ exportType, filters, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('xlsx')
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])

  async function handleExport() {
    const response = await fetch('/api/admin/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        export_type: exportType,
        format,
        filters,
        options: {
          columns: selectedColumns,
          include_header: true
        }
      })
    })

    const result = await response.json()

    if (result.success) {
      alert('내보내기가 시작되었습니다. 완료되면 다운로드할 수 있습니다.')
      onClose()
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>데이터 내보내기</h2>

      {/* 형식 선택 */}
      <div>
        <label>형식</label>
        <select value={format} onChange={e => setFormat(e.target.value as ExportFormat)}>
          <option value="csv">CSV</option>
          <option value="xlsx">Excel (xlsx)</option>
          <option value="pdf">PDF</option>
        </select>
      </div>

      {/* 컬럼 선택 */}
      <div>
        <label>포함할 컬럼</label>
        {getAvailableColumns(exportType).map(col => (
          <label key={col.key}>
            <input
              type="checkbox"
              checked={selectedColumns.includes(col.key)}
              onChange={e => {
                if (e.target.checked) {
                  setSelectedColumns([...selectedColumns, col.key])
                } else {
                  setSelectedColumns(selectedColumns.filter(c => c !== col.key))
                }
              }}
            />
            {col.label}
          </label>
        ))}
      </div>

      <button onClick={handleExport}>내보내기 시작</button>
    </Modal>
  )
}
```

### 3. 내보내기 이력 페이지

```typescript
// src/app/admin/exports/page.tsx
export default function ExportsPage() {
  const [exports, setExports] = useState<ExportJob[]>([])

  useEffect(() => {
    fetchExports()
  }, [])

  async function handleDownload(jobId: string) {
    const response = await fetch(`/api/admin/export/${jobId}/download`)
    const { download_url } = await response.json()
    window.open(download_url, '_blank')
  }

  return (
    <div>
      <h1>내보내기 이력</h1>

      <table>
        <thead>
          <tr>
            <th>유형</th>
            <th>형식</th>
            <th>상태</th>
            <th>생성일</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {exports.map(job => (
            <tr key={job.id}>
              <td>{job.export_type}</td>
              <td>{job.format.toUpperCase()}</td>
              <td>{getStatusBadge(job.status)}</td>
              <td>{new Date(job.created_at).toLocaleString()}</td>
              <td>
                {job.status === 'completed' && (
                  <button onClick={() => handleDownload(job.id)}>
                    다운로드
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

## 백그라운드 작업 처리

### Vercel Cron 또는 Queue 사용

```typescript
// src/app/api/cron/process-exports/route.ts
export async function GET(request: NextRequest) {
  // Vercel Cron 인증 확인
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = await createClient()

  // pending 상태의 export jobs 조회
  const { data: jobs } = await supabase
    .from('export_jobs')
    .select('*')
    .eq('status', 'pending')
    .limit(5)

  // 병렬로 처리
  const processor = new ExportProcessor(supabase)
  await Promise.all(
    jobs.map(job => processor.processExport(job.id))
  )

  return Response.json({ processed: jobs.length })
}
```

### vercel.json 설정

```json
{
  "crons": [{
    "path": "/api/cron/process-exports",
    "schedule": "* * * * *"  // 매분 실행
  }]
}
```

## 보안 및 성능 고려사항

### 1. 파일 크기 제한
- 최대 행 수: 100,000
- 최대 파일 크기: 50MB
- 초과 시 에러 메시지

### 2. 만료 시간
- 생성된 파일은 7일 후 자동 삭제
- Supabase Storage lifecycle policy 설정

### 3. 권한 체크
- RBAC에 `EXPORT_DATA` 권한 추가
- API에서 권한 검증

### 4. 성능 최적화
- 대용량 데이터는 스트리밍 방식으로 처리
- 청크 단위로 데이터 조회 및 쓰기
- 메모리 사용량 모니터링

## 구현 우선순위

1. **Phase 4.3.1**: 데이터베이스 스키마 및 Storage 설정
2. **Phase 4.3.2**: CSV 내보내기 구현
3. **Phase 4.3.3**: Excel 내보내기 구현
4. **Phase 4.3.4**: UI 컴포넌트 (모달, 이력 페이지)
5. **Phase 4.3.5**: PDF 내보내기 구현 (선택적)
6. **Phase 4.3.6**: 백그라운드 작업 처리

## 필요한 npm 패키지

```bash
npm install json2csv exceljs pdfkit
npm install --save-dev @types/json2csv @types/pdfkit
```

## 테스트 시나리오

1. **소량 데이터 (< 100 rows)**: 즉시 처리, 다운로드
2. **중량 데이터 (100-10,000 rows)**: 백그라운드 처리, 완료 알림
3. **대량 데이터 (> 10,000 rows)**: 청크 단위 처리, 진행률 표시
4. **필터 적용**: 필터링된 데이터만 내보내기
5. **컬럼 선택**: 선택한 컬럼만 포함
6. **에러 처리**: 실패 시 재시도 또는 에러 메시지
