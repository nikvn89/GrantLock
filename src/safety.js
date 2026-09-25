const WALLET_PATTERN = /^0x[0-9a-fA-F]{40}$/
const ZERO_WALLET_PATTERN = /^0x0{40}$/i

export function normalizeWallet(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function isValidNonZeroWallet(value) {
  const wallet = String(value ?? '').trim()
  return WALLET_PATTERN.test(wallet) && !ZERO_WALLET_PATTERN.test(wallet)
}

export function grantConfirmationState({ wallet, creatorWallet = '', acknowledged = false, confirmedWallet = '' }) {
  const normalizedWallet = normalizeWallet(wallet)
  const validWallet = isValidNonZeroWallet(wallet)
  const sameAsCreator = Boolean(
    validWallet
    && normalizeWallet(creatorWallet)
    && normalizedWallet === normalizeWallet(creatorWallet),
  )
  const confirmed = Boolean(
    validWallet
    && acknowledged
    && normalizeWallet(confirmedWallet) === normalizedWallet,
  )
  return {
    validWallet,
    sameAsCreator,
    confirmed,
    ready: validWallet && confirmed,
  }
}

export async function submitOnlyAfterGrantConfirmation(input, sendTransaction) {
  const status = grantConfirmationState(input)
  if (!status.ready) return { sent: false, status, result: undefined }
  return { sent: true, status, result: await sendTransaction() }
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
