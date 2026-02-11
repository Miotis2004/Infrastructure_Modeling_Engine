import test from "node:test";
import assert from "node:assert/strict";

import type { InfrastructureModel } from "../ir/model";
import { sampleModelFixture } from "../fixtures/sampleModel";
import {
  buildDiagnosticsViewModel,
  buildResourceInspectorDefinition,
  evaluateEngineBoundary,
  modelToReactFlowGraph,
  reactFlowGraphToModel,
  toAttributeReferenceEdgeId,
  type ReactFlowGraph
} from "../frontend";

function cloneFixture(): InfrastructureModel {
  return structuredClone(sampleModelFixture as InfrastructureModel);
}

test("inspector view definition includes deterministic field metadata for rendering", () => {
  const definition = buildResourceInspectorDefinition("aws_subnet");

  assert.ok(definition);
  assert.equal(definition.resourceType, "aws_subnet");

  const fieldNames = definition.fields.map((field) => field.name);
  const sortedFieldNames = [...fieldNames].sort((left, right) => left.localeCompare(right));

  assert.deepEqual(fieldNames, sortedFieldNames);

  const vpcIdField = definition.fields.find((field) => field.name === "vpc_id");
  assert.ok(vpcIdField);
  assert.equal(vpcIdField.required, true);
  assert.equal(vpcIdField.computed, false);

  const idField = definition.fields.find((field) => field.name === "id");
  assert.ok(idField);
  assert.equal(idField.computed, true);
  assert.equal(idField.typeLabel, "string");
});

test("diagnostics view model exposes grouped severities and focus targets for UI rendering", () => {
  const model = cloneFixture();
  model.resources[1].attributes.vpc_id = {
    kind: "reference",
    ref: {
      nodeId: "missing-vpc",
      attribute: "id"
    }
  };

  const state = evaluateEngineBoundary(model);
  const diagnosticsView = buildDiagnosticsViewModel(model, state.validation.diagnostics);

  assert.equal(state.validation.isValid, false);
  assert.ok(diagnosticsView.bySeverity.error.length >= 1);
  assert.equal(diagnosticsView.bySeverity.warning.length, 0);

  const firstGroup = diagnosticsView.bySeverity.error[0];
  assert.ok(firstGroup.key.length > 0);
  assert.ok(firstGroup.diagnostics.length >= 1);

  const focusPath = "resources[1].attributes.vpc_id.ref.nodeId";
  const focusTarget = diagnosticsView.focusByDiagnosticPath[focusPath];
  assert.equal(focusTarget.nodeId, "res_subnet_public");
  assert.equal(focusTarget.fieldPath, "vpc_id");

  assert.equal(diagnosticsView.highlights.nodes.res_subnet_public, "error");
});

test("UI graph state integration preserves adapter round-trip and boundary action gating", () => {
  const model = cloneFixture();
  const graph = modelToReactFlowGraph(model);

  const modifiedGraph: ReactFlowGraph = {
    nodes: graph.nodes,
    edges: graph.edges.filter((edge) => edge.targetHandle !== "vpc_id")
  };

  const roundTripped = reactFlowGraphToModel(modifiedGraph, {
    metadata: model.metadata,
    version: model.version
  });

  assert.equal(roundTripped.edges.some((edge) => edge.toAttribute === "vpc_id"), false);
  roundTripped.resources[1].attributes.vpc_id = {
    kind: "reference",
    ref: {
      nodeId: "missing-vpc",
      attribute: "id"
    }
  };

  const invalidState = evaluateEngineBoundary(roundTripped);
  assert.equal(invalidState.actions.canCompile, false);
  assert.equal(invalidState.actions.canExport, false);

  const edgeToRestore = model.edges.find((edge) => edge.toAttribute === "vpc_id");
  assert.ok(edgeToRestore);

  const restoredGraph: ReactFlowGraph = {
    nodes: modifiedGraph.nodes,
    edges: [
      ...modifiedGraph.edges,
      {
        id: toAttributeReferenceEdgeId(edgeToRestore),
        source: edgeToRestore.fromNodeId,
        sourceHandle: edgeToRestore.fromAttribute,
        target: edgeToRestore.toNodeId,
        targetHandle: edgeToRestore.toAttribute
      }
    ]
  };

  const repairedModel = reactFlowGraphToModel(restoredGraph, {
    metadata: model.metadata,
    version: model.version
  });
  repairedModel.resources[1].attributes.vpc_id = {
    kind: "reference",
    ref: {
      nodeId: edgeToRestore.fromNodeId,
      attribute: edgeToRestore.fromAttribute
    }
  };

  const validState = evaluateEngineBoundary(repairedModel);
  assert.equal(validState.actions.canCompile, true);
  assert.equal(validState.actions.canExport, true);
});
