# GrantLock

**GenLayer semantic exclusivity with deterministic enforcement.**

GrantLock is a production-oriented frontend for the steward-accepted `ExclusivityLock` Intelligent Contract source. The frontend name is intentionally different from the contract class; the contract source is preserved byte-for-byte.

## Fresh StudioNet deployment

- Project/frontend: `GrantLock`
- Contract class: `ExclusivityLock`
- Network: GenLayer StudioNet
- Contract: `0x7cDcdE83B2a5192ACC00412cf192684c951081cc`
- Explorer: `https://explorer-studio.genlayer.com/address/0x7cDcdE83B2a5192ACC00412cf192684c951081cc`
- Contract source SHA256: `c82e52db2b1c3e0192db8212f08cc42ad749388e2cc1b8fa1da7733b0d04e3d3`

## What the contract decides

Validators classify one natural-language grant into exactly one narrow enum:

```text
EXCLUSIVE_GRANT
NON_EXCLUSIVE_GRANT
```

The semantic question is whether the submitted grant both establishes the grant relationship for the declared grantee and removes the grantor's unilateral freedom to confer the same grant over the same contract-local resource scope to an additional grantee while the grant remains in force.

AI decides only that semantic classification.

## Deterministic consequence

```text
NON_EXCLUSIVE_GRANT
→ grant is recorded
→ resource remains OPEN
→ later grants remain possible

EXCLUSIVE_GRANT
→ grant is recorded
→ resource becomes LOCKED
→ exclusive holder is recorded
→ every later submit_grant on that resource reverts before inference
```

Release is also deterministic:

```text
exclusive holder only
LOCKED → OPEN
current holder fields cleared
historical grant retained
```

V1 does not allow a new exclusive grant after any prior grant history exists.

## Roles

- `create_resource`: any wallet; caller becomes resource creator.
- `submit_grant`: resource creator only.
- `release_exclusivity`: recorded exclusive-holder wallet only.
- views: public.
- no global admin or deployer privilege.

No test wallet is hardcoded into the contract or frontend. Runtime test wallets must be chosen explicitly per test session.

## Frontend behavior

The app is intentionally evidence-first:

- uses the fresh deployed address directly;
- connects MetaMask and switches to StudioNet before writes;
- derives resource/grant IDs from the contract's exact deterministic domain-separated formulas;
- waits for `FINALIZED`;
- distinguishes `FINISHED_WITH_RETURN` from `FINISHED_WITH_ERROR`;
- falls back to raw leader execution evidence when StudioNet omits normalized execution metadata;
- performs a single transaction fetch fallback rather than retry-spamming;
- surfaces deterministic revert details when trace data is available;
- re-reads resource and grant state after writes;
- never increments grant count or flips lock state locally;
- locks write buttons while a transaction is in flight;
- keeps loaded resource state across wallet switching;
- supports desktop, tablet and mobile layouts.

## Reviewer-friendly examples

### Semantic positive / exclusive

```text
All sales of the Work in the Territory shall be made through the Distributor.
```

Expected on a fresh resource:

```text
EXCLUSIVE_GRANT
resource → LOCKED
```

This intentionally avoids an explicit “exclusive” keyword.

### Semantic negative / control

```text
The Distributor is named sole distributor, but the Publisher may appoint others at will.
```

Expected on a fresh separate resource:

```text
NON_EXCLUSIVE_GRANT
resource → OPEN
```

This intentionally contains a strong surface cue while preserving unilateral grantor freedom.

## Local gates

```bash
npm run verify:source
npm run check
npm test
npm run build
```

Serve locally:

```bash
npm run dev
```

Then open `http://127.0.0.1:4173`.

## Current verification status

Completed before package export:

- source parity: PASS
- static method/address/lifecycle checks: PASS
- local automated tests: 19/19 PASS
- Python/JavaScript ID derivation parity edge cases: PASS
- Snap-free StudioNet network switch path: static PASS
- CSP/security headers and calldata byte meter: present
- production build: PASS
- desktop/mobile static UI smoke: PASS

Still required before final submission:

- run fresh K1 and R2 semantic probes against this exact deployment/rubric;
- connect actual MetaMask wallets;
- exclusive semantic path;
- deterministic locked-resource second-grant revert;
- holder/non-holder release checks;
- non-exclusive control path;
- wallet switching;
- automatic FINALIZED state refresh;
- clean production console.

Runtime evidence must be recorded only after it is actually observed. The demo examples are not treated as semantic PASS until K1/R2 are observed on this exact address. See `TESTING.md`.

## Honest limitation

A lock applies to exactly one contract-local `resource_id`. GrantLock does not infer whether different resource IDs, names or scope labels overlap in the real world, and `LOCKED` is not a legal-enforceability judgment.
