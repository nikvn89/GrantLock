# Changelog

## 2026-09-01 — Claude review remediation

- Kept `contracts/ExclusivityLock.py` byte-identical; SHA256 unchanged.
- Fixed Python/JavaScript parity for deterministic resource/grant IDs with `pyStrip()` and code-point `pyLen()`.
- Removed the `client.connect()` Snap gate; writes now request only StudioNet chain switching via standard wallet methods.
- Qualified leader-receipt-only execution evidence instead of presenting it as consensus.
- Added a live serialized calldata size meter for `submit_grant`.
- Added a stop-waiting control that preserves the submitted tx hash and avoids treating a user-aborted wait as a contract failure.
- Added an explicit wrong-network warning while retaining automatic StudioNet switch on write.
- Escaped all grant-history interpolation consistently.
- Consolidated browser module imports onto the version-pinned `esm.sh` host and added CSP/security headers.
- Expanded automated tests from 10 to 19, including Python whitespace/code-point ID parity regression tests.
- Added K1/R2 semantic pre-gate to `TESTING.md`; runtime semantic status remains PENDING until observed on this exact deployment.

## 2026-09-01 — GrantLock Vercel-ready build

- Created the new `GrantLock` frontend around the unchanged `ExclusivityLock` Intelligent Contract.
- Bound the frontend to fresh StudioNet deployment `0x7cDcdE83B2a5192ACC00412cf192684c951081cc`.
- Preserved contract source SHA256 `c82e52db2b1c3e0192db8212f08cc42ad749388e2cc1b8fa1da7733b0d04e3d3`.
- Added Portal-inspired dark UI using the established charcoal + lime GenLayer project palette.
- Added resource creation with exact deterministic resource-ID derivation.
- Added exclusive/non-exclusive semantic grant workflow with exact deterministic grant-ID derivation.
- Added live resource inspection, grant history, holder display and release flow.
- Added MetaMask wallet connect and wallet-switch handling without hardcoded test accounts.
- Added FINALIZED tracking with explicit GenVM success/error handling and StudioNet execution metadata fallback.
- Added deterministic revert diagnostics via transaction trace when available.
- Added double-send protection and accepted-state re-read after writes.
- Added reviewer flow covering exclusive semantic classification, locked-resource rejection, holder release and non-exclusive control.
- Added responsive desktop/tablet/mobile layout and production assets.
- Added source parity, integration, method coverage and static safety tests.
- Vercel runtime E2E intentionally remains PENDING until observed on the deployed production URL.

## 2026-09-01 — Windows local build path fix
- Fixed `scripts/build.mjs` and `scripts/dev.mjs` to convert `import.meta.url` with `fileURLToPath()` before path resolution.
- Prevents malformed Windows paths such as `C:\C:\Users\...\dist`.
- No contract, frontend runtime, or deployment-address changes.

## 2026-09-01 — Local runtime initialization fix
- Replaced the browser `js-sha3` CDN import with a local, dependency-free Keccak-256 helper after Chrome proved the CDN wrapper did not export `keccak256` as a named ESM export.
- Added canonical Keccak-256 regression vectors for empty string, `abc`, and UTF-8 text.
- Kept GenLayerJS version-pinned; contract source, deployment address, business logic, and wallet flow are unchanged.

## 2026-09-01 — Project-specific visual identity

- Kept the GenLayer Portal-inspired information architecture while replacing the CycleGuard-like charcoal/lime skin with a GrantLock-specific deep-navy and warm-metal palette.
- Added an octagonal lock core, metallic highlight line, navy depth treatment, and gold active/navigation states so GrantLock is visually distinct without changing contract or transaction logic.
- Contract source and StudioNet deployment address remain unchanged.

## 2026-09-01 — Runtime console / role guard

- Removed unsupported `gen_dbg_traceTransaction` diagnostics from production UI; execution-error detail now uses only finalized receipt/full-transaction data already returned by supported calls.
- Added a creator-role preflight when the exact accepted resource is loaded, preventing accidental grant submission from a non-creator wallet without sending a transaction.
- Contract source and deployment address unchanged.
