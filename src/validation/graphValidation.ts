import type { Edge, OutputNode, ResourceNode } from "../ir/model";
import type { ValidationDiagnostic, ValidatorStage } from "./types";

function collectResourceDependencies(resources: ResourceNode[], edges: Edge[]): Map<string, Set<string>> {
  const dependencyMap = new Map<string, Set<string>>();

  resources.forEach((resource) => {
    dependencyMap.set(resource.id, new Set<string>());
  });

  resources.forEach((resource) => {
    Object.values(resource.attributes).forEach((attributeValue) => {
      if (attributeValue.kind === "reference") {
        dependencyMap.get(resource.id)?.add(attributeValue.ref.nodeId);
      }
    });
  });

  edges.forEach((edge) => {
    dependencyMap.get(edge.toNodeId)?.add(edge.fromNodeId);
  });

  return dependencyMap;
}

function detectCycle(dependencyMap: Map<string, Set<string>>): string[] | null {
  const visited = new Set<string>();
  const inStack = new Set<string>();

  const dfs = (nodeId: string, stack: string[]): string[] | null => {
    visited.add(nodeId);
    inStack.add(nodeId);
    stack.push(nodeId);

    for (const dependencyId of dependencyMap.get(nodeId) ?? []) {
      if (!visited.has(dependencyId)) {
        const found = dfs(dependencyId, stack);
        if (found) {
          return found;
        }
      } else if (inStack.has(dependencyId)) {
        const cycleStart = stack.indexOf(dependencyId);
        return [...stack.slice(cycleStart), dependencyId];
      }
    }

    stack.pop();
    inStack.delete(nodeId);
    return null;
  };

  for (const nodeId of dependencyMap.keys()) {
    if (!visited.has(nodeId)) {
      const found = dfs(nodeId, []);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function validateOutputReference(outputs: OutputNode[], nodeIds: Set<string>): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];

  outputs.forEach((output, outputIndex) => {
    if (!nodeIds.has(output.valueRef.nodeId)) {
      diagnostics.push({
        code: "GRAPH_OUTPUT_REFERENCE_ORPHAN",
        message: `Output '${output.id}' references unknown node '${output.valueRef.nodeId}'.`,
        path: `outputs[${outputIndex}].valueRef.nodeId`,
        severity: "error"
      });
    }
  });

  return diagnostics;
}

export const runGraphValidation: ValidatorStage = ({ model }) => {
  const diagnostics: ValidationDiagnostic[] = [];
  const nodeIds = new Set(model.resources.map((resource) => resource.id));

  model.resources.forEach((resource, resourceIndex) => {
    Object.entries(resource.attributes).forEach(([attributeName, attributeValue]) => {
      if (attributeValue.kind !== "reference") {
        return;
      }

      if (!nodeIds.has(attributeValue.ref.nodeId)) {
        diagnostics.push({
          code: "GRAPH_REFERENCE_ORPHAN",
          message: `Reference on '${resource.id}.${attributeName}' points to unknown node '${attributeValue.ref.nodeId}'.`,
          path: `resources[${resourceIndex}].attributes.${attributeName}.ref.nodeId`,
          severity: "error"
        });
      }
    });
  });

  model.edges.forEach((edge, edgeIndex) => {
    if (!nodeIds.has(edge.fromNodeId)) {
      diagnostics.push({
        code: "GRAPH_EDGE_ORPHAN_SOURCE",
        message: `Edge source '${edge.fromNodeId}' does not exist.`,
        path: `edges[${edgeIndex}].fromNodeId`,
        severity: "error"
      });
    }

    if (!nodeIds.has(edge.toNodeId)) {
      diagnostics.push({
        code: "GRAPH_EDGE_ORPHAN_TARGET",
        message: `Edge target '${edge.toNodeId}' does not exist.`,
        path: `edges[${edgeIndex}].toNodeId`,
        severity: "error"
      });
    }
  });

  diagnostics.push(...validateOutputReference(model.outputs, nodeIds));

  const dependencyMap = collectResourceDependencies(model.resources, model.edges);
  const cyclePath = detectCycle(dependencyMap);

  if (cyclePath) {
    diagnostics.push({
      code: "GRAPH_CYCLE_DETECTED",
      message: `Cycle detected in resource graph: ${cyclePath.join(" -> ")}.`,
      path: "resources",
      severity: "error"
    });
  }

  return diagnostics;
};
