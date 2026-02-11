# Contributing to Infrastructure Modeling Engine (IME)

Thanks for your interest in contributing.

## Development setup

1. Install prerequisites:
   - Node.js `>=20.11.0`
   - npm `>=10.2.4`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the UI:
   ```bash
   npm run dev
   ```

## Required checks before opening a PR

Run the full local gate:

```bash
npm run test
```

At minimum, contributors should run:

```bash
npm run lint
npm run type-check
npm run test:unit
npm run test:integration
npm run test:ui
npm run test:snapshots
npm run test:snapshot-drift
```

If Terraform is installed locally, also run:

```bash
npm run test:terraform
```

## Contribution guidelines

- Keep engine determinism intact (stable ordering, no random compile output).
- Preserve core/frontend boundaries (`src/` vs `src/frontend` + `ui/`).
- Prefer small, focused pull requests.
- Update documentation when behavior or workflows change.
- Add or update tests for any behavior changes.

## Commit and PR guidance

- Use descriptive commit messages in imperative form.
- In PR descriptions, include:
  - What changed
  - Why it changed
  - How it was tested
  - Any known limitations or follow-up work

## Reporting issues

When filing issues, include:

- reproduction steps
- expected vs actual behavior
- environment details (Node/npm/Terraform versions)
- relevant logs/screenshots
