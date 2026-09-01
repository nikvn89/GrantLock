import test from 'node:test'
import assert from 'node:assert/strict'
import { keccak256 } from '../src/keccak.js'

test('local Keccak-256 matches canonical empty-string vector', () => {
  assert.equal(
    keccak256(''),
    'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
  )
})

test('local Keccak-256 matches canonical abc vector', () => {
  assert.equal(
    keccak256('abc'),
    '4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45',
  )
})

test('local Keccak-256 hashes UTF-8 deterministically', () => {
  assert.equal(
    keccak256('中文'),
    '70a2b6579047f0a977fcb5e9120a4e07067bea9abb6916fbc2d13ffb9a4e4eee',
  )
})
