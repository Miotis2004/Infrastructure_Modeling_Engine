# IME Release Checklist (v1)

Use this checklist before tagging a release candidate or final v1 release.

## 1) Environment and metadata

- [ ] `package.json` version is set correctly.
- [ ] `engines` values are up to date.
- [ ] README reflects current scripts and workflow.

## 2) Quality gates

Run and verify:

- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] `npm run test:unit`
- [ ] `npm run test:integration`
- [ ] `npm run test:ui`
- [ ] `npm run test:snapshots`
- [ ] `npm run test:snapshot-drift`
- [ ] `npm run test:terraform`

## 3) Product workflow verification

- [ ] Launch app with `npm run dev`.
- [ ] Load sample architecture.
- [ ] Edit graph nodes and edges.
- [ ] Confirm live validation diagnostics update.
- [ ] Confirm Terraform preview updates after valid edits.
- [ ] Export ZIP and verify generated files.

## 4) Documentation and repo hygiene

- [ ] `README.md` current and accurate.
- [ ] `docs/DESIGN.md` reflects implemented architecture.
- [ ] `docs/NEXT_STEPS.md` status is current.
- [ ] `docs/KNOWN_LIMITATIONS.md` reviewed.
- [ ] `CONTRIBUTING.md` reviewed.
- [ ] `LICENSE` present and correct.

## 5) Release artifacts and communication

- [ ] Create release notes summarizing user-visible changes.
- [ ] Call out breaking changes (if any).
- [ ] Call out known limitations and deferred roadmap items.
- [ ] Tag release in source control.
