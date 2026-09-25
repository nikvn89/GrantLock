import test from 'node:test'
import assert from 'node:assert/strict'
import {
  escapeHtml,
  grantConfirmationState,
  isValidNonZeroWallet,
  submitOnlyAfterGrantConfirmation,
} from '../src/safety.js'

const CREATOR = '0x6276095FAEA15108740445ff277fdA8c304657F4'
const GRANTEE = '0x146e44881d35814bA582D265AF5b97ef2695ec8e'

test('grantee wallet validation rejects malformed and zero addresses', () => {
  assert.equal(isValidNonZeroWallet('0x1234'), false)
  assert.equal(isValidNonZeroWallet(`0x${'0'.repeat(40)}`), false)
})

test('grantee wallet validation accepts a full non-zero address', () => {
  assert.equal(isValidNonZeroWallet(GRANTEE), true)
})

test('confirmation stays blocked until the exact wallet is acknowledged', () => {
  assert.equal(grantConfirmationState({ wallet: GRANTEE }).ready, false)
  assert.equal(grantConfirmationState({ wallet: GRANTEE, acknowledged: true, confirmedWallet: CREATOR }).ready, false)
  assert.equal(grantConfirmationState({ wallet: GRANTEE, acknowledged: true, confirmedWallet: GRANTEE }).ready, true)
})

test('creator-as-grantee is surfaced as a separate warning state', () => {
  const status = grantConfirmationState({
    wallet: CREATOR.toLowerCase(),
    creatorWallet: CREATOR,
    acknowledged: true,
    confirmedWallet: CREATOR,
  })
  assert.equal(status.sameAsCreator, true)
  assert.equal(status.ready, true)
})

test('no transaction callback runs before confirmation', async () => {
  let sends = 0
  const result = await submitOnlyAfterGrantConfirmation(
    { wallet: GRANTEE, acknowledged: false, confirmedWallet: '' },
    async () => { sends += 1; return '0xhash' },
  )
  assert.equal(result.sent, false)
  assert.equal(sends, 0)
})

test('exact confirmed wallet permits one transaction callback', async () => {
  let sends = 0
  const result = await submitOnlyAfterGrantConfirmation(
    { wallet: GRANTEE, acknowledged: true, confirmedWallet: GRANTEE },
    async () => { sends += 1; return '0xhash' },
  )
  assert.equal(result.sent, true)
  assert.equal(result.result, '0xhash')
  assert.equal(sends, 1)
})

test('escapeHtml neutralizes script markup in a grantee label', () => {
  const rendered = escapeHtml('<script>alert("label")</script>')
  assert.equal(rendered, '&lt;script&gt;alert(&quot;label&quot;)&lt;/script&gt;')
  assert.doesNotMatch(rendered, /<script>/)
})

test('escapeHtml neutralizes script markup in grant history text', () => {
  const rendered = escapeHtml('<script>alert("grant")</script> & more')
  assert.equal(rendered, '&lt;script&gt;alert(&quot;grant&quot;)&lt;/script&gt; &amp; more')
  assert.doesNotMatch(rendered, /<script>/)
})
