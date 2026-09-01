import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
const bytes = readFileSync(new URL('../contracts/ExclusivityLock.py', import.meta.url))
const sha = createHash('sha256').update(bytes).digest('hex')
const expected = 'c82e52db2b1c3e0192db8212f08cc42ad749388e2cc1b8fa1da7733b0d04e3d3'
if (sha !== expected) {
  console.error(`SOURCE PARITY FAIL\nexpected ${expected}\nactual   ${sha}`)
  process.exit(1)
}
console.log(`SOURCE PARITY PASS ${sha}`)
