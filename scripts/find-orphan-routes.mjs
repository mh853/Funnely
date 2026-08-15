// src/app 아래 route.ts 파일들을 스캔해, 앱 어디에서도 호출되지 않는 것으로
// 보이는 API 라우트(고아 라우트, QA 반복패턴 #4)를 찾는 일회성 감지 스크립트.
// 사용법: node scripts/find-orphan-routes.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const APP_DIR = path.join(ROOT, 'src/app')

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue
      walk(full, out)
    } else if (/^route\.tsx?$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

function routeFileToUrlPath(file) {
  let p = path.relative(APP_DIR, path.dirname(file))
  // 라우트 그룹 (folder) 제거
  p = p
    .split(path.sep)
    .filter((seg) => !(seg.startsWith('(') && seg.endsWith(')')))
    .join('/')
  return '/' + p
}

// src 전체 텍스트를 한 번만 읽어 재사용(파일 수가 많아 매번 grep하면 느림)
function loadAllSourceText() {
  const files = []
  function collect(dir) {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry)
      const st = statSync(full)
      if (st.isDirectory()) {
        if (entry === 'node_modules' || entry === '.next') continue
        collect(full)
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
        files.push(full)
      }
    }
  }
  collect(path.join(ROOT, 'src'))
  return files.map((f) => ({ file: f, text: readFileSync(f, 'utf8') }))
}

const routeFiles = walk(APP_DIR)
const sources = loadAllSourceText()
const vercelJson = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'))
const cronPaths = new Set((vercelJson.crons || []).map((c) => c.path))

const results = []

for (const routeFile of routeFiles) {
  const urlPath = routeFileToUrlPath(routeFile)
  // 동적 세그먼트의 고정 prefix만 사용 (예: /api/leads/[id] → /api/leads/)
  const staticPrefix = urlPath.replace(/\[[^\]]+\].*$/, '')

  let refCount = 0
  const refFiles = new Set()
  for (const { file, text } of sources) {
    if (file === routeFile) continue
    // fetch('/api/...'), axios.get('/api/...') 등 문자열 리터럴 내 등장을 탐지
    if (text.includes(staticPrefix)) {
      refCount++
      refFiles.add(path.relative(ROOT, file))
    }
  }

  const isCron = cronPaths.has(urlPath)

  if (refCount === 0 && !isCron) {
    results.push({
      route: urlPath,
      file: path.relative(ROOT, routeFile),
      reason: '참조 0건',
    })
  }
}

console.log(`총 라우트 파일: ${routeFiles.length}개`)
console.log(`참조 0건(고아 후보): ${results.length}개\n`)
for (const r of results) {
  console.log(`- ${r.route}  (${r.file})`)
}
