import test from "node:test";
import assert from "node:assert/strict";

import type { InfrastructureModel } from "../ir/model";
import { sampleModelFixture } from "../fixtures/sampleModel";
import {
  buildDiagnosticsViewModel,
  buildResourceInspectorDefinition,
  createDebouncedEngineBoundary,
  evaluateEngineBoundary,
  modelToReactFlowGraph,
  resolveDiagnosticFocus,
  reactFlowGraphToModel
} from "../frontend";

function cloneFixture(): InfrastructureModel {
  return structuredClone(sampleModelFixture as InfrastructureModel);
}

test("React Flow adapter round-trips model through strict graph boundary", () => {
  const model = cloneFixture();

  const graph = modelToReactFlowGraph(model);
  const rehydrated = reactFlowGraphToModel(graph, { metadata: model.metadata, version: model.version });

  assert.deepEqual(rehydrated, model);
});

test("inspector definition is derived from schema metadata", () => {
  const definition = buildResourceInspectorDefinition("aws_instance");

  assert.ok(definition);
  assert.equal(definition.resourceType, "aws_instance");

  const amiField = definition.fields.find((field) => field.name === "ami");
  assert.ok(amiField);
  assert.equal(amiField.required, true);
  assert.equal(amiField.computed, false);

  const idField = definition.fields.find((field) => field.name === "id");
  assert.ok(idField);
  assert.equal(idField.required, false);
  assert.equal(idField.computed, true);
});

test("engine boundary returns validation and preview for valid model", () => {
  const state = evaluateEngineBoundary(cloneFixture());

  assert.equal(state.validation.isValid, true);
  assert.equal(state.actions.canCompile, true);
  assert.equal(state.actions.canExport, true);
  assert.ok(Object.keys(state.terraformPreview).includes("main.tf"));
});

test("diagnostics view groups by severity and exposes focus/highlights", () => {
  const model = cloneFixture();
  model.resources[1].attributes.vpc_id = {
    kind: "reference",
    ref: {
      nodeId: "missing-vpc",
      attribute: "id"
    }
  };

  const state = evaluateEngineBoundary(model);

  assert.equal(state.validation.isValid, false);
  assert.equal(state.actions.canCompile, false);
  assert.equal(state.actions.canExport, false);
  assert.deepEqual(state.terraformPreview, {});

  const errorGroups = state.diagnosticsView.bySeverity.error;
  assert.ok(errorGroups.length > 0);
  assert.ok(errorGroups.some((group) => group.key === "res_subnet_public.vpc_id"));
  assert.equal(state.diagnosticsView.highlights.nodes.res_subnet_public, "error");

  const orphanReferencePath = "resources[1].attributes.vpc_id.ref.nodeId";
  const focus = state.diagnosticsView.focusByDiagnosticPath[orphanReferencePath];
  assert.equal(focus.nodeId, "res_subnet_public");
  assert.equal(focus.fieldPath, "vpc_id");
});

test("diagnostic focus resolver maps resource and edge paths", () => {
  const model = cloneFixture();

  assert.deepEqual(resolveDiagnosticFocus(model, "resources[0].attributes.cidr_block"), {
    nodeId: "res_vpc_main",
    fieldPath: "cidr_block"
  });

  assert.deepEqual(resolveDiagnosticFocus(model, "edges[0].fromNodeId"), {
    nodeId: "res_subnet_public",
    edgeId: "res_vpc_main:id->res_subnet_public:vpc_id"
  });

  const derivedView = buildDiagnosticsViewModel(model, [
    {
      code: "EDGE_WARNING",
      message: "warning",
      path: "edges[0].fromNodeId",
      severity: "warning"
    }
  ]);
  assert.equal(derivedView.highlights.edges["res_vpc_main:id->res_subnet_public:vpc_id"], "warning");
});

test("debounced engine boundary recomputes once for burst updates", async () => {
  const calls: InfrastructureModel[] = [];
  const outputs: string[] = [];
  const debounced = createDebouncedEngineBoundary((state) => {
    calls.push(state.model);
    outputs.push(Object.keys(state.terraformPreview).sort().join(","));
  }, 20);

  const modelA = cloneFixture();
  const modelB = cloneFixture();
  modelB.metadata.name = "updated-name";

  debounced.schedule(modelA);
  debounced.schedule(modelB);

  await new Promise((resolve) => setTimeout(resolve, 60));

  assert.equal(calls.length, 1);
  assert.equal(calls[0].metadata.name, "updated-name");
  assert.ok(outputs[0].includes("main.tf"));
});
