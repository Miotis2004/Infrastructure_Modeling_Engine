import test from "node:test";
import assert from "node:assert/strict";

import type { InfrastructureModel } from "../ir/model";
import { sampleModelFixture } from "../fixtures/sampleModel";
import {
  buildResourceInspectorDefinition,
  createDebouncedEngineBoundary,
  evaluateEngineBoundary,
  modelToReactFlowGraph,
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
  assert.ok(Object.keys(state.terraformPreview).includes("main.tf"));
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
