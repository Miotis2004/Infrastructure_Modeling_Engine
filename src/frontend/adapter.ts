import type { InfrastructureModel, OutputNode, ResourceNode, VariableNode } from "../ir/model";
import type { TerraformType } from "../ir/model";
import type { ResourceSchemaRegistry } from "../schemas/types";
import { awsResourceSchemaRegistry } from "../schemas/aws";
import { compileModelToTerraform } from "../compiler";
import { validateModel } from "../validation";
import {
  createOutputNodeData,
  createResourceNodeData,
  createVariableNodeData,
  toAttributeReferenceEdgeId,
  type DebouncedEngineBoundary,
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

  return {
    model,
    validation,
    terraformPreview: validation.isValid ? compileModelToTerraform(model) : {}
  };
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
