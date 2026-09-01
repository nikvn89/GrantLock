# Changelog

## 2026-09-01 — Final Vercel E2E PASS

- Verified production at `https://grant-lock.vercel.app/` against StudioNet contract `0x7cDcdE83B2a5192ACC00412cf192684c951081cc`.
- Verified K1 semantic probe returns `EXCLUSIVE_GRANT` on a fresh resource.
- Verified deterministic K1 consequence: resource becomes `LOCKED`, grant count becomes 1, and the exclusive holder is recorded.
- Verified a later grant attempt on the locked resource finalizes with execution error and leaves resource state/history unchanged.
- Verified a non-holder cannot unlock the resource through the tested flow; accepted state remained locked until the recorded holder acted.
- Verified holder release restores `OPEN`, clears the current holder, preserves grant count, and retains append-only exclusive history.
- Verified R2 semantic control returns `NON_EXCLUSIVE_GRANT` on a fresh separate resource.
- Verified R2 consequence: resource remains `OPEN`, grant count becomes 1, and current holder remains `None`.
- Verified wallet switching, automatic state re-read, no manual refresh requirement, and production console smoke after clearing prior logs.
- Updated final runtime documentation; contract source remains byte-identical.

## 2026-09-01 — Runtime console / role guard

- Removed unsupported `gen_dbg_traceTransaction` diagnostics from production UI; execution-error detail uses supported finalized receipt/full-transaction evidence.
- Added a creator-role preflight when the accepted resource is loaded, preventing accidental grant submission from a proven non-creator wallet without sending a transaction.
- Expanded automated tests to 23/23.
- Contract source and deployment address unchanged.

## 2026-09-01 — Project-specific visual identity

- Kept the GenLayer Portal-inspired information architecture while giving GrantLock a distinct deep-navy and warm-metal identity.
- Added an octagonal lock core, metallic highlight treatment and gold active/navigation states.
- Contract source and StudioNet deployment address unchanged.

## 2026-09-01 — Local runtime initialization fix

- Replaced the browser `js-sha3` CDN import with a local dependency-free Keccak-256 helper after Chrome showed the CDN wrapper did not provide the required named ESM export.
- Added canonical Keccak-256 regression vectors and deterministic ID parity tests.
- Kept GenLayerJS version-pinned; contract source, deployment address and business logic unchanged.

## 2026-09-01 — Windows local build path fix

- Fixed `scripts/build.mjs` and `scripts/dev.mjs` to convert `import.meta.url` with `fileURLToPath()` before path resolution.
- Prevented malformed Windows paths such as `C:\\C:\\Users\\...\\dist`.

## 2026-09-01 — External review remediation

- Kept `contracts/ExclusivityLock.py` byte-identical; SHA256 unchanged.
- Fixed Python/JavaScript parity for deterministic resource/grant IDs with Python-compatible strip/code-point length behavior.
- Removed the `client.connect()` Snap gate; writes use standard StudioNet network switching.
- Qualified leader-receipt-only execution evidence instead of presenting it as validator consensus.
- Added live serialized calldata size meter, wrong-network warning, stop-waiting control, consistent grant-history escaping and CSP/security headers.
- Added K1/R2 semantic pre-gates and regression coverage.

## 2026-09-01 — GrantLock initial build

- Created the `GrantLock` frontend around the unchanged `ExclusivityLock` Intelligent Contract.
- Bound the frontend to fresh StudioNet deployment `0x7cDcdE83B2a5192ACC00412cf192684c951081cc`.
- Preserved contract source SHA256 `c82e52db2b1c3e0192db8212f08cc42ad749388e2cc1b8fa1da7733b0d04e3d3`.
- Added resource creation, deterministic ID derivation, semantic grant workflow, resource inspection, append-only history, holder display and release flow.
- Added MetaMask wallet switching, FINALIZED tracking, GenVM success/error handling, double-send protection and accepted-state re-read.
- Added responsive production UI and automated source/integration/runtime-safety tests.
