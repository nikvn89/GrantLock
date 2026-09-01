import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pyLen, pyStrip } from '../src/ids.js'

const source = readFileSync(new URL('../src/genlayer.js', import.meta.url), 'utf8')

function lift(name) {
  const match = source.match(new RegExp('export function ' + name + '\\([\\s\\S]*?\\n\\}'))
  assert.ok(match, `could not lift ${name}() out of src/genlayer.js`)
  return new Function('keccak256', 'pyStrip', 'pyLen', `${match[0].replace('export ', '')}; return ${name}`)(
    (payload) => payload, pyStrip, pyLen,
  )
}

const resourcePayloadFor = lift('resourceIdFor')
const grantPayloadFor = lift('grantIdFor')
const CREATOR = '0x6276095FAEA15108740445ff277fdA8c304657F4'
const RID = '7ed10cc29ee5079e64e3091e277ae80e3c83ac0b4f0ac5ec931a1c68490d2fbc'

test('resource derivation payload reproduces the verified on-chain preimage', () => {
  assert.equal(
    resourcePayloadFor(CREATOR, 'Nordic distribution'),
    `EXCLUSIVITY_LOCK:RESOURCE:V1|${CREATOR.toLowerCase()}|19|Nordic distribution`,
  )
})

test('creator address case does not change the resource payload', () => {
  assert.equal(
    resourcePayloadFor(CREATOR.toLowerCase(), 'Nordic distribution'),
    resourcePayloadFor(CREATOR, 'Nordic distribution'),
  )
})

test('browser source uses the audited local Keccak-256 helper rather than NIST SHA3', () => {
  assert.match(source, /import \{ keccak256 \} from '\.\/keccak\.js'/)
  assert.doesNotMatch(source, /sha3_256\s+as\s+keccak256|sha256\s+as\s+keccak256/)
})

test('pyStrip handles the five Python-only whitespace code points', () => {
  const base = 'Atlas rights'
  for (const ch of ['\u001c', '\u001d', '\u001e', '\u001f', '\u0085']) {
    assert.equal(pyStrip(ch + base), base)
    assert.equal(pyStrip(base + ch), base)
  }
})

test('resource length field counts code points, not UTF-16 units', () => {
  const name = 'Atlas 🎬 rights'
  assert.equal(pyLen(name), 14)
  assert.equal(name.length, 15)
  assert.equal(
    resourcePayloadFor(CREATOR, name),
    `EXCLUSIVITY_LOCK:RESOURCE:V1|${CREATOR.toLowerCase()}|14|${name}`,
  )
})

test('U+FEFF is not stripped because Python str.strip does not strip it', () => {
  const value = '\ufeffAtlas rights'
  assert.equal(pyStrip(value), value)
  assert.notEqual(resourcePayloadFor(CREATOR, value), resourcePayloadFor(CREATOR, 'Atlas rights'))
})

test('ordinary Python whitespace is stripped on both sides', () => {
  const base = 'Atlas rights'
  for (const ws of [' ', '\t', '\n', '\r', '\u00a0', '\u2003', '\u3000']) {
    assert.equal(pyStrip(`${ws}${base}${ws}`), base)
  }
})

test('grant payload applies the same strip and code-point length rules', () => {
  const text = 'All sales of the Work in the Territory shall be made through the Distributor.'
  const expected = `EXCLUSIVITY_LOCK:GRANT:V1|${RID}|${pyLen(text)}|${text}`
  assert.equal(grantPayloadFor(RID, text), expected)
  assert.equal(grantPayloadFor(RID, `\u001c${text}\u0085`), expected)
})

test('different grant text produces a different grant preimage', () => {
  assert.notEqual(grantPayloadFor(RID, 'text one'), grantPayloadFor(RID, 'text two'))
})
