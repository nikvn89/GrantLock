import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

test('Accepted ExclusivityLock source stays byte-identical', () => {
  const bytes = readFileSync(new URL('../contracts/ExclusivityLock.py', import.meta.url))
  const sha = createHash('sha256').update(bytes).digest('hex')
  assert.equal(sha, 'c82e52db2b1c3e0192db8212f08cc42ad749388e2cc1b8fa1da7733b0d04e3d3')
})

test('contract keeps narrow two-label semantic enum', () => {
  const source = readFileSync(new URL('../contracts/ExclusivityLock.py', import.meta.url), 'utf8')
  assert.match(source, /EXCLUSIVE_GRANT = "EXCLUSIVE_GRANT"/)
  assert.match(source, /NON_EXCLUSIVE_GRANT = "NON_EXCLUSIVE_GRANT"/)
  assert.match(source, /Resource is locked by an exclusive grant/)
  assert.match(source, /Only exclusive holder may release exclusivity/)
})
