import { useEffect, useMemo, useState } from "react";

import { compileModelToTerraform } from "../../src/compiler";
import { compileModelToTerraformZip } from "../../src/export";
import { createSampleArchitectureTemplate, evaluateEngineBoundary, modelToReactFlowGraph } from "../../src/frontend";
import { awsResourceSchemaRegistry } from "../../src/schemas/aws";
import type { AttributeSchema } from "../../src/schemas/types";
import type { Edge, InfrastructureModel, OutputNode, ResourceNode, VariableNode } from "../../src/ir/model";
import type { TerraformType } from "../../src/ir/model";

type PreviewTab = "providers.tf" | "main.tf" | "variables.tf" | "outputs.tf";
type NodeKind = "resource" | "variable" | "output";

type ActionLogEntry = {
  id: string;
  action: string;
  timestamp: string;
};

const PREVIEW_TABS: PreviewTab[] = ["providers.tf", "main.tf", "variables.tf", "outputs.tf"];
const MAX_ACTION_LOG = 60;

type FieldErrorMap = Record<string, string>;

function terraformTypeToLabel(type: TerraformType): string {
  if (typeof type === "string") {
    return type;
  }

  if ("list" in type) {
    return `list(${terraformTypeToLabel(type.list)})`;
  }

  if ("map" in type) {
    return `map(${terraformTypeToLabel(type.map)})`;
  }

  const members = Object.entries(type.object)
    .map(([name, nestedType]) => `${name}:${terraformTypeToLabel(nestedType)}`)
    .join(", ");

  return `object({${members}})`;
}

function parseLiteralByType(rawValue: string, type: TerraformType): { value?: unknown; error?: string } {
  if (typeof type === "string") {
    if (type === "string") {
      return { value: rawValue };
    }

    if (type === "number") {
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed)) {
        return { error: "Must be a valid number." };
      }

      return { value: parsed };
    }

    if (type === "bool") {
      if (rawValue === "true") {
        return { value: true };
      }

      if (rawValue === "false") {
        return { value: false };
      }

      return { error: "Must be true or false." };
    }
  }

  try {
    const parsed = JSON.parse(rawValue);
    return { value: parsed };
  } catch {
    return { error: `Must be valid JSON for ${terraformTypeToLabel(type)}.` };
  }
}

function literalToInputValue(value: unknown, type: TerraformType): string {
  if (typeof type === "string") {
    if (type === "string") {
      return typeof value === "string" ? value : "";
    }

    if (type === "number") {
      return typeof value === "number" ? String(value) : "";
    }

    if (type === "bool") {
      return value === true ? "true" : value === false ? "false" : "";
    }
  }

  return value === undefined ? "" : JSON.stringify(value, null, 2);
}

function buildFieldErrors(
  schemaAttributes: Record<string, AttributeSchema>,
  drafts: Record<string, string>,
  resource: ResourceNode
): FieldErrorMap {
  const errors: FieldErrorMap = {};

  for (const [fieldName, fieldSchema] of Object.entries(schemaAttributes)) {
    if (fieldSchema.computed) {
      continue;
    }

    const rawValue = drafts[fieldName] ?? "";
    const trimmedValue = rawValue.trim();
    const existingAttribute = resource.attributes[fieldName];

    if (existingAttribute?.kind === "reference") {
      errors[fieldName] = "This value is driven by an edge reference and is edited from the graph connector.";
      continue;
    }

    if (existingAttribute?.kind === "expression") {
      errors[fieldName] = "Expression attributes are not editable in this inspector yet.";
      continue;
    }

    if (fieldSchema.required && trimmedValue.length === 0) {
      errors[fieldName] = "This field is required.";
      continue;
    }

    if (trimmedValue.length > 0) {
      const result = parseLiteralByType(trimmedValue, fieldSchema.type);
      if (result.error) {
        errors[fieldName] = result.error;
        continue;
      }
    }

    for (const conflictField of fieldSchema.conflictsWith ?? []) {
      const conflictValue = drafts[conflictField]?.trim();
      if (trimmedValue.length > 0 && conflictValue && conflictValue.length > 0) {
        errors[fieldName] = `Conflicts with '${conflictField}'. Clear one of the fields.`;
      }
    }

    for (const dependencyField of fieldSchema.dependsOn ?? []) {
      const dependencyValue = drafts[dependencyField]?.trim();
      if (trimmedValue.length > 0 && (!dependencyValue || dependencyValue.length === 0)) {
        errors[fieldName] = `Requires '${dependencyField}' to be set.`;
      }
    }
  }

  return errors;
}

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

function downloadBinary(name: string, content: Uint8Array): void {
  const blob = new Blob([content], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = name;
  link.click();

  URL.revokeObjectURL(url);
}

function createActionLogEntry(action: string): ActionLogEntry {
  const timestamp = new Date().toISOString();
  return {
    id: `${timestamp}-${Math.random().toString(16).slice(2, 10)}`,
    action,
    timestamp
  };
}

function appendAction(log: ActionLogEntry[], action: string): ActionLogEntry[] {
  return [createActionLogEntry(action), ...log].slice(0, MAX_ACTION_LOG);
}

function cloneModel(model: InfrastructureModel): InfrastructureModel {
  return structuredClone(model);
}

function createResourceNode(id: string, x: number, y: number): ResourceNode {
  return {
    id,
    type: "resource",
    label: "New VPC",
    provider: "aws",
    resourceType: "aws_vpc",
    position: { x, y },
    attributes: {
      cidr_block: { kind: "literal", value: "10.100.0.0/16" }
    }
  };
}

function createVariableNode(id: string, x: number, y: number): VariableNode {
  return {
    id,
    type: "variable",
    label: "New Variable",
    varType: "string",
    defaultValue: "",
    position: { x, y }
  };
}

function createOutputNode(id: string, x: number, y: number, fallbackRefNodeId: string): OutputNode {
  return {
    id,
    type: "output",
    label: "New Output",
    valueRef: {
      nodeId: fallbackRefNodeId,
      attribute: "id"
    },
    position: { x, y }
  };
}

function getAllNodeIds(model: InfrastructureModel): string[] {
  return [...model.variables.map((node) => node.id), ...model.resources.map((node) => node.id), ...model.outputs.map((node) => node.id)];
}

function createNodeId(model: InfrastructureModel, prefix: string): string {
  const ids = new Set(getAllNodeIds(model));

  for (let index = 1; index < 1_000; index += 1) {
    const candidate = `${prefix}_${index}`;
    if (!ids.has(candidate)) {
      return candidate;
    }
  }

  return `${prefix}_${Date.now()}`;
}

function removeNodeById(model: InfrastructureModel, nodeId: string): InfrastructureModel {
  const next = cloneModel(model);

  next.variables = next.variables.filter((node) => node.id !== nodeId);
  next.resources = next.resources.filter((node) => node.id !== nodeId);
  next.outputs = next.outputs.filter((node) => node.id !== nodeId);
  next.edges = next.edges.filter((edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId);

  for (const resource of next.resources) {
    for (const [attributeName, attributeValue] of Object.entries(resource.attributes)) {
      if (attributeValue.kind === "reference" && attributeValue.ref.nodeId === nodeId) {
        delete resource.attributes[attributeName];
      }
    }
  }

  for (const output of next.outputs) {
    if (output.valueRef.nodeId === nodeId) {
      output.valueRef = { nodeId: next.resources[0]?.id ?? "", attribute: "id" };
    }
  }

  return next;
}

function updateNodePosition(model: InfrastructureModel, nodeId: string, deltaX: number, deltaY: number): InfrastructureModel {
  const next = cloneModel(model);

  const candidates = [...next.variables, ...next.resources, ...next.outputs];
  const target = candidates.find((node) => node.id === nodeId);

  if (!target) {
    return model;
  }

  const previous = target.position ?? { x: 0, y: 0 };
  target.position = { x: previous.x + deltaX, y: previous.y + deltaY };

  return next;
}

function upsertReferenceFromEdge(model: InfrastructureModel, edge: Edge): InfrastructureModel {
  const next = cloneModel(model);

  const resourceTarget = next.resources.find((resource) => resource.id === edge.toNodeId);
  if (resourceTarget) {
    resourceTarget.attributes[edge.toAttribute] = {
      kind: "reference",
      ref: {
        nodeId: edge.fromNodeId,
        attribute: edge.fromAttribute
      }
    };
  }

  const outputTarget = next.outputs.find((output) => output.id === edge.toNodeId);
  if (outputTarget) {
    outputTarget.valueRef = {
      nodeId: edge.fromNodeId,
      attribute: edge.fromAttribute
    };
  }

  return next;
}

export function App() {
  const [model, setModel] = useState<InfrastructureModel>(() => createInitialModel());
  const [activeTab, setActiveTab] = useState<PreviewTab>("main.tf");
  const [compiledFiles, setCompiledFiles] = useState<Partial<Record<PreviewTab, string>>>(() => compileModelToTerraform(model));
  const [lastAction, setLastAction] = useState("Loaded sample architecture template.");
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>(() => [createActionLogEntry("init: loaded sample model")]);
  const [newEdge, setNewEdge] = useState({ source: "", sourceAttribute: "id", target: "", targetAttribute: "id" });
  const [selectedResourceId, setSelectedResourceId] = useState<string>(model.resources[0]?.id ?? "");
  const [inspectorDrafts, setInspectorDrafts] = useState<Record<string, string>>({});
  const [inspectorFieldErrors, setInspectorFieldErrors] = useState<FieldErrorMap>({});

  const graph = useMemo(() => modelToReactFlowGraph(model), [model]);
  const boundaryState = useMemo(() => evaluateEngineBoundary(model), [model]);
  const allNodeIds = useMemo(() => getAllNodeIds(model), [model]);
  const selectedResource = useMemo(
    () => model.resources.find((resource) => resource.id === selectedResourceId) ?? model.resources[0] ?? null,
    [model.resources, selectedResourceId]
  );
  const selectedResourceSchema = useMemo(
    () => (selectedResource ? awsResourceSchemaRegistry[selectedResource.resourceType] : undefined),
    [selectedResource]
  );

  const syncInspectorDrafts = (resource: ResourceNode | null) => {
    if (!resource) {
      setInspectorDrafts({});
      setInspectorFieldErrors({});
      return;
    }

    const schema = awsResourceSchemaRegistry[resource.resourceType];
    if (!schema) {
      setInspectorDrafts({});
      setInspectorFieldErrors({});
      return;
    }

    const nextDrafts: Record<string, string> = {};

    for (const [fieldName, fieldSchema] of Object.entries(schema.attributes)) {
      const attribute = resource.attributes[fieldName];

      if (attribute?.kind === "literal") {
        nextDrafts[fieldName] = literalToInputValue(attribute.value, fieldSchema.type);
      } else {
        nextDrafts[fieldName] = "";
      }
    }

    setInspectorDrafts(nextDrafts);
    setInspectorFieldErrors(buildFieldErrors(schema.attributes, nextDrafts, resource));
  };

  useEffect(() => {
    syncInspectorDrafts(selectedResource);
  }, [selectedResource]);

  const logAction = (action: string) => {
    setActionLog((current) => appendAction(current, action));
  };

  const updateModel = (nextModel: InfrastructureModel, action: string) => {
    setModel(nextModel);
    logAction(action);
    setLastAction(action);
  };

  const handleValidate = () => {
    const diagnosticsCount = boundaryState.validation.diagnostics.length;
    const action = boundaryState.validation.isValid
      ? "Validation passed."
      : `Validation failed with ${diagnosticsCount} diagnostic${diagnosticsCount === 1 ? "" : "s"}.`;
    setLastAction(action);
    logAction(`validate: ${action}`);
  };

  const handleCompile = () => {
    const files = compileModelToTerraform(model);
    setCompiledFiles(files);
    const action = "Terraform preview updated.";
    setLastAction(action);
    logAction("compile: regenerated terraform preview");
  };

  const handleExport = () => {
    if (!boundaryState.actions.canExport) {
      const action = "Fix validation errors before exporting.";
      setLastAction(action);
      logAction("export: blocked by validation errors");
      return;
    }

    const files = compileModelToTerraform(model);
    if (Object.keys(files).length === 0) {
      const action = "Nothing to export yet. Compile first.";
      setLastAction(action);
      logAction("export: skipped because preview is empty");
      return;
    }

    const archive = compileModelToTerraformZip(model, { projectFolderName: "ime-terraform" });
    downloadBinary("ime-terraform.zip", archive);

    const action = `Exported Terraform ZIP (${Object.keys(files).length} files).`;
    setLastAction(action);
    logAction(`export: downloaded zip with ${Object.keys(files).length} files`);
  };

  const handleDownloadActiveFile = () => {
    const content = compiledFiles[activeTab] ?? "";
    download(activeTab, content);
    setLastAction(`Downloaded ${activeTab}.`);
    logAction(`preview: downloaded ${activeTab}`);
  };

  const handleCopyActiveFile = async () => {
    const content = compiledFiles[activeTab] ?? "";

    if (!navigator.clipboard?.writeText) {
      setLastAction("Clipboard support is unavailable in this browser context.");
      logAction(`preview: clipboard unavailable for ${activeTab}`);
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      setLastAction(`Copied ${activeTab} to clipboard.`);
      logAction(`preview: copied ${activeTab}`);
    } catch {
      setLastAction("Unable to copy file to clipboard in this browser context.");
      logAction(`preview: copy failed for ${activeTab}`);
    }
  };

  const handleReset = () => {
    const next = createInitialModel();
    setModel(next);
    setCompiledFiles(compileModelToTerraform(next));
    setSelectedResourceId(next.resources[0]?.id ?? "");
    syncInspectorDrafts(next.resources[0] ?? null);
    const action = "Model reset and sample architecture loaded.";
    setLastAction(action);
    logAction("reset: restored sample architecture");
  };

  const addNode = (kind: NodeKind) => {
    const next = cloneModel(model);
    const offset = graph.nodes.length * 24;

    if (kind === "resource") {
      const newResource = createResourceNode(createNodeId(next, "res_new"), 120 + offset, 120 + offset);
      next.resources.push(newResource);
      updateModel(next, "Added resource node.");
      setSelectedResourceId(newResource.id);
      syncInspectorDrafts(newResource);
      return;
    }

    if (kind === "variable") {
      next.variables.push(createVariableNode(createNodeId(next, "var_new"), 80 + offset, 80 + offset));
      updateModel(next, "Added variable node.");
      return;
    }

    const fallback = next.resources[0]?.id ?? next.variables[0]?.id ?? next.outputs[0]?.id ?? "";
    next.outputs.push(createOutputNode(createNodeId(next, "out_new"), 160 + offset, 160 + offset, fallback));
    updateModel(next, "Added output node.");
  };

  const removeNode = (nodeId: string) => {
    if (!nodeId) {
      return;
    }

    const next = removeNodeById(model, nodeId);
    updateModel(next, `Removed node ${nodeId}.`);

    if (nodeId === selectedResourceId) {
      const fallbackResource = next.resources[0] ?? null;
      setSelectedResourceId(fallbackResource?.id ?? "");
      syncInspectorDrafts(fallbackResource);
    }
  };

  const moveNode = (nodeId: string, deltaX: number, deltaY: number) => {
    updateModel(updateNodePosition(model, nodeId, deltaX, deltaY), `Moved ${nodeId} by (${deltaX}, ${deltaY}).`);
  };

  const addEdge = () => {
    if (!newEdge.source || !newEdge.target) {
      setLastAction("Source and target are required to connect an edge.");
      return;
    }

    const edge: Edge = {
      fromNodeId: newEdge.source,
      fromAttribute: newEdge.sourceAttribute.trim() || "id",
      toNodeId: newEdge.target,
      toAttribute: newEdge.targetAttribute.trim() || "id"
    };

    const duplicate = model.edges.some(
      (existingEdge) =>
        existingEdge.fromNodeId === edge.fromNodeId &&
        existingEdge.fromAttribute === edge.fromAttribute &&
        existingEdge.toNodeId === edge.toNodeId &&
        existingEdge.toAttribute === edge.toAttribute
    );

    if (duplicate) {
      setLastAction("Edge already exists.");
      return;
    }

    const next = upsertReferenceFromEdge(
      {
        ...cloneModel(model),
        edges: [...model.edges, edge]
      },
      edge
    );

    updateModel(next, `Connected ${edge.fromNodeId}.${edge.fromAttribute} -> ${edge.toNodeId}.${edge.toAttribute}.`);
  };

  const removeEdge = (index: number) => {
    const next = cloneModel(model);
    const [removed] = next.edges.splice(index, 1);

    if (!removed) {
      return;
    }

    updateModel(next, `Removed edge ${removed.fromNodeId}.${removed.fromAttribute} -> ${removed.toNodeId}.${removed.toAttribute}.`);
  };

  const selectedPreview = compiledFiles[activeTab] ?? "// Compile to view generated Terraform.";

  const handleSelectResource = (resourceId: string) => {
    setSelectedResourceId(resourceId);
    const resource = model.resources.find((candidate) => candidate.id === resourceId) ?? null;
    syncInspectorDrafts(resource);
  };

  const updateInspectorField = (fieldName: string, value: string) => {
    const resource = selectedResource;
    const schema = selectedResourceSchema;

    if (!resource || !schema) {
      return;
    }

    const nextDrafts = { ...inspectorDrafts, [fieldName]: value };
    setInspectorDrafts(nextDrafts);
    setInspectorFieldErrors(buildFieldErrors(schema.attributes, nextDrafts, resource));
  };

  const applyInspectorChanges = () => {
    if (!selectedResource || !selectedResourceSchema) {
      return;
    }

    const errors = buildFieldErrors(selectedResourceSchema.attributes, inspectorDrafts, selectedResource);
    setInspectorFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setLastAction("Fix inspector field errors before saving resource attributes.");
      return;
    }

    const next = cloneModel(model);
    const target = next.resources.find((resource) => resource.id === selectedResource.id);
    if (!target) {
      return;
    }

    for (const [fieldName, fieldSchema] of Object.entries(selectedResourceSchema.attributes)) {
      if (fieldSchema.computed) {
        continue;
      }

      const existing = target.attributes[fieldName];
      if (existing?.kind === "reference" || existing?.kind === "expression") {
        continue;
      }

      const rawValue = inspectorDrafts[fieldName] ?? "";
      const trimmed = rawValue.trim();

      if (trimmed.length === 0) {
        delete target.attributes[fieldName];
        continue;
      }

      const parsed = parseLiteralByType(trimmed, fieldSchema.type);
      target.attributes[fieldName] = {
        kind: "literal",
        value: parsed.value
      };
    }

    updateModel(next, `Updated inspector fields for ${selectedResource.id}.`);
    setCompiledFiles(compileModelToTerraform(next));
    setLastAction(`Saved schema-typed attributes for ${selectedResource.id}.`);
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <h1>Infrastructure Modeling Engine</h1>
        <div className="actions">
          <button onClick={handleValidate}>Validate</button>
          <button onClick={handleCompile} disabled={!boundaryState.actions.canCompile}>
            Compile
          </button>
          <button onClick={handleExport} disabled={!boundaryState.actions.canExport}>
            Export ZIP
          </button>
          <button onClick={handleReset}>Sample Architecture</button>
        </div>
      </header>

      <main className="layout-grid">
        <section className="panel graph-panel" aria-label="Graph Canvas">
          <h2>Graph Canvas</h2>
          <p className="panel-subtitle">Graph editing is wired through the adapter with a replayable action log.</p>

          <div className="graph-controls">
            <button onClick={() => addNode("resource")}>+ Resource</button>
            <button onClick={() => addNode("variable")}>+ Variable</button>
            <button onClick={() => addNode("output")}>+ Output</button>
          </div>

          <table className="node-table">
            <thead>
              <tr>
                <th>Node</th>
                <th>Type</th>
                <th>Position</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {graph.nodes.map((node) => (
                <tr key={node.id}>
                  <td>{node.id}</td>
                  <td>{node.type}</td>
                  <td>
                    ({node.position.x}, {node.position.y})
                  </td>
                  <td>
                    <div className="inline-actions">
                      <button onClick={() => moveNode(node.id, -20, 0)}>◀</button>
                      <button onClick={() => moveNode(node.id, 20, 0)}>▶</button>
                      <button onClick={() => moveNode(node.id, 0, -20)}>▲</button>
                      <button onClick={() => moveNode(node.id, 0, 20)}>▼</button>
                      <button onClick={() => removeNode(node.id)}>Remove</button>
                      {node.type === "resource" ? <button onClick={() => handleSelectResource(node.id)}>Inspect</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Attribute Edges</h3>
          <div className="edge-builder">
            <select value={newEdge.source} onChange={(event) => setNewEdge((current) => ({ ...current, source: event.target.value }))}>
              <option value="">Source node</option>
              {allNodeIds.map((nodeId) => (
                <option key={`src-${nodeId}`} value={nodeId}>
                  {nodeId}
                </option>
              ))}
            </select>
            <input
              value={newEdge.sourceAttribute}
              onChange={(event) => setNewEdge((current) => ({ ...current, sourceAttribute: event.target.value }))}
              placeholder="source attr"
            />
            <span>→</span>
            <select value={newEdge.target} onChange={(event) => setNewEdge((current) => ({ ...current, target: event.target.value }))}>
              <option value="">Target node</option>
              {allNodeIds.map((nodeId) => (
                <option key={`dst-${nodeId}`} value={nodeId}>
                  {nodeId}
                </option>
              ))}
            </select>
            <input
              value={newEdge.targetAttribute}
              onChange={(event) => setNewEdge((current) => ({ ...current, targetAttribute: event.target.value }))}
              placeholder="target attr"
            />
            <button onClick={addEdge}>Connect</button>
          </div>

          <ul className="edge-list">
            {model.edges.map((edge, index) => (
              <li key={`${edge.fromNodeId}:${edge.fromAttribute}->${edge.toNodeId}:${edge.toAttribute}`}>
                <code>
                  {edge.fromNodeId}.{edge.fromAttribute} → {edge.toNodeId}.{edge.toAttribute}
                </code>
                <button onClick={() => removeEdge(index)}>Remove</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel inspector-panel" aria-label="Inspector Panel">
          <h2>Inspector</h2>
          {selectedResource ? (
            <>
              <label className="inspector-picker">
                Resource
                <select value={selectedResource.id} onChange={(event) => handleSelectResource(event.target.value)}>
                  {model.resources.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.id} ({resource.resourceType})
                    </option>
                  ))}
                </select>
              </label>

              {selectedResourceSchema ? (
                <>
                  <p className="panel-subtitle">
                    {selectedResourceSchema.provider}.{selectedResourceSchema.resourceType} ({Object.keys(selectedResourceSchema.attributes).length} fields)
                  </p>

                  <div className="inspector-fields">
                    {Object.entries(selectedResourceSchema.attributes).map(([fieldName, fieldSchema]) => {
                      const value = inspectorDrafts[fieldName] ?? "";
                      const error = inspectorFieldErrors[fieldName];
                      const existing = selectedResource.attributes[fieldName];
                      const isReferenceOrExpression = existing?.kind === "reference" || existing?.kind === "expression";
                      const disabled = Boolean(fieldSchema.computed) || isReferenceOrExpression;

                      return (
                        <label key={fieldName} className="inspector-field">
                          <span>
                            <strong>{fieldName}</strong> <code>{terraformTypeToLabel(fieldSchema.type)}</code>
                          </span>

                          {typeof fieldSchema.type === "string" && fieldSchema.type !== "bool" ? (
                            <input value={value} disabled={disabled} onChange={(event) => updateInspectorField(fieldName, event.target.value)} />
                          ) : typeof fieldSchema.type === "string" && fieldSchema.type === "bool" ? (
                            <select value={value} disabled={disabled} onChange={(event) => updateInspectorField(fieldName, event.target.value)}>
                              <option value="">(unset)</option>
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          ) : (
                            <textarea
                              value={value}
                              disabled={disabled}
                              rows={3}
                              onChange={(event) => updateInspectorField(fieldName, event.target.value)}
                            />
                          )}

                          <small>
                            {fieldSchema.required ? "required" : "optional"} • {fieldSchema.computed ? "computed" : "user-settable"}
                            {fieldSchema.conflictsWith?.length ? ` • conflicts: ${fieldSchema.conflictsWith.join(", ")}` : ""}
                            {fieldSchema.dependsOn?.length ? ` • dependsOn: ${fieldSchema.dependsOn.join(", ")}` : ""}
                          </small>

                          {existing?.kind === "reference" ? <small className="field-note">Value currently comes from a graph reference edge.</small> : null}
                          {existing?.kind === "expression" ? <small className="field-note">Value currently comes from a Terraform expression.</small> : null}
                          {error ? <small className="field-error">{error}</small> : null}
                        </label>
                      );
                    })}
                  </div>

                  <button onClick={applyInspectorChanges} disabled={Object.keys(inspectorFieldErrors).length > 0}>
                    Save inspector changes
                  </button>
                </>
              ) : (
                <p className="status-error">No schema found for {selectedResource.resourceType}.</p>
              )}
            </>
          ) : (
            <p className="panel-subtitle">No resource nodes available. Add a resource to edit schema-driven attributes.</p>
          )}

          <h3>Deterministic Action Log</h3>
          <p className="panel-subtitle">Replay this ordered log to deterministically rebuild the current graph edits.</p>
          <ol className="action-log" reversed>
            {actionLog.map((entry) => (
              <li key={entry.id}>
                <code>{entry.timestamp}</code> — {entry.action}
              </li>
            ))}
          </ol>
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
          <div className="preview-actions">
            <button onClick={() => void handleCopyActiveFile()}>Copy active file</button>
            <button onClick={handleDownloadActiveFile}>Download active file</button>
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
