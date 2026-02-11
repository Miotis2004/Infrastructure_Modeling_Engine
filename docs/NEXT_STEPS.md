# IME Next Steps (Completion Plan)

This document tracks the v1 completion plan from engine-first implementation to release-ready product workflow.

Guiding workflow:

**Model graph in UI → validate in real time → preview Terraform → export project → verify Terraform in CI.**

---

## 1) ✅ Deliver the actual UI application shell
Status: **Completed**.

- Vite + React + TypeScript app runtime is wired.
- Core layout exists (graph, inspector, diagnostics, preview, action bar).
- Sample architecture can be loaded and edited in the running app.

## 2) ✅ Implement graph editing with React Flow-like adapter wiring
Status: **Completed**.

- Graph node/edge edits round-trip through adapter/state boundary.
- Resource/variable/output create-remove-move flows are implemented.
- Deterministic action logging/replay support is documented in UI behavior.

## 3) ✅ Build schema-driven inspector forms
Status: **Completed**.

- Inspector renders schema-derived editable fields.
- Type-aware input parsing and field-level error signaling are implemented.
- `required`, `computed`, `conflictsWith`, and `dependsOn` metadata are surfaced.

## 4) ✅ Wire live validation and diagnostics UX
Status: **Completed**.

- Debounced boundary evaluation is used for live model changes.
- Diagnostics are grouped by severity and include focus metadata.
- Compile/export actions are blocked while validation errors exist.

## 5) ✅ Complete Terraform preview and export workflow
Status: **Completed**.

- Multi-file preview tabs are available with per-file copy/download.
- ZIP export is deterministic and matches preview output.
- One-click “Sample Architecture” reset path is available.

## 6) ✅ Close platform/runtime gaps from design assumptions
Status: **Completed**.

- Runtime dependencies and package exports align with architecture.
- Browser/runtime support is documented in metadata.
- Clean-clone build/test/start workflows are reproducible.

## 7) ✅ Harden CI with Terraform verification and UI checks
Status: **Completed**.

- CI coverage includes Terraform `fmt` and `validate` fixture checks.
- UI contract coverage exists for inspector/diagnostics/boundary integration.
- Determinism checks include snapshots and drift verification.

## 8) ✅ Documentation and release-readiness completion
Status: **Completed in this iteration**.

Completed deliverables:
- README now covers architecture split, full-app quickstart, and developer workflow.
- DESIGN and NEXT_STEPS now reflect implemented state instead of pending work.
- Repository hygiene docs are now present:
  - `LICENSE`
  - `CONTRIBUTING.md`
  - `docs/RELEASE_CHECKLIST.md`
  - `docs/KNOWN_LIMITATIONS.md`

Exit criteria status:
- ✅ New contributor can clone, run, test, and export Terraform using docs only.
- ✅ Documentation no longer lists completed work as pending.
- ✅ Release candidate checklist is documented and traceable.

---

## 9) Post-v1 roadmap candidates

1. Dynamic schema ingestion from provider metadata.
2. Richer graph UX (multi-select, keyboard shortcuts, undo/redo timeline).
3. Additional compiler targets (Pulumi / CloudFormation).
4. Import/migration helpers from existing Terraform projects.
5. Policy-as-code linting integration for pre-export governance.
