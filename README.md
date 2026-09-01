# GrantLock

**Semantic exclusivity, deterministic enforcement.**

GrantLock is a production frontend for the steward-accepted `ExclusivityLock` GenLayer Intelligent Contract source. The frontend name is intentionally different from the contract class; the contract source is preserved byte-for-byte.

## Production deployment

- Project/frontend: `GrantLock`
- Contract class: `ExclusivityLock`
- Network: GenLayer StudioNet
- Contract: `0x7cDcdE83B2a5192ACC00412cf192684c951081cc`
- Explorer: `https://explorer-studio.genlayer.com/address/0x7cDcdE83B2a5192ACC00412cf192684c951081cc`
- Production app: `https://grant-lock.vercel.app/`
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

Release is deterministic:

```text
exclusive holder only
LOCKED → OPEN
current holder fields cleared
historical grant retained
```

V1 does not allow a new exclusive grant after prior grant history exists.

## Roles

- `create_resource`: any wallet; caller becomes resource creator.
- `submit_grant`: resource creator only.
- `release_exclusivity`: recorded exclusive-holder wallet only.
- views: public.
- no global admin or deployer privilege.

No test wallet is hardcoded into the contract or frontend.

## Frontend behavior

The production UI is evidence-first:

- binds the fresh StudioNet contract address directly;
- connects MetaMask and requests StudioNet only when a write requires it;
- derives resource/grant IDs from the contract's deterministic domain-separated formulas;
- waits for `FINALIZED`;
- distinguishes `FINISHED_WITH_RETURN` from `FINISHED_WITH_ERROR`;
- qualifies leader-receipt-only execution evidence rather than presenting it as validator consensus;
- re-reads accepted contract state after writes;
- never increments grant count or changes lock state locally;
- blocks duplicate writes while one is in flight;
- preserves loaded resource context across wallet switching;
- guards creator-only grant submission when the loaded resource state proves the connected wallet is not the creator;
- does not call unsupported StudioNet debug-trace RPCs;
- supports desktop, tablet and mobile layouts.

## Reviewer examples

### K1 — semantic exclusive case

```text
All sales of the Work in the Territory shall be made through the Distributor.
```

Observed on a fresh resource at the production deployment:

```text
EXCLUSIVE_GRANT
resource → LOCKED
grant_count = 1
exclusive holder recorded
```

This intentionally avoids an explicit `exclusive` keyword.

### R2 — semantic control case

```text
The Distributor is named sole distributor, but the Publisher may appoint others at will.
```

Observed on a separate fresh resource:

```text
NON_EXCLUSIVE_GRANT
resource → OPEN
grant_count = 1
current holder = None
```

This intentionally contains a strong surface cue while preserving unilateral grantor freedom.

## Production runtime verification

Observed on `https://grant-lock.vercel.app/` against the exact contract above:

- K1 semantic classification: **PASS** — `EXCLUSIVE_GRANT`.
- Deterministic consequence: **PASS** — resource became `LOCKED`, grant count stayed authoritative on-chain, holder recorded.
- Later grant on the locked resource: **PASS** — finalized with execution error and did not append a grant or change lock state.
- Non-holder release authorization: **PASS by unchanged contract state** — resource remained locked until the recorded holder acted.
- Holder release: **PASS** — resource returned to `OPEN`, holder cleared, historical exclusive grant remained.
- R2 semantic classification: **PASS** — `NON_EXCLUSIVE_GRANT`.
- R2 consequence: **PASS** — resource remained `OPEN`, grant count became `1`, current holder stayed `None`.
- Wallet switching and state re-read: **PASS**.
- Manual refresh after writes: **not required**.
- Production console smoke after clearing prior logs and re-inspecting accepted state: **PASS**; no new GrantLock/GenLayer error was emitted.

See `TESTING.md` for exact observed evidence and separation between semantic, deterministic and frontend gates.

## Local gates

```bash
npm install
npm run verify:source
npm run check
npm test
npm run build
```

Expected current automated result: **23/23 tests PASS**.

Serve locally:

```bash
npm run dev
```

Then open `http://127.0.0.1:4173`.

## Honest limitation

A lock applies to exactly one contract-local `resource_id`. GrantLock does not infer whether different resource IDs, names or scope labels overlap in the real world, and `LOCKED` is not a legal-enforceability judgment.
