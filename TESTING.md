# GrantLock Testing

This file separates local/static evidence, transaction finality, GenVM execution, semantic verdicts, deterministic consequences and frontend/Vercel behavior.

## Deployment identity

```text
Network: GenLayer StudioNet
Contract: 0x7cDcdE83B2a5192ACC00412cf192684c951081cc
Explorer: https://explorer-studio.genlayer.com/address/0x7cDcdE83B2a5192ACC00412cf192684c951081cc
Production: https://grant-lock.vercel.app/
Source SHA256: c82e52db2b1c3e0192db8212f08cc42ad749388e2cc1b8fa1da7733b0d04e3d3
```

## A. Local gates

Commands:

```bash
npm install
npm run verify:source
npm run check
npm test
npm run build
```

Observed status:

```text
SOURCE PARITY: PASS
STATIC CHECK: PASS
AUTOMATED TESTS: 23/23 PASS
PRODUCTION BUILD: PASS
WINDOWS LOCAL BUILD: PASS
LOCAL UI INITIALIZATION: PASS
```

The browser startup regression caused by the earlier CDN `js-sha3` named export was removed by the local Keccak implementation. Windows path handling uses `fileURLToPath()`.

## B. Runtime wallet mapping used for observed E2E

Wallet addresses below are runtime test evidence only; they are not hardcoded into the contract or frontend.

```text
Wallet 1 — deployer / negative-test grantee:
0x6276095FAEA15108740445ff277fdA8c304657F4

Wallet 2 — resource creator / grantor:
0x037f58E33c1Ec8fdA272361E0aAC1e31054a1CDE

Wallet 3 — grantee / exclusive holder:
0x146e44881d35814bA582D265AF5b97ef2695ec8e
```

The deployment wallet has no global admin privilege in the contract. User-flow writes were tested with the creator/holder roles required by contract logic.

## C. K1 semantic gate — PASS

Fresh resource:

```text
Name: Atlas distribution rights
Scope: North America · print distribution
Creator: Wallet 2
Initial state: OPEN
Initial grant_count: 0
```

K1 grant to Wallet 3:

```text
All sales of the Work in the Territory shall be made through the Distributor.
```

Observed accepted state:

```text
semantic verdict = EXCLUSIVE_GRANT
resource state = LOCKED
grant_count = 1
current/exclusive holder = Wallet 3
grant history = 1 EXCLUSIVE_GRANT record
```

**K1 semantic gate: PASS.**

## D. Locked-resource deterministic tooth — PASS

While the K1 resource was still `LOCKED`, Wallet 2 attempted another grant on the same resource to Wallet 1.

Observed transaction/execution behavior:

```text
transaction reached FINALIZED
GenVM result = FINISHED_WITH_ERROR
frontend did not claim a successful grant
```

Observed contract state after the failed write:

```text
resource = LOCKED
grant_count = 1
current holder = Wallet 3
grant history still contains only the original EXCLUSIVE_GRANT
```

Therefore the later grant was rejected without fabricating or appending a new semantic result.

## E. Release authorization and holder release — PASS

A non-holder release attempt did not unlock the K1 resource; accepted state remained:

```text
resource = LOCKED
grant_count = 1
current holder = Wallet 3
```

Wallet 3, the recorded exclusive holder, then released exclusivity.

Observed accepted state:

```text
resource = OPEN
grant_count = 1
current holder = None
historical EXCLUSIVE_GRANT remains visible
```

**Holder-only release consequence: PASS.**

## F. R2 semantic control — PASS

Fresh separate resource:

```text
Name: Atlas distribution rights control
Scope: North America · digital distribution
Creator: Wallet 2
Initial state: OPEN
Initial grant_count: 0
Initial holder: None
```

R2 grant to Wallet 3:

```text
The Distributor is named sole distributor, but the Publisher may appoint others at will.
```

Observed accepted state:

```text
semantic verdict = NON_EXCLUSIVE_GRANT
resource state = OPEN
grant_count = 1
current holder = None
grant history = 1 NON_EXCLUSIVE_GRANT record
```

The production transaction card showed `FINALIZED · FINISHED_WITH_RETURN` with leader-receipt execution evidence, and the UI re-read accepted StudioNet state showing the values above.

**R2 semantic gate: PASS.**

## G. Wallet switching / frontend integration — PASS

Observed during production E2E:

- creator and holder wallets switched without losing the ability to re-inspect accepted resource state;
- writes were not double-sent;
- UI waited for finalization before treating writes as complete;
- successful and failed execution paths were displayed differently;
- state changes were rendered from contract reads, not inferred from tx hashes;
- holder release and semantic grant results appeared without a manual page refresh;
- wrong-role grant submission is guarded when the currently loaded resource proves the connected wallet is not the creator;
- unsupported `gen_dbg_traceTransaction` is not called by the production frontend.

## H. Production console smoke — PASS

After completing E2E, DevTools Console was cleared, prior logs were not preserved, and the accepted R2 resource was inspected again.

Observed:

```text
No new red GrantLock/GenLayer runtime error after Inspect.
```

Browser-extension `contentscript.js` warnings/issues are not GrantLock application errors.

## I. Gate summary

```text
STATIC CHECK: PASS
SOURCE PARITY: PASS
PRODUCTION BUILD: PASS
AUTOMATED TESTS: 23/23 PASS
DEPLOYMENT: PASS
K1 EXCLUSIVE SEMANTIC: PASS
LOCKED SECOND-GRANT REJECTION: PASS
RELEASE AUTHORIZATION / HOLDER RELEASE: PASS
R2 NON-EXCLUSIVE SEMANTIC: PASS
WALLET SWITCHING: PASS
AUTO STATE RE-READ: PASS
PRODUCTION CONSOLE SMOKE: PASS
VERCEL RUNTIME E2E: PASS
```

## J. Not claimed

The following were not required to establish the observed submission path and are not claimed as freshly executed in this final E2E session:

- exhaustive equivalence testing for real-world overlap between distinct resource IDs;
- a fresh post-release V1 attempt that semantically resolves to another `EXCLUSIVE_GRANT` on the same historical resource;
- legal enforceability of any textual grant.
