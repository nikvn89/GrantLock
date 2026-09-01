import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const contract = readFileSync(new URL('../contracts/ExclusivityLock.py', import.meta.url), 'utf8')
const client = readFileSync(new URL('../src/genlayer.js', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8')
const keccak = readFileSync(new URL('../src/keccak.js', import.meta.url), 'utf8')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const expectedAddress = '0x7cDcdE83B2a5192ACC00412cf192684c951081cc'
const expectedSha = 'c82e52db2b1c3e0192db8212f08cc42ad749388e2cc1b8fa1da7733b0d04e3d3'
const actualSha = createHash('sha256').update(contract).digest('hex')
const failures = []

for (const method of ['create_resource','submit_grant','release_exclusivity','get_resource','get_grant','get_grants','get_rubric','get_limits']) {
  if (!contract.includes(`def ${method}(`)) failures.push(`contract method missing: ${method}`)
}
for (const method of ['create_resource','submit_grant','release_exclusivity','get_resource','get_grant','get_grants','get_limits']) {
  if (!client.includes(`'${method}'`)) failures.push(`frontend method coverage missing: ${method}`)
}
if (actualSha !== expectedSha) failures.push(`contract SHA mismatch: ${actualSha}`)
if (!client.includes(expectedAddress)) failures.push('fresh StudioNet contract address missing')
if (!client.includes('genlayer-js@1.1.8')) failures.push('GenLayerJS is not version-pinned')
if (!client.includes("import { keccak256 } from './keccak.js'")) failures.push('local Keccak helper import missing')
if (!client.includes('TransactionStatus.FINALIZED')) failures.push('frontend does not wait for FINALIZED')
if (!client.includes('FINISHED_WITH_RETURN') || !client.includes('FINISHED_WITH_ERROR')) failures.push('execution-result split missing')
if (!client.includes('debugTraceTransaction')) failures.push('revert diagnostic fallback missing')
if (!client.includes('EXCLUSIVITY_LOCK:RESOURCE:V1|') || !client.includes('EXCLUSIVITY_LOCK:GRANT:V1|')) failures.push('deterministic ID derivation missing')
if (!app.includes('accountsChanged') || !app.includes('chainChanged')) failures.push('wallet switching listeners missing')
if (!app.includes('if (state.busy) return')) failures.push('double-send guard missing')
if (!app.includes('inspectResource') || !app.includes('readGrant')) failures.push('post-transaction state re-read missing')
if (!html.includes('No wallet is hardcoded') || !html.includes('Resource is locked by an exclusive grant')) failures.push('reviewer/negative path guidance missing')
if (!html.includes('EXCLUSIVE_GRANT') || !html.includes('NON_EXCLUSIVE_GRANT')) failures.push('semantic enum not visible')
const combined = `${app}\n${client}`
const addresses = [...combined.matchAll(/0x[0-9a-fA-F]{40}/g)].map((m)=>m[0].toLowerCase())
const unexpected = [...new Set(addresses)].filter((a)=>a !== expectedAddress.toLowerCase())
if (unexpected.length) failures.push(`hardcoded non-contract wallet/address detected: ${unexpected.join(', ')}`)
if (/grant_count\s*\+\+|locked\s*=\s*true/i.test(app)) failures.push('possible fabricated contract state mutation detected in frontend')

// --- module-source integrity -------------------------------------------------
// GenLayerJS remains a pinned browser dependency. Deterministic ID hashing is
// local so startup does not depend on a CommonJS-to-ESM transform for js-sha3.
// Pin the exact import lines and allow only the GenLayer SDK CDN host.
const ALLOWED_IMPORTS = [
  "import { abi, createClient } from 'https://esm.sh/genlayer-js@1.1.8'",
  "import { studionet } from 'https://esm.sh/genlayer-js@1.1.8/chains'",
  "import { ExecutionResult, TransactionStatus } from 'https://esm.sh/genlayer-js@1.1.8/types'",
  "import { keccak256 } from './keccak.js'",
  "import { pyLen, pyStrip } from './ids.js'",
]
const ALLOWED_HOSTS = ['https://esm.sh/']
for (const line of ALLOWED_IMPORTS) {
  if (!client.includes(line)) failures.push(`required import line missing or altered: ${line}`)
}
for (const source of [client, app, keccak, readFileSync(new URL('../src/ids.js', import.meta.url), 'utf8')]) {
  for (const match of source.matchAll(/from\s+'(https?:\/\/[^']+)'/g)) {
    if (!ALLOWED_HOSTS.some((host) => match[1].startsWith(host))) {
      failures.push(`import from a non-allowlisted host: ${match[1]}`)
    }
  }
}
if (!keccak.includes('0x01') || !keccak.includes('RATE_BYTES = 136')) failures.push('local Keccak implementation guard markers missing')
// keccak256 must not be aliased onto a different hash family
if (/\b(sha3_\d+|sha256|shake\w*)\s+as\s+keccak256\b/.test(client)) {
  failures.push('keccak256 is aliased onto a different hash family')
}
// Python string parity must go through ids.js, never trim()/.length
if (/(resourceIdFor|grantIdFor)[\s\S]{0,320}?\.trim\(\)/.test(client)) {
  failures.push('ID derivation uses .trim() instead of pyStrip()')
}
if (/(cleanName|cleanText)\.length/.test(client)) {
  failures.push('ID derivation uses .length instead of pyLen()')
}
// the Snap gate must not sit in front of writes
if (/client\.connect\(/.test(client)) {
  failures.push("client.connect() reintroduces the wallet_requestSnaps gate in front of every write")
}

if (failures.length) {
  console.error('STATIC CHECK FAIL')
  failures.forEach((failure)=>console.error(`- ${failure}`))
  process.exit(1)
}
console.log('STATIC CHECK PASS')
console.log(`- source parity: ${actualSha}`)
console.log(`- deployment: ${expectedAddress}`)
console.log('- full write/view method coverage present')
console.log('- FINALIZED + GenVM result split present')
console.log('- deterministic resource/grant ID derivation present')
console.log('- wallet switching + double-send guard present')
console.log('- no test wallet hardcoding detected')
