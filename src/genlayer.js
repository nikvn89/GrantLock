import { abi, createClient } from 'https://esm.sh/genlayer-js@1.1.8'
import { studionet } from 'https://esm.sh/genlayer-js@1.1.8/chains'
import { ExecutionResult, TransactionStatus } from 'https://esm.sh/genlayer-js@1.1.8/types'
import { keccak256 } from './keccak.js'
import { pyLen, pyStrip } from './ids.js'

export const CONTRACT_ADDRESS = '0x7cDcdE83B2a5192ACC00412cf192684c951081cc'
export const EXPLORER_BASE = 'https://explorer-studio.genlayer.com'
export const CONTRACT_EXPLORER_URL = `${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`
export const SOURCE_SHA256 = 'c82e52db2b1c3e0192db8212f08cc42ad749388e2cc1b8fa1da7733b0d04e3d3'

export const readClient = createClient({ chain: studionet })

export function makeWriteClient(account) {
  if (!window.ethereum) throw new Error('MetaMask was not detected in this browser.')
  return createClient({ chain: studionet, account, provider: window.ethereum })
}

// genlayer-js 1.1.8 connect() does the chain switch AND then calls
// wallet_getSnaps + wallet_requestSnaps (dist/index.js lines 1663-1685). A
// reviewer on ordinary MetaMask is asked to install the GenLayer Snap before
// their first write and the request throws if they decline -- and it throws
// BEFORE writeContract, so the transaction is never submitted. Snaps are also
// unavailable in MetaMask Mobile's browser and in non-MetaMask injected
// wallets, where wallet_getSnaps rejects outright.
//
// The chain switch is the only part this app needs, so it is done directly:
// EIP-3326 first, EIP-3085 on 4902, then switch again.
export const STUDIONET_CHAIN_ID_HEX = `0x${studionet.id.toString(16)}`
export function isStudioNetChain(chainId) {
  return String(chainId || '').toLowerCase() === STUDIONET_CHAIN_ID_HEX.toLowerCase()
}

export async function ensureStudioNet(account) {
  const client = makeWriteClient(account)
  const current = await window.ethereum.request({ method: 'eth_chainId' })
  if (!isStudioNetChain(current)) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
      })
    } catch (error) {
      if (error?.code !== 4902) throw error
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: STUDIONET_CHAIN_ID_HEX,
          chainName: studionet.name,
          rpcUrls: studionet.rpcUrls.default.http,
          nativeCurrency: studionet.nativeCurrency,
          blockExplorerUrls: [studionet.blockExplorers?.default?.url].filter(Boolean),
        }],
      })
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
      })
    }
  }
  return client
}

export function resourceIdFor(creator, name) {
  // pyStrip/pyLen, never trim/.length -- see src/ids.js for why.
  const cleanName = pyStrip(name)
  const payload = `EXCLUSIVITY_LOCK:RESOURCE:V1|${String(creator || '').toLowerCase()}|${pyLen(cleanName)}|${cleanName}`
  return keccak256(payload)
}

export function grantIdFor(resourceId, text) {
  const cleanText = pyStrip(text)
  const payload = `EXCLUSIVITY_LOCK:GRANT:V1|${String(resourceId || '').toLowerCase()}|${pyLen(cleanText)}|${cleanText}`
  return keccak256(payload)
}

// ---------------------------------------------------------------------------
// Calldata size meter
//
// The contract accepts a 1200-character grant text and an 80-character grantee
// label, and the form advertises both. The serialized transaction is a much
// tighter constraint: with a 42-character wallet and the label "Distributor",
// submit_grant crosses 255 bytes at 99 characters of grant text, and an
// 80-character label leaves room for only 29.
//
// Whether 255 bytes is a hard StudioNet limit has never been established at
// runtime in this project family. Rather than guess, the app measures the real
// serialized size and shows it, so the number is observed instead of assumed.
export const CALLDATA_SOFT_LIMIT = 255

export function submitGrantCalldataBytes(resourceId, granteeWallet, granteeLabel, grantText) {
  try {
    const encoded = abi.calldata.encode({
      method: 'submit_grant',
      args: [
        String(resourceId || ''),
        String(granteeWallet || ''),
        pyStrip(granteeLabel),
        pyStrip(grantText),
      ],
    })
    return (abi.transactions.serialize([encoded, false]).length - 2) / 2
  } catch {
    return null
  }
}

export async function readResource(resourceId) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_resource',
    args: [String(resourceId)],
    stateStatus: 'accepted',
  })
}

export async function readGrant(grantId) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_grant',
    args: [String(grantId)],
    stateStatus: 'accepted',
  })
}

export async function readGrants(resourceId, offset = 0, limit = 20) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_grants',
    args: [String(resourceId), Number(offset), Number(limit)],
    stateStatus: 'accepted',
  })
}

export async function readLimits() {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_limits',
    args: [],
    stateStatus: 'accepted',
  })
}

export async function createResourceTx(account, name, scopeLabel) {
  const client = await ensureStudioNet(account)
  return client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'create_resource',
    args: [name, scopeLabel],
    value: 0n,
  })
}

export async function submitGrantTx(account, resourceId, granteeWallet, granteeLabel, grantText) {
  const client = await ensureStudioNet(account)
  return client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'submit_grant',
    args: [resourceId, granteeWallet, granteeLabel, grantText],
    value: 0n,
  })
}

export async function releaseExclusivityTx(account, resourceId) {
  const client = await ensureStudioNet(account)
  return client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'release_exclusivity',
    args: [resourceId],
    value: 0n,
  })
}

function rawLeaderExecution(value) {
  const consensus = value?.consensus_data || value?.consensusData || value?.transaction?.consensus_data || value?.transaction?.consensusData
  let leader = consensus?.leader_receipt || consensus?.leaderReceipt
  if (Array.isArray(leader)) leader = leader[0]
  return String(leader?.execution_result || leader?.executionResult || '').toUpperCase()
}

function executionName(value) {
  return String(
    value?.txExecutionResultName ||
    value?.executionResultName ||
    value?.transaction?.txExecutionResultName ||
    value?.transaction?.executionResultName ||
    ''
  ).toUpperCase()
}

export function evidenceNote(outcome) {
  // The leader receipt is one validator's result, not the consensus outcome.
  // When it is the only evidence available, say so rather than printing a bare
  // FINISHED_WITH_RETURN that reads like a settled fact.
  return outcome?.evidence === 'LEADER_RECEIPT'
    ? ' (leader receipt only \u2014 confirm the validator set on Explorer)'
    : ''
}

export function executionOutcome(receipt) {
  for (const source of [receipt, receipt?._transaction]) {
    const name = executionName(source)
    if (name === ExecutionResult.FINISHED_WITH_RETURN || name === 'FINISHED_WITH_RETURN') {
      return { ok: true, name: 'FINISHED_WITH_RETURN', evidence: 'SDK' }
    }
    if (name === ExecutionResult.FINISHED_WITH_ERROR || name === 'FINISHED_WITH_ERROR') {
      return { ok: false, name: 'FINISHED_WITH_ERROR', evidence: 'SDK' }
    }
    const raw = rawLeaderExecution(source)
    if (raw === 'SUCCESS' || raw === 'FINISHED_WITH_RETURN') {
      return { ok: true, name: 'FINISHED_WITH_RETURN', evidence: 'LEADER_RECEIPT' }
    }
    if (raw === 'ERROR' || raw === 'FINISHED_WITH_ERROR') {
      return { ok: false, name: 'FINISHED_WITH_ERROR', evidence: 'LEADER_RECEIPT' }
    }
  }
  return { ok: null, name: 'EXECUTION_RESULT_UNAVAILABLE', evidence: 'NONE' }
}

export async function waitFinalized(txHash) {
  const receipt = await readClient.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.FINALIZED,
    interval: 5000,
    retries: 240,
    fullTransaction: true,
  })
  if (executionOutcome(receipt).ok !== null) return receipt
  try {
    const transaction = await readClient.getTransaction({ hash: txHash })
    return { ...receipt, _transaction: transaction }
  } catch {
    return receipt
  }
}

function deepStrings(value, output = []) {
  if (typeof value === 'string') output.push(value)
  else if (Array.isArray(value)) value.forEach((item) => deepStrings(item, output))
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => deepStrings(item, output))
  return output
}

export async function executionErrorDetail(txHash, fallback = '') {
  try {
    const trace = await readClient.debugTraceTransaction({ hash: txHash })
    const strings = deepStrings(trace)
      .map((value) => value.trim())
      .filter(Boolean)
    const preferred = strings.find((value) => /resource is locked|only resource creator|only exclusive holder|exclusive grant requires|already exists|grant already exists|invalid|cannot|too long|limit reached/i.test(value))
    return preferred || strings.find((value) => /error|revert|usererror/i.test(value)) || fallback
  } catch {
    return fallback
  }
}

export function txExplorerUrl(hash) {
  return `${EXPLORER_BASE}/tx/${hash}`
}

export function shortAddress(value, left = 6, right = 4) {
  if (!value) return '—'
  const text = String(value)
  if (text.length <= left + right + 3) return text
  return `${text.slice(0, left)}…${text.slice(-right)}`
}

export function shortHash(value, left = 8, right = 8) {
  return shortAddress(value, left, right)
}

export function cleanError(error) {
  const text = String(error?.shortMessage || error?.message || error || 'Unknown error')
  return text
    .replace(/^Error:\s*/i, '')
    .replace(/\n\s*Details:[\s\S]*$/i, '')
    .trim()
}
