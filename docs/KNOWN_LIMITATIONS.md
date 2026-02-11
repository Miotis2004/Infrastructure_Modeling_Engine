# Known Limitations (v1)

This document captures known product and engineering limitations for IME v1.

## Product scope limits

- Resource coverage is intentionally limited to the curated v1 schema set.
- Arbitrary Terraform project import is not supported.
- Multi-cloud compilation targets are not yet implemented.

## UI/authoring limits

- Graph editing focuses on core CRUD and reference wiring; advanced ergonomics (undo/redo stacks, multi-select bulk actions, power-user shortcuts) are limited.
- Inspector editing is schema-driven for current resource coverage only.
- Expression authoring support is constrained compared to raw Terraform flexibility.

## Engine/runtime limits

- Validation focuses on static model correctness; it does not execute provider-side runtime checks.
- IME does not orchestrate `terraform plan`/`apply` in v1.
- Drift detection between deployed state and model state is not included.

## Ecosystem limits

- Provider schema auto-discovery is not implemented; schemas are currently curated.
- Policy-as-code and compliance integrations are not bundled by default.

## Suggested mitigations

- Use generated Terraform with standard downstream CI checks.
- Run `terraform validate` and organization policy gates in your deployment pipeline.
- Track roadmap candidates in `docs/NEXT_STEPS.md` for post-v1 planning.
