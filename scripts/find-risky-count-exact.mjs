// count:'exact'가 UPDATE/INSERT/DELETE 체인 뒤에서 null을 반환하는(이 프로젝트
// 환경에서 확인된) 문제(QA 반복패턴 #6, 메모리: project_supabase-count-exact-broken-on-mutations)의
// 재발을 감지하는 재사용 가능한 스윕 스크립트. 84~86차의 수동 전수조사 절차를 스크립트화.
// 사용법: node scripts/find-risky-count-exact.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC_DIR = path.join(ROOT, 'src')

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue
      walk(full, out)
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

const files = walk(SRC_DIR)
const safe = []
const risky = []

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const lines = text.split('\n')
  lines.forEach((line, idx) => {
    if (!line.includes("count: 'exact'") && !line.includes('count: "exact"')) return

    // 같은 supabase 체인(가장 가까운 앞쪽 .from(...) 호출부터 이 줄까지) 안에
    // .update(/.insert(/.delete( 이 있는지 확인 - 대략 앞쪽 15줄까지만 살펴본다
    // (체인이 그보다 길면 별도로 수동 확인 필요)
    const windowStart = Math.max(0, idx - 15)
    const chainText = lines.slice(windowStart, idx + 1).join('\n')
    // 가장 최근 .from( 이후로 범위를 좁힌다
    const lastFromIdx = chainText.lastIndexOf('.from(')
    const relevant = lastFromIdx >= 0 ? chainText.slice(lastFromIdx) : chainText

    const hasMutation = /\.update\(|\.insert\(|\.delete\(|\.upsert\(/.test(relevant)

    const entry = { file: path.relative(ROOT, file), line: idx + 1, code: line.trim() }
    if (hasMutation) {
      risky.push(entry)
    } else {
      safe.push(entry)
    }
  })
}

console.log(`전체 count:'exact' 발견: ${safe.length + risky.length}건`)
console.log(`SELECT 단독으로 보임(안전 추정): ${safe.length}건`)
console.log(`UPDATE/INSERT/DELETE/UPSERT 체인 근처(위험 - 수동 확인 필요): ${risky.length}건\n`)
if (risky.length > 0) {
  console.log('--- 위험군 상세 ---')
  for (const r of risky) {
    console.log(`${r.file}:${r.line}  ${r.code}`)
  }
}
