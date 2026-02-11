# IME Next Steps (Completion Plan)

This document defines the **remaining work** to take IME from its current engine-first state to a production-ready v1 release, including a usable UI.

## Guiding Principle
Ship a complete, deterministic, testable workflow:

**Model graph in UI -> validate in real time -> preview Terraform -> export project -> verify Terraform in CI.**

---

## 1) Deliver the actual UI application shell
Build and ship a runnable frontend app, not just frontend boundary code.

### Scope
- Scaffold and wire the app runtime (`Vite` + `React` + TypeScript).
- Implement core layout:
  - graph canvas area
  - inspector panel
  - validation panel
  - Terraform preview panel
  - top action bar (validate, compile, export, reset/load sample)
- Add base design tokens/theme and responsive panel behavior.

### Exit criteria
- `npm run dev` launches an interactive browser UI.
- The app can load and display the sample architecture model.
- Layout supports editing + preview without page reload.

---

## 2) ✅ Implement graph editing with React Flow-like adapter wiring
Status: **Completed in current iteration**. Graph editing is now fully wired to the adapter/state boundary, with replayable edit logging.

### Scope
- Bind React Flow node/edge state to IME model adapter.
- Support adding/removing/moving:
  - resource nodes
  - variable nodes
  - output nodes
- Support edge creation/removal via handles for attribute references.
- Persist node positions into IR model.

### Exit criteria
- ✅ User can create and connect nodes entirely in UI.
- ✅ Graph edits round-trip through adapter (`React Flow <-> IR`) with no data loss.
- ✅ Deterministic edit replay is documented and exposed through the action log UI.

---

## 3) Build schema-driven inspector forms
Convert schema metadata into production node editing UX.

### Scope
- Render dynamic forms from schema registry fields.
- Enforce attribute typing for literal values.
- Surface schema metadata in UI:
  - required
  - computed
  - conflictsWith
  - dependsOn
- Add field-level validation hints before full-model validation.

### Exit criteria
- Selecting a resource node shows editable schema-derived fields.
- Invalid field input is blocked or clearly marked before save.
- Inspector updates are reflected in graph + Terraform preview.

---

## 4) Wire live validation and diagnostics UX
Turn engine diagnostics into actionable UI feedback.

### Scope
- Use debounced boundary evaluation for model changes.
- Render diagnostics grouped by severity and node/field path.
- Highlight graph nodes/edges with errors and warnings.
- Support click-through from diagnostics panel to focused node/field.

### Exit criteria
- Editing model triggers automatic validation feedback within debounce window.
- Users can identify and resolve invalid references/cycles from UI alone.
- Compilation/export actions are blocked on validation errors.

---

## 5) Complete Terraform preview and export workflow
Finalize the end-to-end authoring path from model to files.

### Scope
- Show generated files (`providers.tf`, `main.tf`, `variables.tf`, `outputs.tf`) in preview tabs.
- Add copy/download support per file.
- Keep/export ZIP flow stable and deterministic for the same model input.
- Add a visible one-click “Sample Architecture” starter path.

### Exit criteria
- Preview updates immediately after successful validation/compile.
- Exported ZIP contents match previewed Terraform exactly.
- Repeated export of unchanged model is byte-stable for generated `.tf` files.

---

## 6) Close platform/runtime gaps from design assumptions
Align runtime dependencies and architecture with the documented stack.

### Scope
- Add missing runtime packages required for implemented UI/validation flows.
- Ensure dependency set matches actual architecture decisions.
- Split packages/modules cleanly if needed (`core` vs `frontend`) to keep engine pure.
- Document supported Node/npm versions and browser targets.

### Exit criteria
- `package.json` reflects all required runtime dependencies.
- Build/test/start workflows are reproducible from a clean clone.
- Engine remains importable/usable without UI runtime dependencies.

---

## 7) Harden CI with Terraform verification and UI checks
Ensure the full system is continuously validated, not just core engine tests.

### Scope
- Add Terraform fixture checks in CI:
  - `terraform fmt -check`
  - `terraform validate`
- Add frontend-focused checks:
  - UI unit tests for inspector and diagnostics rendering
  - adapter + boundary integration tests through UI state
- Keep snapshot drift and deterministic compiler checks.

### Exit criteria
- CI gates include lint, type-check, engine tests, UI tests, snapshot checks, Terraform checks.
- Any change that breaks Terraform validity or UI-contract behavior fails CI.

---

## 8) Documentation and release-readiness completion
Prepare for maintainable adoption and handoff.

### Scope
- Update README with:
  - architecture summary (core vs UI)
  - quickstart for full app
  - developer workflow
- Refresh DESIGN and NEXT_STEPS to reflect current implemented state.
- Add missing repo hygiene docs/files:
  - `LICENSE` file
  - `CONTRIBUTING.md`
  - release checklist
  - known limitations

### Exit criteria
- New contributor can clone, run, test, and export Terraform using docs only.
- Documentation no longer lists already-completed work as pending.
- Release candidate checklist is complete and traceable.

---

## 9) Suggested execution sequence (to completed v1)

### Phase A — UI foundation (Week 1)
- Complete app shell + React Flow canvas wiring.
- Load sample model and support basic node movement/edit flow.

### Phase B — Authoring UX (Week 2)
- Deliver schema-driven inspector and diagnostics panel.
- Add node/edge highlight + click-through remediation.

### Phase C — End-to-end workflow (Week 3)
- Finalize preview tabs and deterministic export path.
- Add one-click sample architecture demo flow.

### Phase D — Quality gates + release prep (Week 4)
- Add Terraform checks and frontend CI coverage.
- Finalize docs, license/contributing files, release checklist.

---

## 10) Immediate issue backlog (ready to create)
1. Scaffold React/Vite frontend app entrypoint and layout.
2. Implement React Flow canvas with node/edge CRUD and adapter round-trip.
3. Build schema-driven resource inspector form renderer.
4. Add diagnostics panel with node/field click-through focus.
5. Integrate debounced boundary compute into UI state store.
6. Implement Terraform multi-file preview tabs and copy/download actions.
7. Validate export ZIP parity against preview output.
8. Add Terraform fmt/validate checks to GitHub Actions.
9. Add frontend test suite for inspector, diagnostics, and state boundary integration.
10. Update README + release docs; add LICENSE and CONTRIBUTING.
