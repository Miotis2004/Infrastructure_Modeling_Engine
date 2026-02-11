# IME Next Steps (Post-Design v0.1)

This document translates the current design into an execution-oriented plan.

## 1) Establish a v1 baseline (Milestone 1 hardening)
- Finalize `InfrastructureModel` and node/edge types in code.
- Freeze a minimal schema registry for the initial AWS resource set:
  - `aws_vpc`, `aws_subnet`, `aws_security_group`, `aws_instance`, `aws_s3_bucket`
- Define a canonical sample model fixture used across validation/compiler tests.

## 2) Build validation as a standalone package
- Implement validation pipeline stages in order:
  1. Schema validation
  2. Graph validation (cycle + orphan reference detection)
  3. Semantic validation for AWS-specific constraints
- Add machine-readable diagnostics (`code`, `message`, `path`, `severity`) so the UI can render precise errors.
- Add tests for every rule using table-driven cases.

## 3) Implement deterministic compiler with snapshot guarantees
- Build a normalized IR-to-AST transformation before string rendering.
- Enforce deterministic ordering rules centrally (resources, keys, blocks).
- Generate `providers.tf`, `main.tf`, `variables.tf`, `outputs.tf`.
- Add snapshot tests and determinism tests (same input => byte-identical output).

## 4) Connect the frontend to the engine through a strict boundary
- Keep engine pure (no UI dependencies).
- Add an adapter layer for React Flow <-> IR translation.
- Implement node inspector forms from schema metadata (required, computed, conflicts).
- Wire live validation + Terraform preview with debounced recompute.

## 5) Ship export and demo workflow ✅
- Implement export-to-ZIP for generated Terraform project files.
- Include a one-click “sample architecture” template for demos.
- Validate generated output with `terraform fmt -check` and `terraform validate` in CI (for fixtures).

## 6) Raise confidence with test and quality gates ✅
- Unit tests: type checks, cycle detection, reference resolution.
- Integration tests: model -> validation -> compile output.
- Golden/snapshot tests for HCL rendering.
- CI gate: lint, type-check, unit/integration tests, snapshot drift checks.

## 7) Prepare for v1.1 extensibility (without overbuilding) ✅
- Define extension points now:
  - schema registry loader interface ✅
  - compiler interface ✅
- Keep dynamic schema loading and multi-target compilation behind feature flags ✅
- Track unsupported schema constructs explicitly to avoid silent failures ✅

## 8) Suggested 6-week execution sequence ✅

### Week 1 — IR foundation and schema baseline
**Primary outcomes**
- Land `InfrastructureModel` core types and canonical node/edge contracts.
- Add static AWS schema registry for the initial five resources.
- Add shared fixture models used by validation + compiler tests.

**Exit criteria**
- Baseline model types are committed and consumed by both validator and compiler entry points.
- Fixture set includes at least one valid model and one intentionally-invalid model.

### Week 2 — Validation pipeline and diagnostics
**Primary outcomes**
- Implement validation stages in strict order: schema -> graph -> semantic.
- Introduce machine-readable diagnostics (`code`, `message`, `path`, `severity`).
- Add table-driven tests for each rule and failure mode.

**Exit criteria**
- Validation returns stable, structured diagnostics for all known invalid fixtures.
- Unit tests cover both positive and negative cases across all three stages.

### Week 3 — Deterministic compiler core
**Primary outcomes**
- Build normalized IR -> AST compiler pipeline.
- Implement deterministic ordering policy for resources/keys/blocks.
- Generate `providers.tf`, `main.tf`, `variables.tf`, and `outputs.tf`.

**Exit criteria**
- Snapshot tests pass for generated Terraform files.
- Determinism check confirms identical bytes for repeated same-input compilations.

### Week 4 — Frontend/engine integration
**Primary outcomes**
- Add strict adapter boundary between React Flow graph state and IR.
- Implement schema-driven node inspector forms.
- Wire debounced live validation and Terraform preview updates.

**Exit criteria**
- Editing a node updates IR, validation panel, and preview without manual refresh.
- Integration tests cover adapter translation and live validation flow.

### Week 5 — Export and demo readiness
**Primary outcomes**
- Deliver export-to-ZIP of generated Terraform project structure.
- Add one-click sample architecture template for demos.
- Validate generated fixture output with `terraform fmt -check` and `terraform validate` in CI.

**Exit criteria**
- Demo path runs end-to-end from sample load -> preview -> ZIP export.
- CI runs Terraform format/validate checks for fixture-generated outputs.

### Week 6 — Stabilization and release candidate
**Primary outcomes**
- Harden CI gates (lint, type-check, tests, snapshots, Terraform checks).
- Close high-priority bugs and reduce flaky tests.
- Finalize docs and publish v1 release-candidate checklist.

**Exit criteria**
- CI is green on main with required gates enforced.
- Release notes + known limitations + rollback strategy are documented.

## 9) Immediate backlog items (ready to create as issues)
1. Implement `InfrastructureModel` and node typing package.
2. Add static AWS schema registry with five initial resources.
3. Implement graph cycle detection with clear diagnostics.
4. Implement reference resolver and invalid-reference validator.
5. Build Terraform renderer with stable ordering.
6. Add snapshot suite for generated `.tf` output.
7. Build React Flow graph adapter and Zustand store contract.
8. Implement node inspector driven by schema metadata.
9. Implement export-to-ZIP pipeline.
10. Add CI workflow for lint/type/test/snapshots.
