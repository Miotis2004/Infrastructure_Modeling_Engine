import type { AttributeValue, Edge, InfrastructureModel, OutputNode, ResourceNode, VariableNode } from "../ir/model";
import type { TerraformFileSet } from "../compiler";

export interface ReactFlowPosition {
  x: number;
  y: number;
}

export interface VariableNodeData {
  kind: "variable";
  variable: VariableNode;
}

export interface ResourceNodeData {
  kind: "resource";
  resource: ResourceNode;
}

export interface OutputNodeData {
  kind: "output";
  output: OutputNode;
}

export type ReactFlowNodeData = VariableNodeData | ResourceNodeData | OutputNodeData;

export interface ReactFlowNode {
  id: string;
  type: "variable" | "resource" | "output";
  position: ReactFlowPosition;
  data: ReactFlowNodeData;
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

export interface ReactFlowGraph {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

export interface ReactFlowAdapterOptions {
  metadata: InfrastructureModel["metadata"];
  version?: string;
}

export interface ResourceInspectorField {
  name: string;
  typeLabel: string;
  required: boolean;
  computed: boolean;
  conflictsWith: string[];
  dependsOn: string[];
}

export interface ResourceInspectorDefinition {
  provider: string;
  resourceType: string;
  fields: ResourceInspectorField[];
}

export interface EngineBoundaryState {
  model: InfrastructureModel;
  validation: {
    isValid: boolean;
    diagnostics: Array<{ code: string; message: string; path: string; severity: "error" | "warning" }>;
  };
  diagnosticsView: DiagnosticsViewModel;
  terraformPreview: Partial<TerraformFileSet>;
  actions: {
    canCompile: boolean;
    canExport: boolean;
  };
}

export interface DebouncedEngineBoundary {
  schedule(model: InfrastructureModel): void;
  flush(): void;
  cancel(): void;
}

export interface DiagnosticFocusTarget {
  nodeId?: string;
  fieldPath?: string;
  edgeId?: string;
}

export interface DiagnosticsGroup {
  key: string;
  diagnostics: Array<{ code: string; message: string; path: string; severity: "error" | "warning" }>;
}

export interface DiagnosticsViewModel {
  bySeverity: Record<"error" | "warning", DiagnosticsGroup[]>;
  highlights: {
    nodes: Record<string, "error" | "warning">;
    edges: Record<string, "error" | "warning">;
  };
  focusByDiagnosticPath: Record<string, DiagnosticFocusTarget>;
}

export function toAttributeReferenceEdgeId(edge: Edge): string {
  return `${edge.fromNodeId}:${edge.fromAttribute}->${edge.toNodeId}:${edge.toAttribute}`;
}

export function createResourceNodeData(resource: ResourceNode): ResourceNodeData {
  return { kind: "resource", resource };
}

export function createVariableNodeData(variable: VariableNode): VariableNodeData {
  return { kind: "variable", variable };
}

export function createOutputNodeData(output: OutputNode): OutputNodeData {
  return { kind: "output", output };
}

export function ensureAttributeValue(value: unknown): AttributeValue {
  if (typeof value === "object" && value !== null && "kind" in value) {
    return value as AttributeValue;
  }

  return { kind: "literal", value };
}
