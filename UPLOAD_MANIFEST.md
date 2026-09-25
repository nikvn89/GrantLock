# GitHub web upload manifest

Upload these paths to the existing `GrantLock` repository with **Add file → Upload files**. The directory names in this package already match the repository destinations.

## Add

- `.github/workflows/ci.yml`
- `LICENSE`
- `UPLOAD_MANIFEST.md`
- `src/safety.js`
- `tests/frontend-safety.test.mjs`
- `tests/source-contract-guards.test.mjs`
- `docs/evidence/README.md`
- `docs/evidence/grantee-wallet-confirmation.png` — add only after the real post-deployment screenshot is captured

## Replace

- `README.md`
- `TESTING.md`
- `CHANGELOG.md`
- `index.html`
- `package.json`
- `src/app.js`
- `src/styles.css`
- `tests/id-parity.test.mjs`

## Delete manually on GitHub

- `tests/integration-contract.test.mjs`

It was renamed to `tests/source-contract-guards.test.mjs`. Keeping both would run duplicate source guards and misstate the test totals.

## Do not upload or change

- `contracts/ExclusivityLock.py`
- `scripts/verify-source.mjs`
- generated `dist/`
- `node_modules/`
- transaction hashes or verdicts that were not actually observed

After upload, wait for `.github/workflows/ci.yml` to complete and save the immutable Actions run URL. The source-parity job must print:

```text
SOURCE PARITY PASS c82e52db2b1c3e0192db8212f08cc42ad749388e2cc1b8fa1da7733b0d04e3d3
```
