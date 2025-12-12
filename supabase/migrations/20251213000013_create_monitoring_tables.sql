-- 기존 테이블이 있다면 삭제
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS performance_metrics CASCADE;
DROP TABLE IF EXISTS api_usage_logs CASCADE;
DROP TABLE IF EXISTS error_logs CASCADE;
DROP TABLE IF EXISTS system_health_logs CASCADE;

-- 시스템 헬스 로그 테이블
CREATE TABLE system_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(100) NOT NULL, -- api, database, auth, storage, etc.
  status VARCHAR(50) NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time_ms INTEGER,
  cpu_usage DECIMAL(5, 2),
  memory_usage DECIMAL(5, 2),
  error_rate DECIMAL(5, 2),
  metadata JSONB,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 에러 로그 테이블
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('critical', 'error', 'warning', 'info')),
  source VARCHAR(100) NOT NULL, -- api, frontend, background_job, etc.
  error_type VARCHAR(100), -- database_error, auth_error, validation_error, etc.
  message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  request_url TEXT,
  request_method VARCHAR(10),
  user_agent TEXT,
  ip_address INET,
  metadata JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API 사용량 로그 테이블
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 성능 메트릭 테이블
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL, -- page_load_time, api_response_time, db_query_time, etc.
  value DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(20), -- ms, seconds, bytes, etc.
  tags JSONB, -- {environment: 'production', page: 'dashboard'}
  measured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 감사 로그 테이블 (관리자 행동 추적)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- create, update, delete, login, etc.
  resource_type VARCHAR(100), -- company, user, subscription, etc.
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_system_health_logs_service ON system_health_logs(service_name);
CREATE INDEX idx_system_health_logs_status ON system_health_logs(status);
CREATE INDEX idx_system_health_logs_checked_at ON system_health_logs(checked_at);

CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_source ON error_logs(source);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX idx_error_logs_company ON error_logs(company_id);

CREATE INDEX idx_api_usage_logs_company ON api_usage_logs(company_id);
CREATE INDEX idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX idx_api_usage_logs_created_at ON api_usage_logs(created_at);

CREATE INDEX idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX idx_performance_metrics_measured_at ON performance_metrics(measured_at);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- RLS 정책 설정
ALTER TABLE system_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Company Owner/Admin은 모든 접근 가능
CREATE POLICY system_health_logs_admin ON system_health_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
    )
  );

CREATE POLICY error_logs_admin ON error_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
    )
  );

CREATE POLICY api_usage_logs_admin ON api_usage_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
    )
  );

CREATE POLICY performance_metrics_admin ON performance_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
    )
  );

CREATE POLICY audit_logs_admin ON audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
    )
  );

-- 변경 완료 로그
DO $$
BEGIN
  RAISE NOTICE 'Monitoring and logging tables created successfully';
END $$;
