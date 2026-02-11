# Infrastructure Modeling Engine (IME)

The Infrastructure Modeling Engine (IME) is a deterministic, graph-based infrastructure modeling system that compiles structured infrastructure models into Terraform HCL projects.

It models infrastructure as a validated directed graph (Intermediate Representation), treating Terraform HCL as a compilation target rather than the source of truth.

## Features

- **Typed Infrastructure Modeling**: Strong typing for infrastructure components.
- **Static Validation**: Validates dependencies and types before compilation.
- **Deterministic Output**: Generates consistent and predictable Terraform HCL.
- **Visual Interface**: React + Vite graph authoring workspace with inspector, diagnostics, preview, and export actions.
- **Exportable Projects**: Compiles to standard Terraform projects.

## Documentation

For detailed technical specifications, architecture overview, and design decisions, please refer to the [Design Document](docs/DESIGN.md).
For execution planning based on the current design, see [Next Steps](docs/NEXT_STEPS.md).

## Getting Started

### Prerequisites

- Node.js **20.11.0+**
- npm **10.2.4+**

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Miotis2004/Infrastructure_Modeling_Engine.git
cd Infrastructure_Modeling_Engine
npm install
```

## Runtime Targets

- **Node/npm support** is pinned in `package.json` via `engines` and validated through clean `npm install` + script workflows.
- **Browser targets** are declared via `browserslist`:
  - production: modern evergreen defaults (IE excluded)
  - development: latest Chrome/Firefox/Safari

## Package Boundaries

IME now publishes distinct entrypoints so engine consumers do not depend on UI implementation details:

- `infrastructure_modeling_engine` (default export path): core IR, validation, compiler, and export APIs (`dist/core.js`)
- `infrastructure_modeling_engine/frontend`: frontend adapter/boundary helpers (`dist/frontend.js`)

This keeps the engine API surface clean while preserving a dedicated frontend integration entrypoint.

## Usage

### Development

To start the development server with hot-reloading:

```bash
npm run dev
```

### Build

To compile the TypeScript code:

```bash
npm run build
```

### Run

To run the compiled engine:

```bash
npm start
```

## Project Structure

- `src/` - Source code for the engine and application.
- `docs/` - Documentation files.
- `dist/` - Compiled JavaScript output (after build).

## Contributing

Contributions are welcome! Please review the [Design Document](docs/DESIGN.md) to understand the architecture before making changes.

## License

This project is licensed under the ISC License.
