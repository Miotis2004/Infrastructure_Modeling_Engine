import test from "node:test";
import assert from "node:assert/strict";

import { sampleModelFixture } from "../fixtures/sampleModel";
import { validateModel } from "../validation";
import { compileModelToTerraform } from "../compiler";

test("integration: valid model compiles to complete Terraform project", () => {
  const validation = validateModel(sampleModelFixture);
  assert.equal(validation.isValid, true);

  const output = compileModelToTerraform(sampleModelFixture);
  assert.deepEqual(Object.keys(output).sort(), ["main.tf", "outputs.tf", "providers.tf", "variables.tf"]);
  assert.ok(output["main.tf"].includes('resource "aws_vpc"'));
});
