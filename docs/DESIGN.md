# Infrastructure Modeling Engine (IME) — Design & Implementation Status

**Version:** 1.0 release candidate  
**Language:** TypeScript  
**Primary target:** Terraform HCL

## 1) Executive summary

IME is a deterministic, graph-based infrastructure modeling system.

- Users edit infrastructure as a typed directed graph (IR).
- Validation runs against the IR (not against generated text).
- Terraform files are compiled from validated graph state.
- The repository ships both engine APIs and a runnable React UI.

The IR remains the single source of truth.

## 2) Architecture (core vs UI)

## 2.1 Core engine (`src/`)

### IR layer
- Defines infrastructure model primitives:
  - variables
  - resources
  - outputs
  - reference edges
- Stores node layout coordinates for UI round-tripping.

### Validation layer
- Schema validation (required fields, type checks, metadata constraints).
- Graph validation (orphan references, cycles, invalid endpoints).
- Semantic validation for domain rules.
- Produces diagnostics with severity/path metadata.

### Compiler layer
- Deterministically renders:
  - `providers.tf`
  - `main.tf`
  - `variables.tf`
  - `outputs.tf`
- Uses stable ordering and formatting constraints.

### Export layer
- Emits deterministic ZIP packages from compiler outputs.
- Ensures preview/export parity for unchanged inputs.

## 2.2 Frontend boundary + app (`src/frontend`, `ui/`)

- Adapter functions map IR ↔ graph view model.
- Boundary evaluation projects engine diagnostics into UI-friendly shape.
- React app provides:
  - graph editing for variables/resources/outputs
  - schema-driven inspector forms
  - diagnostics panel with click-through focus
  - Terraform preview tabs with copy/download
  - one-click sample model reset and export

## 3) Determinism guarantees

IME v1 enforces deterministic behavior by design:

- Stable resource/key ordering in generated Terraform.
- No random IDs in compiled artifacts.
- Deterministic fixture generation and snapshot drift checks.
- Exported `.tf` contents are byte-stable for unchanged model inputs.

## 4) Runtime and packaging assumptions

- Node/npm runtime minimums are declared in `package.json` `engines`.
- Browser compatibility targets are declared in `browserslist`.
- Package exports are split so consumers can import core-only APIs.

## 5) Quality gates

Expected checks for release candidates:

- Type checking and lint-equivalent checks (`tsc --noEmit`).
- Unit, integration, UI, and snapshot tests.
- Snapshot drift verification.
- Terraform fixture checks:
  - `terraform fmt -check`
  - `terraform validate`

## 6) Current implementation status (v1 scope)

All v1 plan items from `docs/NEXT_STEPS.md` Steps 1–8 are now completed, including:

- runnable UI shell and graph workflow,
- schema-driven inspector,
- live diagnostics UX,
- Terraform preview/export,
- CI hardening with Terraform verification,
- release-readiness documentation set.

## 7) Non-goals for v1 (unchanged)

- Full provider auto-discovery.
- Arbitrary Terraform import/migration.
- Multi-cloud compilation targets.
- Runtime `terraform plan/apply` orchestration.
- AI-generated edits as a default workflow.

## 8) Post-v1 extension directions

- Dynamic provider schema ingestion.
- Additional compiler targets (Pulumi/CloudFormation).
- Plan/diff overlays on graph state.
- Guided AI assistance operating strictly on IR with validation gating.
