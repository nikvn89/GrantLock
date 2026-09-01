# GrantLock Testing

This file separates static/build evidence from fresh StudioNet/Vercel runtime evidence.

## Deployment identity

```text
Network: GenLayer StudioNet
Contract: 0x7cDcdE83B2a5192ACC00412cf192684c951081cc
Source SHA256: c82e52db2b1c3e0192db8212f08cc42ad749388e2cc1b8fa1da7733b0d04e3d3
```

## A. Local gates

Run:

```bash
npm run verify:source
npm run check
npm test
npm run build
```

Required outcomes:

- source SHA parity PASS;
- all three writes and all public state views represented in frontend integration;
- fresh deployment address bound;
- GenLayerJS version pinned;
- FINALIZED lifecycle handling present;
- FINISHED_WITH_RETURN / FINISHED_WITH_ERROR split present;
- wallet switching listeners present;
- double-send guard present;
- no test wallet hardcoding;
- production build emits all public/source assets.

Status at Vercel-ready export: **PASS**.

## B. Runtime wallet mapping — confirm before writes

Do not reuse a wallet mapping by assumption. Record:

```text
Wallet 1 — resource creator: TBD
Wallet 2 — proposed grantee / exclusive holder: TBD
Optional Wallet 3 — non-holder negative release: TBD
```

Wallets are runtime-only and must never be committed into source.


## B0. Semantic pre-gate for this exact deployment

Before using the demo path as reviewer evidence, run both probes against `0x7cDcdE83B2a5192ACC00412cf192684c951081cc` on fresh resources:

1. **K1 / exclusive-without-keyword:** `All sales of the Work in the Territory shall be made through the Distributor.`
   - expected: `EXCLUSIVE_GRANT`
   - deterministic consequence: resource becomes `LOCKED`.
2. **R2 / explicit override control:** `The Distributor is named sole distributor, but the Publisher may appoint others at will.`
   - expected: `NON_EXCLUSIVE_GRANT`
   - deterministic consequence: resource remains `OPEN`.

If K1 returns `NON_EXCLUSIVE_GRANT`, STOP. Do not open the frontend submission gate and do not modify the accepted contract merely to force the expected answer.

## C. Exclusive semantic + deterministic lock path

1. Connect Wallet 1.
2. Load the resource example and create a fresh resource.
3. Wait for `FINALIZED` and confirm execution is `FINISHED_WITH_RETURN`.
4. Confirm accepted state:

```text
state = OPEN
grant_count = 0
```

5. In Submit grant, use that resource ID.
6. Set `grantee_wallet` to Wallet 2 and label to `Distributor`.
7. Load **Exclusive example**:

```text
All sales of the Work in the Territory shall be made through the Distributor.
```

8. Submit once; wait for FINALIZED + successful GenVM execution.
9. Confirm actual contract state:

```text
verdict = EXCLUSIVE_GRANT
state = LOCKED
grant_count = 1
exclusive_holder_wallet = Wallet 2
```

### Deterministic tooth

10. Keep Wallet 1 connected.
11. On the same locked resource, change grant text and attempt another grant.
12. Expected:

```text
FINALIZED
FINISHED_WITH_ERROR
Resource is locked by an exclusive grant
```

13. Confirm resource remains LOCKED and grant_count remains 1.

No second semantic verdict should be fabricated for the blocked call.

## D. Release authorization

Preferred three-wallet test if available:

1. Wallet 3/non-holder attempts `release_exclusivity`.
2. Expected FINALIZED + `FINISHED_WITH_ERROR`:

```text
Only exclusive holder may release exclusivity
```

3. Switch to Wallet 2/recorded holder.
4. Release exclusivity.
5. Expected FINALIZED + `FINISHED_WITH_RETURN`.
6. Re-read resource:

```text
state = OPEN
locked = false
grant_count = 1
exclusive holder fields = empty
```

Historical grant remains visible.

If only two wallets are available, Wallet 1 can serve as the non-holder negative attempt before Wallet 2 releases.

## E. Non-exclusive semantic control

Use a **fresh separate resource** with Wallet 1 as creator.

Submit:

```text
The Distributor is named sole distributor, but the Publisher may appoint others at will.
```

Expected:

```text
verdict = NON_EXCLUSIVE_GRANT
state = OPEN
grant_count = 1
```

This is the anti-keyword negative case.

## F. Prior-history invariant after release

On the resource that was released in section D:

1. As creator, submit a clearly non-exclusive grant; expected success and grant_count 2.
2. Submit text that semantically resolves to EXCLUSIVE_GRANT.
3. Expected rollback after semantic classification:

```text
Exclusive grant requires a resource with no prior grants
```

The resource remains OPEN and history remains intact.

## G. Frontend/runtime gates

During the above paths verify:

- no manual F5 is required after a transaction;
- loaded resource survives wallet switching;
- buttons prevent double-send while busy;
- explorer links point to the fresh deployment/tx;
- execution errors are shown as errors, not success;
- no local fabricated lock/count changes;
- desktop layout is readable;
- mobile layout is usable;
- production console has no red errors or retry spam.

## H. Runtime status

At Vercel-ready export:

```text
STATIC CHECK: PASS
SOURCE PARITY: PASS
PRODUCTION BUILD: PASS
AUTOMATED TESTS: 19/19 PASS
SEMANTIC K1/R2 ON THIS DEPLOYMENT: PENDING
FRESH VERCEL RUNTIME E2E: PENDING
```

Do not change `PENDING` to `PASS` until the current deployed Vercel build has been observed through both semantic branches and the deterministic lock/release consequences.
