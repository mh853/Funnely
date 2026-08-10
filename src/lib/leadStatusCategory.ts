// 리드 상태 코드를 통계 집계용 의미 범주(category)로 매핑하는 공용 헬퍼.
// 회사가 만든 커스텀 상태도 lead_statuses.category를 통해 7개 범주 중 하나로
// 정확히 집계되도록, 이 매핑을 대시보드/리포트/분석/예약 화면이 공통으로 쓴다.

export type LeadStatusCategory =
  | 'new'
  | 'rejected'
  | 'contacted'
  | 'converted'
  | 'contract_completed'
  | 'needs_followup'
  | 'other'

export const LEAD_STATUS_CATEGORY_OPTIONS: { value: LeadStatusCategory; label: string }[] = [
  { value: 'new', label: '신규 (상담 전)' },
  { value: 'contacted', label: '진행중 (상담 진행중)' },
  { value: 'rejected', label: '거절' },
  { value: 'converted', label: '완료 (상담 완료)' },
  { value: 'contract_completed', label: '계약 확정' },
  { value: 'needs_followup', label: '후속조치 필요' },
  { value: 'other', label: '기타' },
]

const VALID_CATEGORIES = new Set(LEAD_STATUS_CATEGORY_OPTIONS.map((o) => o.value))

export function isValidLeadStatusCategory(value: unknown): value is LeadStatusCategory {
  return typeof value === 'string' && VALID_CATEGORIES.has(value as LeadStatusCategory)
}

// dashboard/reports 통계 객체가 이미 쓰고 있는 필드명(레거시 영문 버킷 이름)에 맞춘 매핑
export const CATEGORY_TO_BUCKET_KEY: Record<
  LeadStatusCategory,
  'pending' | 'rejected' | 'inProgress' | 'completed' | 'contractCompleted' | 'needsFollowUp' | 'other'
> = {
  new: 'pending',
  rejected: 'rejected',
  contacted: 'inProgress',
  converted: 'completed',
  contract_completed: 'contractCompleted',
  needs_followup: 'needsFollowUp',
  other: 'other',
}

/** company_id로 lead_statuses를 조회해 code → category 맵을 만든다 */
export async function getLeadStatusCategoryMap(
  supabase: any,
  companyId: string
): Promise<Record<string, LeadStatusCategory>> {
  const { data } = await supabase
    .from('lead_statuses')
    .select('code, category')
    .eq('company_id', companyId)

  const map: Record<string, LeadStatusCategory> = {}
  ;(data || []).forEach((s: { code: string; category: string | null }) => {
    map[s.code] = isValidLeadStatusCategory(s.category) ? s.category : 'other'
  })
  return map
}

/**
 * 리드의 status 코드로 통계 버킷 키를 구한다. 'pending'은 실제 lead_statuses에는
 * 없는 레거시 코드 값이지만 과거 코드가 전부 'new'와 동일하게 취급해왔으므로
 * 하위 호환을 위해 그대로 유지한다.
 *
 * 단, 이 레거시 폴백이 무조건 우선했었다 - 회사가 lead-statuses 설정화면에서
 * 코드값을 정확히 'pending'으로 새 상태를 만들고 category를 다른 값(예: 계약확정)
 * 으로 지정해도, categoryMap 조회 결과와 무관하게 항상 '신규'로 집계됐다(85차 QA).
 * categoryMap에 'pending'이 실제로 등록돼 있지 않을 때(진짜 레거시 고아 데이터)만
 * 폴백을 적용한다.
 */
export function getBucketKeyForStatus(
  categoryMap: Record<string, LeadStatusCategory>,
  status: string | null | undefined
): (typeof CATEGORY_TO_BUCKET_KEY)[LeadStatusCategory] {
  if (status === 'pending' && !categoryMap['pending']) return CATEGORY_TO_BUCKET_KEY.new
  const category = (status && categoryMap[status]) || 'other'
  return CATEGORY_TO_BUCKET_KEY[category]
}

/**
 * 여러 회사의 리드를 한 번에 다루는 어드민 화면용 - company_id도 코드에 함께
 * 묶여야 한다(두 회사가 우연히 같은 코드를 쓰면서 의미가 다를 수 있음).
 * 반환 키는 `${company_id}:${code}` 형태.
 */
export async function getLeadStatusCategoryMapForAdmin(
  supabase: any,
  companyId?: string | null
): Promise<Map<string, LeadStatusCategory>> {
  let query = supabase.from('lead_statuses').select('company_id, code, category')
  if (companyId) query = query.eq('company_id', companyId)
  const { data } = await query

  const map = new Map<string, LeadStatusCategory>()
  ;(data || []).forEach((s: { company_id: string; code: string; category: string | null }) => {
    map.set(`${s.company_id}:${s.code}`, isValidLeadStatusCategory(s.category) ? s.category : 'other')
  })
  return map
}

/** 특정 category에 해당하는 모든 코드 목록(레거시 'pending' 포함 여부는 호출부에서 처리) */
export function getCodesForCategory(
  categoryMap: Record<string, LeadStatusCategory>,
  category: LeadStatusCategory
): string[] {
  return Object.entries(categoryMap)
    .filter(([, cat]) => cat === category)
    .map(([code]) => code)
}
