import test from "node:test";
import assert from "node:assert/strict";

import { sampleModelFixture } from "../fixtures/sampleModel";
import { compileModelToTerraform } from "../compiler";
import { DynamicSchemaRegistryLoader } from "../schemas/registryLoader";
import type { ResourceSchemaRegistry } from "../schemas/types";
import { validateModel } from "../validation";

test("extensibility: non-default compilation target stays behind feature flag", () => {
  assert.throws(
    () => compileModelToTerraform(sampleModelFixture, { target: "pulumi" }),
    /multiTargetCompilation/
  );

  assert.throws(
    () => compileModelToTerraform(sampleModelFixture, { target: "pulumi", featureFlags: { multiTargetCompilation: true } }),
    /not implemented/
  );
});

test("extensibility: dynamic schema loading stays behind feature flag", () => {
  const loader = new DynamicSchemaRegistryLoader(() => ({}) as ResourceSchemaRegistry);

  assert.throws(() => loader.load(), /dynamicSchemaLoading/);

  const loaded = loader.load({ featureFlags: { dynamicSchemaLoading: true } });
  assert.deepEqual(loaded, {});
});

test("extensibility: unsupported schema constructs are emitted as explicit diagnostics", () => {
  const registry: ResourceSchemaRegistry = {
    aws_s3_bucket: {
      provider: "aws",
      resourceType: "aws_s3_bucket",
      attributes: {
        bucket: { type: "string", required: true }
      },
      unsupportedConstructs: [
        {
          code: "dynamic_blocks",
          message: "Dynamic nested block expansion is not supported in v1.",
          blocking: true
        }
      ]
    }
  };

  const validation = validateModel(
    {
      ...sampleModelFixture,
      resources: [
        {
          ...sampleModelFixture.resources.find((resource) => resource.resourceType === "aws_s3_bucket")!,
          attributes: {
            bucket: { kind: "literal", value: "example-bucket" }
          }
        }
      ]
    },
    registry
  );

  assert.equal(validation.isValid, false);
  assert.ok(validation.diagnostics.some((diagnostic) => diagnostic.code === "SCHEMA_UNSUPPORTED_CONSTRUCT"));
});
