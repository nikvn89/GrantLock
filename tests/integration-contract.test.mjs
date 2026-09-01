import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const client = readFileSync(new URL('../src/genlayer.js', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')

const address = '0x7cDcdE83B2a5192ACC00412cf192684c951081cc'

test('fresh deployment address is source-pinned', () => {
  assert.ok(client.includes(address))
  assert.ok(html.includes('GrantLock'))
})

test('all contract interaction methods are covered', () => {
  for (const method of ['create_resource','submit_grant','release_exclusivity','get_resource','get_grant','get_grants','get_limits']) {
    assert.ok(client.includes(`'${method}'`), method)
  }
})

test('transaction lifecycle separates finalized from execution success', () => {
  assert.match(client, /TransactionStatus\.FINALIZED/)
  assert.match(client, /FINISHED_WITH_RETURN/)
  assert.match(client, /FINISHED_WITH_ERROR/)
  assert.match(client, /EXECUTION_RESULT_UNAVAILABLE/)
  assert.match(client, /getTransaction/)
  assert.doesNotMatch(client, /debugTraceTransaction|gen_dbg_traceTransaction/)
  assert.match(client, /executionErrorDetail\(receipt/)
})

test('frontend re-reads contract after writes', () => {
  assert.match(app, /inspectResource\(expectedId/)
  assert.match(app, /await inspectResource\(resourceId/)
  assert.match(app, /await readGrant\(expectedGrantId\)/)
})

test('wallet switching and double-send protection are present', () => {
  assert.match(app, /accountsChanged/)
  assert.match(app, /chainChanged/)
  assert.match(app, /if \(state\.busy\) return/)
})

test('reviewer path covers semantic positive, deterministic lock, release, and negative control', () => {
  assert.match(html, /Submit exclusive text/)
  assert.match(html, /Prove the lock has teeth/)
  assert.match(html, /Release as holder/)
  assert.match(html, /Run the negative control/)
})

test('responsive breakpoints are present', () => {
  assert.match(css, /@media\(max-width:1080px\)/)
  assert.match(css, /@media\(max-width:760px\)/)
  assert.match(css, /@media\(max-width:460px\)/)
})

test('no test wallet is hardcoded', () => {
  const combined = `${client}\n${app}`
  const addresses = [...combined.matchAll(/0x[0-9a-fA-F]{40}/g)].map((m)=>m[0].toLowerCase())
  assert.deepEqual([...new Set(addresses)], [address.toLowerCase()])
})


test('frontend blocks wrong-wallet grant before signing when accepted resource is loaded', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8')
  assert.match(app, /Only the resource creator may submit grants/)
  assert.match(app, /No transaction was sent/)
})
