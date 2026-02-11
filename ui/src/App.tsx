import { useMemo, useState } from "react";

import { compileModelToTerraform } from "../../src/compiler";
import { createSampleArchitectureTemplate, evaluateEngineBoundary, modelToReactFlowGraph } from "../../src/frontend";
import type { InfrastructureModel } from "../../src/ir/model";

type PreviewTab = "providers.tf" | "main.tf" | "variables.tf" | "outputs.tf";

const PREVIEW_TABS: PreviewTab[] = ["providers.tf", "main.tf", "variables.tf", "outputs.tf"];

function createInitialModel(): InfrastructureModel {
  return createSampleArchitectureTemplate();
}

function download(name: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = name;
  link.click();

  URL.revokeObjectURL(url);
}

export function App() {
  const [model, setModel] = useState<InfrastructureModel>(() => createInitialModel());
  const [activeTab, setActiveTab] = useState<PreviewTab>("main.tf");
  const [compiledFiles, setCompiledFiles] = useState<Partial<Record<PreviewTab, string>>>(() => compileModelToTerraform(model));
  const [lastAction, setLastAction] = useState("Loaded sample architecture template.");

  const graph = useMemo(() => modelToReactFlowGraph(model), [model]);
  const boundaryState = useMemo(() => evaluateEngineBoundary(model), [model]);

  const handleValidate = () => {
    const diagnosticsCount = boundaryState.validation.diagnostics.length;
    setLastAction(
      boundaryState.validation.isValid
        ? "Validation passed."
        : `Validation failed with ${diagnosticsCount} diagnostic${diagnosticsCount === 1 ? "" : "s"}.`
    );
  };

  const handleCompile = () => {
    const files = compileModelToTerraform(model);
    setCompiledFiles(files);
    setLastAction("Terraform preview updated.");
  };

  const handleExport = () => {
    const files = Object.entries(compiledFiles);

    if (files.length === 0) {
      setLastAction("Nothing to export yet. Compile first.");
      return;
    }

    for (const [fileName, fileContent] of files) {
      download(fileName, fileContent ?? "");
    }

    setLastAction(`Exported ${files.length} Terraform files.`);
  };

  const handleReset = () => {
    const next = createInitialModel();
    setModel(next);
    setCompiledFiles(compileModelToTerraform(next));
    setLastAction("Model reset and sample architecture loaded.");
  };

  const selectedPreview = compiledFiles[activeTab] ?? "// Compile to view generated Terraform.";

  return (
    <div className="app-shell">
      <header className="top-bar">
        <h1>Infrastructure Modeling Engine</h1>
        <div className="actions">
          <button onClick={handleValidate}>Validate</button>
          <button onClick={handleCompile}>Compile</button>
          <button onClick={handleExport}>Export</button>
          <button onClick={handleReset}>Reset / Load Sample</button>
        </div>
      </header>

      <main className="layout-grid">
        <section className="panel graph-panel" aria-label="Graph Canvas">
          <h2>Graph Canvas</h2>
          <p className="panel-subtitle">Step 1 shell placeholder. React Flow wiring lands in Step 2.</p>
          <ul>
            {graph.nodes.map((node) => (
              <li key={node.id}>
                <strong>{node.type}</strong> — {node.id} ({node.position.x}, {node.position.y})
              </li>
            ))}
          </ul>
          <p>Total edges: {graph.edges.length}</p>
        </section>

        <section className="panel inspector-panel" aria-label="Inspector Panel">
          <h2>Inspector</h2>
          <p>Node inspector scaffolding is ready. Select-and-edit controls are implemented in a later step.</p>
        </section>

        <section className="panel validation-panel" aria-label="Validation Panel">
          <h2>Validation</h2>
          <p className={boundaryState.validation.isValid ? "status-ok" : "status-error"}>
            {boundaryState.validation.isValid ? "Model is valid" : "Model has validation issues"}
          </p>
          <ul>
            {boundaryState.validation.diagnostics.length === 0 ? (
              <li>No diagnostics.</li>
            ) : (
              boundaryState.validation.diagnostics.map((diagnostic) => (
                <li key={`${diagnostic.code}-${diagnostic.path}`}>
                  [{diagnostic.severity}] {diagnostic.code}: {diagnostic.message} ({diagnostic.path})
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="panel preview-panel" aria-label="Terraform Preview Panel">
          <h2>Terraform Preview</h2>
          <div className="tabs" role="tablist" aria-label="Terraform files">
            {PREVIEW_TABS.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={tab === activeTab}
                className={tab === activeTab ? "active" : ""}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <pre>{selectedPreview}</pre>
        </section>
      </main>

      <footer className="status-bar" aria-live="polite">
        {lastAction}
      </footer>
    </div>
  );
}
