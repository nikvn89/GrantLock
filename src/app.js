import {
  CONTRACT_ADDRESS,
  CONTRACT_EXPLORER_URL,
  SOURCE_SHA256,
  CALLDATA_SOFT_LIMIT,
  cleanError,
  createResourceTx,
  evidenceNote,
  executionErrorDetail,
  executionOutcome,
  grantIdFor,
  isStudioNetChain,
  readGrant,
  readGrants,
  readLimits,
  readResource,
  releaseExclusivityTx,
  resourceIdFor,
  shortAddress,
  shortHash,
  submitGrantCalldataBytes,
  submitGrantTx,
  txExplorerUrl,
  waitFinalized,
} from './genlayer.js'

const resourceExample = {
  name: 'Atlas distribution rights',
  scope: 'North America · print distribution',
}

const exclusiveExample = {
  label: 'Distributor',
  text: 'All sales of the Work in the Territory shall be made through the Distributor.',
}

const nonExclusiveExample = {
  label: 'Distributor',
  text: 'The Distributor is named sole distributor, but the Publisher may appoint others at will.',
}

const state = {
  account: '',
  resource: null,
  grants: [],
  limits: null,
  busy: false,
  waitCancel: null,
  waitStartedAt: 0,
}

const $ = (id) => document.getElementById(id)
const all = (selector) => [...document.querySelectorAll(selector)]

function hidden(element, value) {
  element.classList.toggle('hidden', value)
}

function warning(element, message = '') {
  element.textContent = message ? `⚠ ${message}` : ''
  hidden(element, !message)
}

function setBusy(value) {
  state.busy = value
  for (const id of ['createResource', 'submitGrant', 'releaseExclusivity', 'inspectResource']) {
    $(id).disabled = value
  }
}

function setTx({ phase, label, message, hash = '' }) {
  const card = $('txCard')
  hidden(card, false)
  card.classList.remove('tx-success', 'tx-danger', 'tx-warn')
  card.classList.add(phase === 'ERROR' ? 'tx-danger' : phase === 'FINALIZED' ? 'tx-success' : 'tx-warn')
  $('txIcon').textContent = phase === 'ERROR' ? '×' : phase === 'FINALIZED' ? '✓' : '◌'
  $('txIcon').classList.toggle('spin', !['ERROR', 'FINALIZED'].includes(phase))
  $('txLabel').textContent = label
  $('txMessage').textContent = message
  const link = $('txLink')
  if (hash) {
    link.href = txExplorerUrl(hash)
    link.textContent = `${shortHash(hash, 10, 8)} ↗`
    hidden(link, false)
  } else {
    hidden(link, true)
  }
}

function waitStoppedError() {
  const error = new Error('Stopped waiting in the UI. The transaction is still submitted; verify it on Explorer before retrying.')
  error.code = 'WAIT_STOPPED'
  return error
}

async function waitForFinalizedUi(hash, label, baseMessage) {
  let rejectCancel
  const cancelled = new Promise((_, reject) => { rejectCancel = reject })
  state.waitStartedAt = Date.now()
  state.waitCancel = () => rejectCancel(waitStoppedError())
  hidden($('stopWaiting'), false)
  setTx({ phase: 'PENDING', label, hash, message: baseMessage })
  const timer = window.setInterval(() => {
    if (!state.waitCancel) return
    const seconds = Math.floor((Date.now() - state.waitStartedAt) / 1000)
    $('txMessage').textContent = `${baseMessage} · ${seconds}s elapsed`
  }, 5000)
  try {
    return await Promise.race([waitFinalized(hash), cancelled])
  } finally {
    window.clearInterval(timer)
    state.waitCancel = null
    state.waitStartedAt = 0
    hidden($('stopWaiting'), true)
  }
}

async function updateNetworkWarning(chainId = '') {
  if (!window.ethereum) return warning($('networkWarning'))
  try {
    const current = chainId || await window.ethereum.request({ method: 'eth_chainId' })
    warning(
      $('networkWarning'),
      isStudioNetChain(current) ? '' : 'Wallet is not on GenLayer StudioNet. Reads still use the StudioNet RPC; the next write will request a network switch.'
    )
  } catch {
    warning($('networkWarning'), 'Wallet network could not be verified. The next write will request GenLayer StudioNet if needed.')
  }
}

function updateWallet() {
  $('walletLabel').textContent = state.account ? shortAddress(state.account) : 'Connect wallet'
  updateRole()
  updateDerivedResource()
}

function updateRole() {
  const account = state.account.toLowerCase()
  const resource = state.resource
  if (!account) {
    $('heroWalletRole').textContent = '—'
    $('heroWalletRoleSub').textContent = 'Connect wallet'
    return
  }
  if (!resource) {
    $('heroWalletRole').textContent = 'Connected'
    $('heroWalletRoleSub').textContent = shortAddress(state.account)
    return
  }
  const creator = String(resource.creator || '').toLowerCase()
  const holder = String(resource.exclusive_holder_wallet || '').toLowerCase()
  if (account === creator && holder && account === holder) {
    $('heroWalletRole').textContent = 'Creator + holder'
    $('heroWalletRoleSub').textContent = 'Can submit and release'
  } else if (account === creator) {
    $('heroWalletRole').textContent = 'Creator'
    $('heroWalletRoleSub').textContent = resource.locked ? 'Later grants blocked' : 'Can submit grants'
  } else if (holder && account === holder) {
    $('heroWalletRole').textContent = 'Exclusive holder'
    $('heroWalletRoleSub').textContent = 'Can release lock'
  } else {
    $('heroWalletRole').textContent = 'Viewer'
    $('heroWalletRoleSub').textContent = 'Public read access'
  }
}

function updateHeroResource() {
  if (!state.resource) {
    $('heroResourceState').textContent = '—'
    $('heroResourceName').textContent = 'Inspect a resource'
    $('heroGrantCount').textContent = '—'
    return
  }
  $('heroResourceState').textContent = state.resource.state
  $('heroResourceName').textContent = state.resource.name
  $('heroGrantCount').textContent = String(state.resource.grant_count)
}

// The contract counts code points (Python len()); .length counts UTF-16 code
// units, so an emoji would read as 2 against an 80-code-point limit.
const cpLen = (value) => Array.from(String(value ?? '')).length

function updateCounts() {
  $('resourceNameCount').textContent = `${cpLen($('resourceName').value)}/80`
  $('scopeLabelCount').textContent = `${cpLen($('scopeLabel').value)}/120`
  $('granteeLabelCount').textContent = `${cpLen($('granteeLabel').value)}/80`
  $('grantTextCount').textContent = `${cpLen($('grantText').value)}/1200`
  updateCalldataMeter()
}

// Measured, not assumed: the real serialized size of the transaction this form
// would send. The contract's 1200-character allowance is far larger than what
// the transport has ever carried in this project family.
function updateCalldataMeter() {
  const meter = $('calldataMeter')
  if (!meter) return
  const bytes = submitGrantCalldataBytes(
    $('grantResourceId').value.trim().toLowerCase() || '0'.repeat(64),
    $('granteeWallet').value.trim() || `0x${'0'.repeat(39)}1`,
    $('granteeLabel').value,
    $('grantText').value,
  )
  if (bytes === null) {
    meter.textContent = ''
    return
  }
  const over = bytes > CALLDATA_SOFT_LIMIT
  meter.textContent = over
    ? `calldata ${bytes} B \u2014 above ${CALLDATA_SOFT_LIMIT} B, larger than any submit_grant observed to succeed on StudioNet`
    : `calldata ${bytes} B / ${CALLDATA_SOFT_LIMIT} B observed-safe`
  meter.classList.toggle('meter-warn', over)
}

function updateDerivedResource() {
  const name = $('resourceName').value.trim()
  if (!state.account || !name) {
    hidden($('derivedResource'), true)
    return
  }
  const id = resourceIdFor(state.account, name)
  $('derivedResourceId').textContent = id
  hidden($('derivedResource'), false)
}

function resourceTone(resource) {
  return resource?.locked ? 'danger' : 'success'
}

function renderHistory() {
  const list = $('grantHistory')
  list.textContent = ''
  $('historyCount').textContent = `${state.grants.length} record${state.grants.length === 1 ? '' : 's'}`
  hidden($('emptyHistory'), state.grants.length > 0)
  for (const grant of state.grants) {
    const item = document.createElement('div')
    item.className = 'grant-item'
    const tone = grant.verdict === 'EXCLUSIVE_GRANT' ? 'exclusive' : 'open'
    item.innerHTML = `
      <div class="grant-index"><span>#${escapeHtml(grant.index ?? '')}</span><span class="verdict-pill ${tone}">${escapeHtml(grant.verdict || 'UNKNOWN')}</span></div>
      <div class="grant-main"><strong>${escapeHtml(grant.grantee_label || '—')}</strong><code>${escapeHtml(shortAddress(grant.grantee_wallet, 9, 7))}</code></div>
      <button class="grant-open" data-grant-id="${escapeHtml(grant.grant_id || '')}">View grant</button>
      <div class="grant-detail hidden" data-detail-id="${escapeHtml(grant.grant_id || '')}"></div>`
    list.appendChild(item)
  }
  all('.grant-open').forEach((button) => {
    button.addEventListener('click', () => revealGrant(button.dataset.grantId, button))
  })
}

async function revealGrant(grantId, button) {
  const detail = document.querySelector(`[data-detail-id="${CSS.escape(grantId)}"]`)
  if (!detail) return
  if (!detail.classList.contains('hidden')) {
    hidden(detail, true)
    button.textContent = 'View grant'
    return
  }
  detail.textContent = 'Reading grant…'
  hidden(detail, false)
  try {
    const grant = await readGrant(grantId)
    detail.innerHTML = `<p>${escapeHtml(grant.text)}</p><div><span>Grant ID</span><code>${escapeHtml(grant.grant_id)}</code></div>`
    button.textContent = 'Hide grant'
  } catch (error) {
    detail.textContent = `Grant read unavailable: ${cleanError(error)}`
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function renderResource() {
  const resource = state.resource
  hidden($('emptyResource'), Boolean(resource))
  hidden($('resourceView'), !resource)
  updateHeroResource()
  updateRole()
  if (!resource) return

  $('resourceNameDisplay').textContent = resource.name
  const badge = $('resourceState')
  badge.textContent = resource.state
  badge.className = `badge badge-${resourceTone(resource)}`
  $('resourceScope').textContent = resource.scope_label
  $('resourceCreator').textContent = shortAddress(resource.creator, 11, 9)
  $('resourceIdDisplay').textContent = shortHash(resource.resource_id, 14, 12)
  $('resourceGrantCount').textContent = String(resource.grant_count)
  $('resourceHolder').textContent = resource.locked ? shortAddress(resource.exclusive_holder_wallet, 8, 6) : 'None'

  hidden($('holderBox'), !resource.locked)
  hidden($('releaseExclusivity'), !resource.locked)
  if (resource.locked) {
    $('holderLabel').textContent = resource.exclusive_holder_label || 'Exclusive holder'
    $('holderWallet').textContent = resource.exclusive_holder_wallet
    const isHolder = state.account && state.account.toLowerCase() === String(resource.exclusive_holder_wallet).toLowerCase()
    $('releaseHint').textContent = isHolder
      ? 'Connected wallet is the recorded holder. Release is deterministic and preserves grant history.'
      : 'Only the recorded holder can release. A non-holder attempt should finalize with an execution error.'
  } else {
    $('releaseHint').textContent = Number(resource.grant_count) > 0
      ? 'Resource is OPEN, but prior grant history remains. A later EXCLUSIVE_GRANT is rejected by the V1 invariant.'
      : 'Resource is OPEN and has no grant history.'
  }
  renderHistory()
}

async function connectWallet() {
  try {
    if (!window.ethereum) throw new Error('MetaMask is not installed.')
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    state.account = accounts?.[0] || ''
    updateWallet()
    await updateNetworkWarning()
  } catch (error) {
    setTx({ phase: 'ERROR', label: 'Wallet connection', message: cleanError(error) })
  }
}

async function loadHistory(resourceId) {
  try {
    const summaries = await readGrants(resourceId, 0, 20)
    state.grants = Array.isArray(summaries) ? summaries : []
    renderHistory()
    return true
  } catch (error) {
    state.grants = []
    renderHistory()
    warning($('readWarning'), `Resource loaded, but grant history read is unavailable: ${cleanError(error)}`)
    return false
  }
}

async function inspectResource(resourceId = $('inspectResourceId').value, { quiet = false } = {}) {
  const id = String(resourceId || '').trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(id)) {
    if (!quiet) warning($('readWarning'), 'Enter a valid 64-character resource ID.')
    return null
  }
  try {
    if (!quiet) warning($('readWarning'))
    const resource = await readResource(id)
    state.resource = resource
    $('inspectResourceId').value = id
    renderResource()
    await loadHistory(id)
    return resource
  } catch (error) {
    if (!quiet) warning($('readWarning'), cleanError(error))
    return null
  }
}

async function createResource() {
  if (state.busy) return
  if (!state.account) return setTx({ phase: 'ERROR', label: 'Create resource', message: 'Connect MetaMask first.' })
  const name = $('resourceName').value.trim()
  const scope = $('scopeLabel').value.trim()
  if (!name || !scope) return setTx({ phase: 'ERROR', label: 'Create resource', message: 'Resource name and scope label are required.' })

  const expectedId = resourceIdFor(state.account, name)
  setBusy(true)
  setTx({ phase: 'SIGNING', label: 'Create resource', message: 'Waiting for MetaMask signature…' })
  let hash = ''
  try {
    hash = await createResourceTx(state.account, name, scope)
    const receipt = await waitForFinalizedUi(hash, 'Create resource', 'Transaction sent. Waiting for FINALIZED…')
    const outcome = executionOutcome(receipt)
    if (outcome.ok === false) {
      const detail = await executionErrorDetail(hash, `${outcome.name}. Contract state was not modified.`)
      throw new Error(detail)
    }
    const created = await inspectResource(expectedId, { quiet: true })
    if (outcome.ok === null) {
      setTx({
        phase: 'PENDING', label: 'Resource execution needs verification', hash,
        message: created
          ? `FINALIZED · GenVM result unavailable from StudioNet RPC. Resource ${shortHash(expectedId)} exists in accepted state; execution success is not claimed until Explorer verification.`
          : 'FINALIZED · GenVM result unavailable from StudioNet RPC. No success or revert is claimed; verify Explorer before retrying.',
      })
      return
    }
    if (!created) throw new Error('Execution succeeded, but the derived resource could not be re-read from accepted state.')
    $('grantResourceId').value = expectedId
    setTx({ phase: 'FINALIZED', label: 'Resource created', hash, message: `FINALIZED · ${outcome.name}${evidenceNote(outcome)} · ${created.state} · grant_count ${created.grant_count}.` })
  } catch (error) {
    if (error?.code === 'WAIT_STOPPED') {
      await inspectResource(expectedId, { quiet: true })
      setTx({ phase: 'PENDING', label: 'Stopped waiting', hash, message: error.message })
      return
    }
    setTx({ phase: 'ERROR', label: 'Create resource failed', hash, message: cleanError(error) })
  } finally {
    setBusy(false)
  }
}

async function submitGrant() {
  if (state.busy) return
  if (!state.account) return setTx({ phase: 'ERROR', label: 'Submit grant', message: 'Connect MetaMask first.' })
  const resourceId = $('grantResourceId').value.trim().toLowerCase()
  const wallet = $('granteeWallet').value.trim()
  const label = $('granteeLabel').value.trim()
  const text = $('grantText').value.trim()
  if (!/^[0-9a-f]{64}$/.test(resourceId)) return setTx({ phase: 'ERROR', label: 'Submit grant', message: 'A valid 64-character resource ID is required.' })
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet) || /^0x0{40}$/i.test(wallet)) return setTx({ phase: 'ERROR', label: 'Submit grant', message: 'Enter a valid non-zero grantee wallet.' })
  if (!label || !text) return setTx({ phase: 'ERROR', label: 'Submit grant', message: 'Grantee label and grant text are required.' })

  const expectedGrantId = grantIdFor(resourceId, text)
  setBusy(true)
  setTx({ phase: 'SIGNING', label: 'Submit grant', message: 'Waiting for MetaMask signature…' })
  let hash = ''
  try {
    hash = await submitGrantTx(state.account, resourceId, wallet, label, text)
    const receipt = await waitForFinalizedUi(hash, 'Submit grant', 'Semantic consensus is running. Waiting for FINALIZED…')
    const outcome = executionOutcome(receipt)
    if (outcome.ok === false) {
      await inspectResource(resourceId, { quiet: true })
      const detail = await executionErrorDetail(hash, `${outcome.name}. No successful grant is claimed.`)
      throw new Error(detail)
    }
    const resource = await inspectResource(resourceId, { quiet: true })
    const grant = await readGrant(expectedGrantId).catch(() => null)
    if (outcome.ok === null) {
      setTx({
        phase: 'PENDING', label: 'Grant execution needs verification', hash,
        message: grant && resource
          ? `FINALIZED · GenVM result unavailable from StudioNet RPC. Accepted state contains ${grant.verdict} and resource ${resource.state}; success is not claimed until Explorer verification.`
          : 'FINALIZED · GenVM result unavailable from StudioNet RPC. Verify Explorer and contract state before another write.',
      })
      return
    }
    if (!grant || !resource) throw new Error('Execution succeeded, but grant/resource state could not be re-read.')
    setTx({ phase: 'FINALIZED', label: 'Grant finalized', hash, message: `FINALIZED · ${outcome.name}${evidenceNote(outcome)} · ${grant.verdict} → ${resource.state}.` })
  } catch (error) {
    if (error?.code === 'WAIT_STOPPED') {
      await inspectResource(resourceId, { quiet: true })
      setTx({ phase: 'PENDING', label: 'Stopped waiting', hash, message: error.message })
      return
    }
    setTx({ phase: 'ERROR', label: 'Submit grant failed', hash, message: cleanError(error) })
  } finally {
    setBusy(false)
  }
}

async function releaseExclusivity() {
  if (state.busy) return
  if (!state.account) return setTx({ phase: 'ERROR', label: 'Release exclusivity', message: 'Connect MetaMask first.' })
  if (!state.resource) return setTx({ phase: 'ERROR', label: 'Release exclusivity', message: 'Inspect a resource first.' })
  const resourceId = state.resource.resource_id
  setBusy(true)
  setTx({ phase: 'SIGNING', label: 'Release exclusivity', message: 'Waiting for MetaMask signature…' })
  let hash = ''
  try {
    hash = await releaseExclusivityTx(state.account, resourceId)
    const receipt = await waitForFinalizedUi(hash, 'Release exclusivity', 'Transaction sent. Waiting for FINALIZED…')
    const outcome = executionOutcome(receipt)
    if (outcome.ok === false) {
      await inspectResource(resourceId, { quiet: true })
      const detail = await executionErrorDetail(hash, `${outcome.name}. Lock state was not treated as changed.`)
      throw new Error(detail)
    }
    const resource = await inspectResource(resourceId, { quiet: true })
    if (outcome.ok === null) {
      setTx({ phase: 'PENDING', label: 'Release needs verification', hash, message: resource ? `FINALIZED · GenVM result unavailable. Accepted state is ${resource.state}; success is not claimed until Explorer verification.` : 'FINALIZED · GenVM result unavailable. Verify Explorer before retrying.' })
      return
    }
    if (!resource) throw new Error('Execution succeeded, but resource state could not be re-read.')
    setTx({ phase: 'FINALIZED', label: 'Exclusivity released', hash, message: `FINALIZED · ${outcome.name}${evidenceNote(outcome)} · resource is ${resource.state} · historical grant_count ${resource.grant_count}.` })
  } catch (error) {
    if (error?.code === 'WAIT_STOPPED') {
      await inspectResource(resourceId, { quiet: true })
      setTx({ phase: 'PENDING', label: 'Stopped waiting', hash, message: error.message })
      return
    }
    setTx({ phase: 'ERROR', label: 'Release exclusivity failed', hash, message: cleanError(error) })
  } finally {
    setBusy(false)
  }
}

function loadResourceExample() {
  $('resourceName').value = resourceExample.name
  $('scopeLabel').value = resourceExample.scope
  updateCounts()
  updateDerivedResource()
}

function loadGrantExample(example) {
  $('granteeLabel').value = example.label
  $('grantText').value = example.text
  updateCounts()
}

function copyText(value, stateElement) {
  navigator.clipboard.writeText(value).then(() => {
    if (stateElement) {
      const previous = stateElement.textContent
      stateElement.textContent = 'Copied'
      window.setTimeout(() => { stateElement.textContent = previous }, 1200)
    }
  }).catch(() => {})
}

function bindNavigation() {
  const navLinks = all('.nav-link')
  const sections = navLinks.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean)
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
    if (!visible) return
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`))
  }, { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.2, 0.6] })
  sections.forEach((section) => observer.observe(section))
}

function bind() {
  all('.js-contract-link').forEach((link) => { link.href = CONTRACT_EXPLORER_URL })
  $('contractShort').textContent = shortAddress(CONTRACT_ADDRESS, 12, 10)
  $('footerContract').textContent = shortAddress(CONTRACT_ADDRESS, 8, 6)
  $('copyContract').addEventListener('click', () => copyText(CONTRACT_ADDRESS, $('copyContractState')))
  $('copyDerivedResource').addEventListener('click', () => copyText($('derivedResourceId').textContent))
  $('copyResourceId').addEventListener('click', () => state.resource && copyText(state.resource.resource_id))
  $('connectWallet').addEventListener('click', connectWallet)
  $('loadResourceExample').addEventListener('click', loadResourceExample)
  $('loadExclusiveExample').addEventListener('click', () => loadGrantExample(exclusiveExample))
  $('loadNonExclusiveExample').addEventListener('click', () => loadGrantExample(nonExclusiveExample))
  $('createResource').addEventListener('click', createResource)
  $('submitGrant').addEventListener('click', submitGrant)
  $('inspectResource').addEventListener('click', () => inspectResource())
  $('releaseExclusivity').addEventListener('click', releaseExclusivity)
  $('stopWaiting').addEventListener('click', () => state.waitCancel?.())
  $('useResourceForGrant').addEventListener('click', () => {
    if (!state.resource) return
    $('grantResourceId').value = state.resource.resource_id
    document.querySelector('#grant').scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
  for (const id of ['resourceName', 'scopeLabel', 'granteeLabel', 'grantText']) $(id).addEventListener('input', updateCounts)
  for (const id of ['granteeWallet', 'grantResourceId']) $(id).addEventListener('input', updateCalldataMeter)
  $('resourceName').addEventListener('input', updateDerivedResource)
  for (const id of ['grantResourceId', 'inspectResourceId']) {
    $(id).addEventListener('input', (event) => { event.target.value = event.target.value.replace(/[^0-9a-fA-F]/g, '').toLowerCase() })
  }
  $('inspectResourceId').addEventListener('keydown', (event) => { if (event.key === 'Enter') inspectResource() })
  if (window.ethereum) {
    window.ethereum.on?.('accountsChanged', (accounts) => {
      state.account = accounts?.[0] || ''
      updateWallet()
      renderResource()
    })
    window.ethereum.on?.('chainChanged', (chainId) => {
      updateNetworkWarning(chainId)
      if (state.resource) inspectResource(state.resource.resource_id, { quiet: true })
    })
  }
  bindNavigation()
}

async function init() {
  bind()
  loadResourceExample()
  loadGrantExample(exclusiveExample)
  renderResource()
  updateCounts()
  await updateNetworkWarning()
  try {
    state.limits = await readLimits()
  } catch (error) {
    warning($('globalReadWarning'), `Limit read unavailable: ${cleanError(error)}. Write validation still remains enforced by the contract.`)
  }
  // Keep source identity visible to static reviewers without altering the UI hierarchy.
  document.documentElement.dataset.sourceSha256 = SOURCE_SHA256
}

init()
