# GrantLock

**Semantic exclusivity, deterministic enforcement.**

GrantLock is a production frontend for the steward-accepted `ExclusivityLock` GenLayer Intelligent Contract source. The frontend name is intentionally different from the contract class; the deployed contract source remains byte-for-byte unchanged.

## Production deployment

- Project/frontend: `GrantLock`
- Contract class: `ExclusivityLock`
- Network: GenLayer StudioNet (`61999`, py-genlayer `v0.2`)
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

The semantic question is whether the grant establishes the declared relationship and removes the grantor's unilateral freedom to confer the same grant over the same contract-local resource scope to another grantee while the grant remains in force. AI decides only that semantic classification.

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

Release is deterministic and holder-only:

```text
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

## Frontend safety and transaction truth

The production UI:

- binds the final StudioNet address directly;
- derives resource/grant IDs from the contract's domain-separated formulas;
- waits for `FINALIZED`, checks the GenVM result, and re-reads accepted state;
- never increments grant count or changes lock state locally;
- blocks duplicate writes while one is in flight;
- preserves loaded resource context across wallet switching;
- blocks a proven wrong creator before signing;
- shows the full 42-character grantee wallet before every grant;
- requires an explicit acknowledgement that only that exact wallet can release an exclusive lock;
- warns separately when the grantee matches the connected creator;
- states that the contract has no admin, creator override, or recovery path;
- escapes untrusted labels and grant text before rendering history.

Changing the grantee wallet invalidates the acknowledgement and disables signing again. The confirmation gate is tested with a transaction spy: no send callback runs before confirmation.

## Semantic evaluation set

The earlier validation deployment contains a four-case historical run. The final-deployment evidence plan now uses ten cases with four adversarial pairs, including an identical opening clause with opposite expected labels. These cases are listed in `TESTING.md` and the Intelligent Contract package's `RUNTIME_EVIDENCE.md`.

Until every final-deployment row contains a real transaction hash, resource ID, Explorer URL, and observed verdict, that row is marked `NOT RUN`. The repository does not claim that the expanded ten-case set has already proved semantic rather than lexical behavior.

## Automated test classification

The current offline suite is separated honestly:

- **Behaviour tests: 24/24** — deterministic ID parity, Keccak vectors, source identity invariants, wallet validation, confirmation gating, no-send-before-confirmation, and HTML escaping.
- **Source guards: 10/10** — static integration markers that detect frontend/client drift; these do not execute Intelligent Contract behavior.
- **Total: 34/34**.

Run all five offline gates:

```bash
npm ci
npm run verify:source
npm run check
npm test
npm run build
```

`npm run verify:source` is also the first project-specific CI gate. It automatically rejects any change to the frozen deployed source before the remaining checks run.

Serve locally:

```bash
npm run dev
```

Then open `http://127.0.0.1:4173`.

## Runtime evidence policy

`PASS` is reserved for an observed on-chain row that includes its exact transaction hash and Explorer URL. Missing evidence is written as `NOT RUN`; prior prose recollections are not promoted to verifiable runtime proof. See `TESTING.md` for the handoff tables.

## Known limitations

1. **The deployed source does not include a `# v0.2.16` runtime marker.** Adding even a comment would change the published SHA256 and require redeployment. The current source remains frozen; the marker should only be added during a future release that already requires a new deployment.
2. **`resource_id` does not include `scope_label`.** One creator cannot create the same resource name twice with different scopes; the second call reverts as an existing resource. Use distinct resource names for separate scopes. Changing the contract docstring or ID formula would change the frozen source and is intentionally outside this release.
3. A lock applies to exactly one contract-local `resource_id`. GrantLock does not infer whether different IDs overlap in the real world, map wallets to legal identities, or determine legal enforceability.
4. A mistyped holder wallet can make an exclusive lock unrecoverable. The frontend confirmation materially reduces this risk but cannot change the contract's no-admin design.

## License

MIT. See `LICENSE`.
