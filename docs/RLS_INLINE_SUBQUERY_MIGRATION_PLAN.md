# RLS 인라인 서브쿼리 → 헬퍼 함수 이관 계획 (착수 보류, 상세 핸드오프)

작성일 2026-08-15. `docs/RLS_ADMIN_HELPERS.md`에서 발견한 "라이브 정책 150개 중 110개
(53개 테이블)가 `company_id`/역할 확인을 헬퍼 함수 없이 `FROM users ...` 인라인
서브쿼리로 매번 다시 짠다"는 문제의 착수 계획이다. **사용자가 이 세션에서 실행은
보류하고 상세 정리만 요청**했다 - 다음에 이어받는 사람(사람이든 에이전트든)이
누락 없이 시작할 수 있도록, 대상 전체 목록과 절차를 여기 남긴다.

## 왜 필요한가 (배경)

`docs/RLS_ADMIN_HELPERS.md`에 상세히 있다. 요약: 이 인라인 반복 때문에 "모든
회사소속 확인에 is_active 체크를 추가하라"같은 전역 요구사항 하나를 반영하려고
43KB+58KB짜리 마이그레이션 2개가 필요했다. 헬퍼 함수로 옮겨두면 다음 번 같은 요구는
함수 하나만 고치면 끝난다.

## 대상 전체 목록 (53개 테이블, 110개 정책) - 2026-08-15 `pg_dump -s public` 기준

**주의**: 아래 목록은 "헬퍼 함수 5개(`get_my_company_id`/`am_i_admin_or_legacy_owner`/
`am_i_super_admin`/`am_i_active_in_active_company`/`is_super_admin_via_role_assignment`)
중 어느 것도 안 쓰고 `FROM users`를 직접 서브쿼리로 여는 정책"을 정책 **이름**으로
찾은 것이다. 실제 USING/WITH CHECK 절 SQL은 정책별로 검증하지 않았다 - 착수 시
`supabase db dump --linked -s public -f <파일>`로 새로 떠서 각 정책의 실제 조건을
반드시 다시 읽을 것 (마지막 조사 이후 스키마가 바뀌었을 수 있다).

| 테이블 | 정책명 |
|---|---|
| ad_accounts | Managers can manage ad accounts |
| ad_accounts | Users can view ad accounts in their company |
| api_credentials | Company owners and admins can insert credentials |
| api_credentials | Company owners and admins can update credentials |
| api_credentials | Company owners can delete credentials |
| api_credentials | Users can view own company credentials |
| api_usage_logs | api_usage_logs_admin |
| audit_logs | audit_logs_admin |
| bulk_operation_logs | bulk_operation_logs_select_own_company |
| bulk_operation_logs | bulk_operation_logs_super_admin_all |
| calendar_events | Users can manage their events |
| calendar_events | Users can view their assigned events |
| campaign_metrics | Users can view metrics in their company |
| campaigns | Staff can manage campaigns |
| campaigns | Users can view campaigns in their company |
| companies | Company admins can update their company |
| companies | Super admins can view all companies |
| companies | Users can view their own company |
| company_activity_logs | Super admins can view all activity logs |
| company_activity_logs | System can insert activity logs |
| company_custom_domains | company_members_manage_custom_domains |
| company_subscriptions | company_subscriptions_admin |
| company_subscriptions | company_subscriptions_select_members |
| email_logs | email_logs_super_admin_select |
| error_logs | error_logs_admin |
| external_collection_pages | Marketing staff can manage external collection pages |
| external_collection_pages | Users can view external collection pages in their company |
| form_templates | Managers can manage form templates |
| form_templates | Marketing staff can manage form templates |
| form_templates | Users can view form templates in their company |
| generated_reports | generated_reports_admin |
| invoices | invoices_admin |
| landing_page_analytics | Marketing staff can view analytics |
| landing_pages | Staff can delete landing pages |
| landing_pages | Staff can insert landing pages |
| landing_pages | Staff can update landing pages |
| landing_pages | Staff can view landing pages |
| landing_pages | Super admins can view all landing pages |
| landing_pages | Users can view landing pages in their company |
| lead_notes | Users can create notes for their leads |
| lead_notes | Users can delete notes for leads in their company |
| lead_notes | Users can view notes for leads in their hospital |
| lead_notification_logs | Super admins can view notification logs |
| lead_notification_queue | Super admins can view all notification queue |
| lead_payments | Users can delete own company payments |
| lead_payments | Users can insert own company payments |
| lead_payments | Users can update own company payments |
| lead_payments | Users can view own company payments |
| lead_status_logs | Users can insert their company's lead status logs |
| lead_status_logs | Users can view their company's lead status logs |
| lead_statuses | Admins can delete statuses |
| lead_statuses | Admins can insert statuses |
| lead_statuses | Admins can update statuses |
| lead_statuses | Users can view own company statuses |
| leads | Admins can delete leads in their company |
| leads | Staff can manage leads |
| leads | Super admins can view all leads |
| leads | Users can create leads for their company |
| leads | Users can update leads in their company |
| leads | Users can view leads in their company |
| notification_reads | Users can delete their own read receipts |
| notification_reads | Users can insert their own read receipts |
| notification_reads | Users can view their own read receipts |
| notification_sent_logs | notification_sent_logs_select_own_company |
| notification_sent_logs | notification_sent_logs_super_admin_all |
| notifications | Super admins can view all notifications |
| notifications | Users can insert their own company notifications |
| notifications | Users can update their company notifications |
| notifications | Users can view their company notifications |
| payment_audit_logs | Admins can view own company audit logs |
| payment_audit_logs | Users can insert own company audit logs |
| payment_notifications | Users can view their company payment notifications |
| payment_transactions | Users can view their company payment transactions |
| payments | payments_admin |
| performance_goals | performance_goals_admin |
| performance_metrics | performance_metrics_admin |
| phone_blacklist | Company members can delete their blacklist |
| phone_blacklist | Company members can insert blacklist |
| phone_blacklist | Company members can view their blacklist |
| privacy_policies | Admins can insert their company's privacy policies |
| privacy_policies | Admins can update their company's privacy policies |
| privacy_policies | Users can view their company's privacy policies |
| report_templates | report_templates_admin |
| reservation_date_logs | Users can insert their company's reservation date logs |
| reservation_date_logs | Users can view their company's reservation date logs |
| saved_reports | Users can manage their own reports |
| saved_reports | Users can view reports in their company |
| sheet_sync_configs | Admins can manage sheet sync configs |
| sheet_sync_configs | Users can view their company's sheet sync configs |
| sheet_sync_logs | Users can view their company's sheet sync logs |
| subscription_plans | subscription_plans_admin |
| support_ticket_messages | Authenticated users can create ticket messages |
| support_ticket_messages | Super admins can view all ticket messages |
| support_ticket_replies | Super admins can create replies |
| support_ticket_replies | Super admins can delete replies |
| support_ticket_replies | Super admins can update their replies |
| support_ticket_replies | Users can view replies for their company tickets |
| support_ticket_status_history | Super admins can view all status history |
| support_ticket_status_history | System can insert status history |
| support_tickets | Super admins can manage all support tickets |
| support_tickets | Users can create tickets for their company |
| support_tickets | Users can update their company tickets |
| support_tickets | Users can view their company tickets |
| system_health_logs | system_health_logs_admin |
| tracking_pixels | Admins can insert their company tracking pixels |
| tracking_pixels | Admins can update their company tracking pixels |
| tracking_pixels | Users can view their company tracking pixels |
| usage_logs | usage_logs_admin |
| workflow_action_logs | workflow_action_logs_super_admin_all |
| workflow_executions | workflow_executions_super_admin_all |

## 이름 기반 러프 분류 (검증 전, 작업량 가늠용)

정책 이름으로만 추정한 것이다. 착수 시 반드시 실제 SQL로 재확인할 것.

- **super admin 전용으로 보이는 것 (~18개)**: `am_i_super_admin()`으로 대체 가능성
  높음. 가장 기계적이고 안전한 그룹 - 파일럿 후보.
- **회사관리자(non-super admin)로 보이는 것 (~26개)**: `am_i_admin_or_legacy_owner()`
  대체 후보. 단 "Admins can delete leads", "Admins can manage sheet sync configs"처럼
  구체적 동작마다 원래 어떤 역할까지 허용했는지 실제 SQL로 반드시 재확인 - 회사 admin
  범위가 항상 `am_i_admin_or_legacy_owner()`와 정확히 같다고 가정하지 말 것.
- **Manager/Staff/Owner류로 보이는 것 (~13개, `ad_accounts`/`campaigns`/
  `external_collection_pages`/`form_templates`/`landing_pages`/`leads`)**: **가장
  주의 필요.** 이 세션에서 앱(TS) 쪽을 정리하며 발견한 것과 같은 종류일 가능성이 높다 -
  즉 회사 admin과는 다른, marketing_manager/marketing_staff까지 포함하는 별도의 넓은
  권한셋(`src/app/api/campaigns/route.ts` 등 8개 파일이 이 앱 쪽 대응 사례다). 기존
  5개 헬퍼 중 어느 것도 이 범위와 정확히 일치하지 않을 수 있다 - **새 헬퍼 함수 설계가
  필요할 수 있음**(예: `am_i_marketing_staff_or_above()`). 이 그룹은 기계적 치환이
  아니라 먼저 "지금 정확히 어떤 role들이 허용되는지" SQL을 읽고, 앱 쪽 동등 로직과
  비교해서 정책을 세운 뒤 착수할 것.
- **순수 "Users can..." (역할 구분 없이 회사소속만, ~44개)**: `company_id =
  get_my_company_id()`(+ 필요시 `am_i_active_in_active_company()`)로 대체 후보. 가장
  많고, 역할 판단이 없어 상대적으로 안전하지만 그만큼 수작업량이 크다.
- 나머지(~9개, "System can insert...", "Authenticated users can..." 등)는 위 네
  범주에 깔끔히 안 들어간다 - 개별 확인 필요.

## 절차 (86차 전례 재사용, 반드시 준수)

1. **드라이런**: 대상 정책 하나(또는 파일럿 테이블 전체)를 골라 `ALTER POLICY`
   문을 작성만 하고 실행 전에 사용자에게 보여준다. `DROP POLICY` + `CREATE POLICY`
   대신 `ALTER POLICY ... USING (...)`를 우선 사용할 것 - DROP+CREATE 사이에는 그
   정책이 없는 짧은 순간(차단 공백 또는 반대로 무정책 상태)이 생긴다.
2. **검증은 반드시 `authenticated` 역할의 실제 JWT로.** 서비스롤 클라이언트
   (`createServiceClient()`)는 RLS를 완전히 우회하므로 그걸로 테스트하면 정책이
   깨져 있어도 항상 "통과"로 나온다 - 이 세션에서 이미 한번 강조한 함정이다. 실제
   로그인 세션(브라우저 또는 `SET ROLE authenticated` + `request.jwt.claims` 시뮬레이션)
   으로 확인할 것.
3. **적용 후 `pg_policies`를 재조회**해 정책 정의가 의도한 대로 바뀌었는지 확인한다.
4. **사용자 승인 후 적용.** 하나씩, 전체를 한 번에 밀어넣지 않는다.
5. **파일럿 먼저**: 위 "super admin 전용" 그룹 중 정책이 1개뿐인 작은 테이블
   (`subscription_plans`, `payments`, `invoices` 등 `_admin` 접미사 정책들)로
   시작해 절차 자체를 검증한 뒤 나머지로 확장하는 것을 권장.

## 치환 SQL 템플릿 (예시, 실제 조건은 정책별로 다름)

```sql
-- 치환 전 (인라인, 예시)
CREATE POLICY "example" ON "public"."some_table"
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- 치환 후
ALTER POLICY "example" ON "public"."some_table"
  USING (company_id = get_my_company_id());
```

super-admin 전용 정책은 `EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND
is_super_admin = true)` 형태를 `am_i_super_admin()`으로, 회사관리자 전용은
`am_i_admin_or_legacy_owner()`로 치환하는 식으로 동일하게 적용한다.

## 이 문서를 시작점으로 쓸 때 체크리스트

- [ ] `supabase db dump --linked -s public -f <파일>`로 최신 스키마를 다시 뜬다 -
      이 문서의 목록은 스냅샷이라 시간이 지나면 드리프트될 수 있다.
- [ ] 위 53개 테이블/110개 정책이 여전히 인라인 상태인지 재확인(그새 다른 QA
      라운드가 일부를 이미 고쳤을 수 있다 - 이 세션에서도 원래 진단이 두 번 틀렸었다).
- [ ] Manager/Staff류 13개는 새 헬퍼 함수 설계가 필요할 수 있음을 염두에 두고
      앱 쪽 동등 로직(`docs/RLS_ADMIN_HELPERS.md`의 8개 파일 목록)과 비교한다.
- [ ] 파일럿 테이블 1개로 절차를 먼저 검증한다.
- [ ] `ALTER POLICY` 사용, 서비스롤이 아닌 authenticated JWT로 검증, 매 적용 후
      `pg_policies` 재조회, 사용자 승인 후 다음 테이블로 - 이 네 가지는 생략하지 않는다.
