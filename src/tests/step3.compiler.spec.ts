import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { InfrastructureModel } from "../ir/model";
import { sampleModelFixture } from "../fixtures/sampleModel";
import { compileModelToTerraform } from "../compiler";

function cloneFixture(): InfrastructureModel {
  return structuredClone(sampleModelFixture as InfrastructureModel);
}

function readGolden(fileName: string): string {
  return readFileSync(path.join(process.cwd(), "src", "tests", "golden", fileName), "utf8");
}

test("compiler produces expected Terraform snapshot files", () => {
  const output = compileModelToTerraform(cloneFixture());

  assert.equal(output["providers.tf"], readGolden("providers.tf"));
  assert.equal(output["main.tf"], readGolden("main.tf"));
  assert.equal(output["variables.tf"], readGolden("variables.tf"));
  assert.equal(output["outputs.tf"], readGolden("outputs.tf"));
});

test("compiler is deterministic for semantically identical but differently ordered input", () => {
  const baseline = compileModelToTerraform(cloneFixture());

  const shuffled = cloneFixture();
  shuffled.resources.reverse();
  shuffled.variables.reverse();
  shuffled.outputs.reverse();
  shuffled.resources[0].attributes = Object.fromEntries(Object.entries(shuffled.resources[0].attributes).reverse());

  const regenerated = compileModelToTerraform(shuffled);

  assert.deepEqual(regenerated, baseline);
});
