import type { InfrastructureModel, OutputNode, ResourceNode, VariableNode } from "../ir/model";
import type { TerraformType } from "../ir/model";
import type { ResourceSchemaRegistry } from "../schemas/types";
import { awsResourceSchemaRegistry } from "../schemas/aws";
import { compileModelToTerraform } from "../compiler";
import { validateModel } from "../validation";
import { toAttributeReferenceEdgeId } from "./types";
import {
  createOutputNodeData,
  createResourceNodeData,
  createVariableNodeData,
  type DebouncedEngineBoundary,
  type DiagnosticFocusTarget,
  type DiagnosticsGroup,
  type DiagnosticsViewModel,
  type EngineBoundaryState,
  type ReactFlowAdapterOptions,
  type ReactFlowEdge,
  type ReactFlowGraph,
  type ReactFlowNode,
  type ResourceInspectorDefinition,
  type ResourceInspectorField
} from "./types";

const DEFAULT_NODE_POSITION = Object.freeze({ x: 0, y: 0 });
const DEFAULT_MODEL_VERSION = "1.0.0";
const DEFAULT_DEBOUNCE_MS = 150;

export function modelToReactFlowGraph(model: InfrastructureModel): ReactFlowGraph {
  const variableNodes: ReactFlowNode[] = model.variables.map((variable) => ({
    id: variable.id,
    type: "variable",
    position: variable.position ?? { ...DEFAULT_NODE_POSITION },
    data: createVariableNodeData(variable)
  }));

  const resourceNodes: ReactFlowNode[] = model.resources.map((resource) => ({
    id: resource.id,
    type: "resource",
    position: resource.position ?? { ...DEFAULT_NODE_POSITION },
    data: createResourceNodeData(resource)
  }));

  const outputNodes: ReactFlowNode[] = model.outputs.map((output) => ({
    id: output.id,
    type: "output",
    position: output.position ?? { ...DEFAULT_NODE_POSITION },
    data: createOutputNodeData(output)
  }));

  const edges: ReactFlowEdge[] = model.edges.map((edge) => ({
    id: toAttributeReferenceEdgeId(edge),
    source: edge.fromNodeId,
    sourceHandle: edge.fromAttribute,
    target: edge.toNodeId,
    targetHandle: edge.toAttribute
  }));

  return {
    nodes: [...variableNodes, ...resourceNodes, ...outputNodes],
    edges
  };
}

export function reactFlowGraphToModel(graph: ReactFlowGraph, options: ReactFlowAdapterOptions): InfrastructureModel {
  const variables: VariableNode[] = [];
  const resources: ResourceNode[] = [];
  const outputs: OutputNode[] = [];

  for (const node of graph.nodes) {
    if (node.type === "variable" && node.data.kind === "variable") {
      variables.push(withOptionalPosition(node.data.variable, resolveNodePosition(node.data.variable.position, node.position)));
      continue;
    }

    if (node.type === "resource" && node.data.kind === "resource") {
      resources.push(withOptionalPosition(node.data.resource, resolveNodePosition(node.data.resource.position, node.position)));
      continue;
    }

    if (node.type === "output" && node.data.kind === "output") {
      outputs.push(withOptionalPosition(node.data.output, resolveNodePosition(node.data.output.position, node.position)));
    }
  }

  return {
    version: options.version ?? DEFAULT_MODEL_VERSION,
    metadata: options.metadata,
    variables,
    resources,
    outputs,
    edges: graph.edges.map((edge) => ({
      fromNodeId: edge.source,
      fromAttribute: edge.sourceHandle,
      toNodeId: edge.target,
      toAttribute: edge.targetHandle
    }))
  };
}

export function buildResourceInspectorDefinition(
  resourceType: string,
  registry: ResourceSchemaRegistry = awsResourceSchemaRegistry
): ResourceInspectorDefinition | null {
  const schema = registry[resourceType];

  if (!schema) {
    return null;
  }

  const fields: ResourceInspectorField[] = Object.entries(schema.attributes)
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
    .map(([name, attributeSchema]) => ({
      name,
      typeLabel: terraformTypeToLabel(attributeSchema.type),
      required: Boolean(attributeSchema.required),
      computed: Boolean(attributeSchema.computed),
      conflictsWith: [...(attributeSchema.conflictsWith ?? [])],
      dependsOn: [...(attributeSchema.dependsOn ?? [])]
    }));

  return {
    provider: schema.provider,
    resourceType: schema.resourceType,
    fields
  };
}

export function evaluateEngineBoundary(model: InfrastructureModel): EngineBoundaryState {
  const validation = validateModel(model);
  const diagnosticsView = buildDiagnosticsViewModel(model, validation.diagnostics);
  const canRunActions = validation.diagnostics.every((diagnostic) => diagnostic.severity !== "error");

  return {
    model,
    validation,
    diagnosticsView,
    terraformPreview: canRunActions ? compileModelToTerraform(model) : {},
    actions: {
      canCompile: canRunActions,
      canExport: canRunActions
    }
  };
}

export function buildDiagnosticsViewModel(
  model: InfrastructureModel,
  diagnostics: EngineBoundaryState["validation"]["diagnostics"]
): DiagnosticsViewModel {
  const bySeverity = {
    error: groupDiagnosticsBy((diagnostic) => focusKeyForGrouping(resolveDiagnosticFocus(model, diagnostic.path)), diagnostics.filter((diagnostic) => diagnostic.severity === "error")),
    warning: groupDiagnosticsBy((diagnostic) => focusKeyForGrouping(resolveDiagnosticFocus(model, diagnostic.path)), diagnostics.filter((diagnostic) => diagnostic.severity === "warning"))
  };

  const highlights: DiagnosticsViewModel["highlights"] = {
    nodes: {},
    edges: {}
  };

  const focusByDiagnosticPath: Record<string, DiagnosticFocusTarget> = {};

  for (const diagnostic of diagnostics) {
    const focus = resolveDiagnosticFocus(model, diagnostic.path);
    focusByDiagnosticPath[diagnostic.path] = focus;

    if (focus.nodeId) {
      highlights.nodes[focus.nodeId] = mergeSeverity(highlights.nodes[focus.nodeId], diagnostic.severity);
    }

    if (focus.edgeId) {
      highlights.edges[focus.edgeId] = mergeSeverity(highlights.edges[focus.edgeId], diagnostic.severity);
    }
  }

  return {
    bySeverity,
    highlights,
    focusByDiagnosticPath
  };
}

export function resolveDiagnosticFocus(model: InfrastructureModel, path: string): DiagnosticFocusTarget {
  const resourceMatch = /^resources\[(\d+)\](?:\.attributes\.(.+))?$/u.exec(path);

  if (resourceMatch) {
    const resourceIndex = Number(resourceMatch[1]);
    const resource = model.resources[resourceIndex];
    const fieldPath = resourceMatch[2];

    if (!resource) {
      return {};
    }

    if (!fieldPath) {
      return { nodeId: resource.id };
    }

    const resolvedFieldPath = fieldPath.replace(/\.ref\..+$/u, "");
    const value = resource.attributes[resolvedFieldPath];

    if (value && value.kind === "reference") {
      const edge = model.edges.find(
        (candidate) =>
          candidate.fromNodeId === value.ref.nodeId &&
          candidate.fromAttribute === value.ref.attribute &&
          candidate.toNodeId === resource.id &&
          candidate.toAttribute === resolvedFieldPath
      );

      return {
        nodeId: resource.id,
        fieldPath: resolvedFieldPath,
        edgeId: edge ? toAttributeReferenceEdgeId(edge) : undefined
      };
    }

    return {
      nodeId: resource.id,
      fieldPath: resolvedFieldPath
    };
  }

  const outputMatch = /^outputs\[(\d+)\](?:\.(.+))?$/u.exec(path);

  if (outputMatch) {
    const outputIndex = Number(outputMatch[1]);
    const output = model.outputs[outputIndex];

    return output ? { nodeId: output.id, fieldPath: outputMatch[2] } : {};
  }

  const edgeMatch = /^edges\[(\d+)\](?:\..+)?$/u.exec(path);

  if (edgeMatch) {
    const edgeIndex = Number(edgeMatch[1]);
    const edge = model.edges[edgeIndex];

    return edge ? { edgeId: toAttributeReferenceEdgeId(edge), nodeId: edge.toNodeId } : {};
  }

  return {};
}

export function createDebouncedEngineBoundary(
  onStateComputed: (state: EngineBoundaryState) => void,
  debounceMs = DEFAULT_DEBOUNCE_MS
): DebouncedEngineBoundary {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pendingModel: InfrastructureModel | undefined;

  const run = () => {
    if (!pendingModel) {
      return;
    }

    onStateComputed(evaluateEngineBoundary(pendingModel));
    pendingModel = undefined;
  };

  return {
    schedule(model) {
      pendingModel = model;

      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        run();
        timer = undefined;
      }, debounceMs);
    },
    flush() {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }

      run();
    },
    cancel() {
      pendingModel = undefined;

      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    }
  };
}



function withOptionalPosition<T extends { position?: { x: number; y: number } }>(node: T, position: { x: number; y: number } | undefined): T {
  if (!position) {
    const { position: _discarded, ...rest } = node;
    return { ...rest } as T;
  }

  return { ...node, position };
}

function groupDiagnosticsBy(
  keySelector: (diagnostic: EngineBoundaryState["validation"]["diagnostics"][number]) => string,
  diagnostics: EngineBoundaryState["validation"]["diagnostics"]
): DiagnosticsGroup[] {
  const groups = new Map<string, EngineBoundaryState["validation"]["diagnostics"]>();

  for (const diagnostic of diagnostics) {
    const key = keySelector(diagnostic);
    const existing = groups.get(key);

    if (existing) {
      existing.push(diagnostic);
      continue;
    }

    groups.set(key, [diagnostic]);
  }

  return [...groups.entries()]
    .map(([key, groupedDiagnostics]) => ({ key, diagnostics: groupedDiagnostics }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function focusKeyForGrouping(focus: DiagnosticFocusTarget): string {
  if (focus.nodeId && focus.fieldPath) {
    return `${focus.nodeId}.${focus.fieldPath}`;
  }

  if (focus.nodeId) {
    return focus.nodeId;
  }

  if (focus.edgeId) {
    return focus.edgeId;
  }

  return "global";
}

function mergeSeverity(current: "error" | "warning" | undefined, next: "error" | "warning"): "error" | "warning" {
  if (current === "error" || next === "error") {
    return "error";
  }

  return "warning";
}
function resolveNodePosition(originalPosition: { x: number; y: number } | undefined, currentPosition: { x: number; y: number }) {
  if (!originalPosition && currentPosition.x === DEFAULT_NODE_POSITION.x && currentPosition.y === DEFAULT_NODE_POSITION.y) {
    return undefined;
  }

  return currentPosition;
}
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
