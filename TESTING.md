# GrantLock Testing

This document separates offline behaviour tests, source guards, transaction finality, GenVM execution, semantic verdicts, deterministic consequences, and browser checks. A runtime row is never marked `PASS` without its exact transaction hash and Explorer URL.

## A. Deployment identity

| Field | Value |
|---|---|
| Network | GenLayer StudioNet (`61999`, py-genlayer `v0.2`) |
| Final contract | `0x7cDcdE83B2a5192ACC00412cf192684c951081cc` |
| Explorer | `https://explorer-studio.genlayer.com/address/0x7cDcdE83B2a5192ACC00412cf192684c951081cc` |
| Production | `https://grant-lock.vercel.app/` |
| Source SHA256 | `c82e52db2b1c3e0192db8212f08cc42ad749388e2cc1b8fa1da7733b0d04e3d3` |

## B. Offline gates — executed 2026-09-25

| Gate | Command | Observed result |
|---|---|---|
| Source identity | `npm run verify:source` | `SOURCE PARITY PASS c82e52db…e3c3` |
| Static checks | `npm run check` | `STATIC CHECK PASS` |
| Behaviour tests | `node --test tests/id-parity.test.mjs tests/keccak.test.mjs tests/source-parity.test.mjs tests/frontend-safety.test.mjs` | `24/24 PASS` |
| Source guards | `node --test tests/source-contract-guards.test.mjs` | `10/10 PASS` |
| Full suite | `npm test` | `34/34 PASS` |
| Production build | `npm run build` | `PRODUCTION BUILD PASS` |

`tests/source-contract-guards.test.mjs` checks source markers and integration wiring. It does not execute Intelligent Contract behaviour. The behaviour group covers deterministic ID parity, Keccak vectors, frozen-source invariants, wallet validation, confirmation gating, no-send-before-confirmation, and history escaping.

## C. Final-deployment deterministic flow

Use `Normal (Full Consensus)`. Replace `NOT RUN` only after the exact transaction is finalized and its accepted state has been re-read.

| Ca | Wallet | resource_id | tx hash | Explorer | Kết quả quan sát |
|---|---|---|---|---|---|
| C1 — create K1 resource | creator | `15f8407650c400147ed3499046a2b70c0eeb9ce3696737952cdd841d58e0c491` | full hash not recorded | final contract Explorer + screenshot | Observed finalized `SUCCESS` / `Accepted`; not labelled `PASS` without the full hash |
| C2 — K1 grant → expected EXCLUSIVE/LOCKED | creator | `15f8407650c400147ed3499046a2b70c0eeb9ce3696737952cdd841d58e0c491` | full hash not recorded | final contract Explorer + screenshots | Observed `EXCLUSIVE_GRANT`, `LOCKED`, count `1`, recorded holder; not labelled `PASS` without the full hash |
| C3 — second grant while LOCKED → expected execution error | creator | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| C4 — release by non-holder → expected authorization error | non-holder | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| C5 — release by recorded holder → expected OPEN | holder | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| C6 — non-exclusive grant after release → expected OPEN/count +1 | creator | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| C7 — exclusive verdict after prior history → expected rollback | creator | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| C8 — create R2 resource | creator | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| C9 — R2 grant → expected NON_EXCLUSIVE/OPEN | creator | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` |

**C3 is the primary deterministic-lock proof.** Its evidence is incomplete until the transaction hash, resource ID, finalized execution error, and unchanged accepted state are recorded.

## D. Ten-case semantic matrix on the final address

Every row must use a fresh resource with `grant_count = 0`. Record the first run honestly; do not repeat a case merely to obtain the expected verdict.

| Ca | Wallet | resource_id | tx hash | Explorer | Kết quả quan sát |
|---|---|---|---|---|---|
| E1 — `All sales of the Work in the Territory shall be made through the Distributor.` | creator | `15f8407650c400147ed3499046a2b70c0eeb9ce3696737952cdd841d58e0c491` | full hash not recorded | final contract Explorer + screenshots | Observed `EXCLUSIVE_GRANT`; not labelled `PASS` without the full hash |
| N5 — `All sales of the Work in the Territory shall be made through the Distributor or any other agent the Publisher selects.` | creator | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` (expected `NON_EXCLUSIVE_GRANT`) |
| E2 — `The Publisher may appoint another distributor only with the Distributor's consent.` | creator | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` (expected `EXCLUSIVE_GRANT`) |
| N3 — `The Distributor is granted exclusive rights to promote the Work; appointment of additional distributors requires no consent.` | creator | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` (expected `NON_EXCLUSIVE_GRANT`) |
| E3 — `The Distributor is appointed for the Territory. The Publisher retains full discretion over pricing, but may not appoint a second distributor for the Territory during the term.` | creator | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` (expected `EXCLUSIVE_GRANT`) |
| N2 — `The Publisher may appoint another distributor at its own discretion.` | creator | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` (expected `NON_EXCLUSIVE_GRANT`) |
| E4 — `The Distributor is appointed for the Territory and no party other than the Distributor shall be permitted to sell the Work there.` | creator | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` (expected `EXCLUSIVE_GRANT`) |
| N1 — `The Distributor is named sole distributor, but the Publisher may appoint others at will.` | creator | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` (expected `NON_EXCLUSIVE_GRANT`) |
| E5 — `The Distributor is appointed for the Territory, and the Publisher's right to appoint additional distributors is suspended for the duration of this appointment.` | creator | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` (expected `EXCLUSIVE_GRANT`) |
| N4 — `The Publisher shall not appoint another distributor without first notifying the Distributor.` | creator | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` (expected `NON_EXCLUSIVE_GRANT`) |

The E1/N5 opening clause is identical and the expected labels differ only because N5 preserves another appointment path. The full matrix was designed to remove the accidental single-token separation in the earlier four-case set. It is a test plan, not completed proof, until the table contains real hashes and observed labels.

## E. Frontend safety evidence

| Ca | Wallet | resource_id | tx hash | Explorer | Kết quả quan sát |
|---|---|---|---|---|---|
| Invalid or zero grantee blocked | local test | N/A | N/A | N/A | `PASS` — behaviour test |
| Submit disabled before acknowledgement | local test | N/A | N/A | N/A | `PASS` — behaviour test |
| No transaction callback before acknowledgement | local test | N/A | N/A | N/A | `PASS` — behaviour test with send spy count `0` |
| Exact confirmed wallet enables one callback | local test | N/A | N/A | N/A | `PASS` — behaviour test with send spy count `1` |
| Creator-as-grantee warning state | local test | N/A | N/A | N/A | `PASS` — behaviour test |
| `<script>` in label and grant history text escaped | local test | N/A | N/A | N/A | `PASS` — behaviour test |
| Confirmation UI screenshot | production browser | N/A | N/A | [`grantee-wallet-confirmation.png`](docs/evidence/grantee-wallet-confirmation.png) | `PASS` — complete wallet, warning, acknowledgement, and enabled action captured |

## F. Production browser/runtime checks

| Ca | Wallet | resource_id | tx hash | Explorer | Kết quả quan sát |
|---|---|---|---|---|---|
| Production confirmation step displayed | creator | N/A | N/A | `https://grant-lock.vercel.app/` + screenshot | `PASS` — deployed confirmation guard captured |
| Wallet switching preserves loaded state | creator/holder | `NOT RUN` | N/A | `https://grant-lock.vercel.app/` | `NOT RUN` after this update |
| Authoritative accepted-state reread | creator/viewer | `15f8407650c400147ed3499046a2b70c0eeb9ce3696737952cdd841d58e0c491` | N/A | [`final-locked-exclusive-grant.png`](docs/evidence/final-locked-exclusive-grant.png) | `PASS` — `LOCKED`, count `1`, `EXCLUSIVE_GRANT`, exact holder, append-only history |
| Console smoke after accepted-state read | viewer | `NOT RUN` | N/A | `https://grant-lock.vercel.app/` | `NOT RUN` — no console capture included |

## G. Evidence status summary

| Evidence family | Status | Reason |
|---|---|---|
| Frozen source parity | `PASS` | Exact SHA verified locally |
| Offline static/build gates | `PASS` | Commands executed on 2026-09-25 |
| Behaviour tests | `24/24 PASS` | Executed locally |
| Source guards | `10/10 PASS` | Executed locally; not runtime proof |
| Final-address deterministic flow | `PARTIAL` | C1/C2 and accepted state captured; full transaction hashes were not recorded |
| Final-address ten-case semantic matrix | `NOT RUN` | Requires ten fresh resources and transactions |
| Updated production browser smoke | `PARTIAL PASS` | Confirmation and accepted-state reread captured; wallet-switch and console checks remain open |

## H. Not claimed

| Claim | Status | Note |
|---|---|---|
| Ten-case semantic-not-lexical proof on the final address | `NOT RUN` | Do not claim until all ten rows are populated |
| Exhaustive equivalence across distinct real-world rights | Not claimed | Outside the contract's resource-local scope |
| Legal enforceability | Not claimed | `LOCKED` is only contract-local enforcement |
| Runtime pin added to deployed source | Not changed | Would change SHA and require redeployment |
| Scope label included in resource identity | Not implemented | Use distinct resource names for separate scopes |
