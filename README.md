# Infrastructure Modeling Engine (IME)

IME is a deterministic, graph-first infrastructure authoring engine. The source of truth is a typed Infrastructure Intermediate Representation (IR), and Terraform is generated as a compilation target.

The repository includes both:
- a reusable **core engine** (IR, validation, compile, export APIs), and
- a runnable **Vite + React UI** for graph authoring, diagnostics, preview, and export.

## Architecture at a Glance

### Core (`src/`)
- **IR model**: typed graph nodes/edges for variables, resources, and outputs.
- **Validation pipeline**: schema, graph, and semantic checks.
- **Compiler**: deterministic Terraform file generation.
- **Export**: deterministic ZIP packaging of generated Terraform files.

### UI (`ui/` + `src/frontend`)
- Interactive graph workspace with create/connect/move/delete flows.
- Schema-driven inspector with type-aware field parsing and metadata hints.
- Live diagnostics with severity grouping and graph focus metadata.
- Terraform preview tabs (`providers.tf`, `main.tf`, `variables.tf`, `outputs.tf`) with copy/download.
- One-click sample architecture reset and export actions.

## Quickstart (Full App)

### Prerequisites
- Node.js **20.11.0+**
- npm **10.2.4+**

### Install
```bash
git clone https://github.com/Miotis2004/Infrastructure_Modeling_Engine.git
cd Infrastructure_Modeling_Engine
npm install
```

### Run the UI locally
```bash
npm run dev
```
Then open the local Vite URL shown in the terminal (usually `http://localhost:5173`).

### Build
```bash
npm run build
```

### Run the compiled Node entrypoint
```bash
npm start
```

## Developer Workflow

### Core checks
```bash
npm run lint
npm run type-check
npm run test
```

### Focused test targets
```bash
npm run test:unit
npm run test:integration
npm run test:ui
npm run test:snapshots
npm run test:snapshot-drift
npm run test:terraform
```

### Terraform fixture output (manual inspection)
```bash
npm run terraform:fixtures
```

## Runtime Targets

- Node/npm support is pinned via `engines` in `package.json`.
- Browser targets are declared in `browserslist` for development and production.

## Public Package Boundaries

IME publishes split entrypoints so engine consumers do not inherit UI runtime concerns:

- `infrastructure_modeling_engine` → `dist/core.js`
- `infrastructure_modeling_engine/frontend` → `dist/frontend.js`
- `infrastructure_modeling_engine/compiler` → `dist/compiler/index.js`
- `infrastructure_modeling_engine/validation` → `dist/validation/index.js`
- `infrastructure_modeling_engine/export` → `dist/export/index.js`

## Documentation

- Architecture + implementation status: [`docs/DESIGN.md`](docs/DESIGN.md)
- Completion and roadmap tracking: [`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md)
- Contribution process: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Release readiness checklist: [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md)
- Known limitations: [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md)

## License

Licensed under the ISC License. See [`LICENSE`](LICENSE).
