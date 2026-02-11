import test from "node:test";
import assert from "node:assert/strict";

import { INITIAL_AWS_RESOURCE_TYPES, awsResourceSchemaRegistry } from "../schemas/aws";
import { invalidModelFixture, modelFixtures, sampleModelFixture } from "../fixtures/sampleModel";

test("initial AWS schema registry contains the v1 resource set", () => {
  assert.deepEqual([...INITIAL_AWS_RESOURCE_TYPES].sort(), [
    "aws_instance",
    "aws_s3_bucket",
    "aws_security_group",
    "aws_subnet",
    "aws_vpc"
  ]);

  for (const resourceType of INITIAL_AWS_RESOURCE_TYPES) {
    assert.equal(awsResourceSchemaRegistry[resourceType]?.provider, "aws");
  }
});

test("sample fixture includes all model sections and cross-resource edges", () => {
  assert.equal(sampleModelFixture.version, "0.1.0");
  assert.ok(sampleModelFixture.variables.length > 0);
  assert.ok(sampleModelFixture.resources.length >= 5);
  assert.ok(sampleModelFixture.outputs.length > 0);
  assert.ok(sampleModelFixture.edges.length > 0);

  const resourceIds = new Set(sampleModelFixture.resources.map((resource) => resource.id));
  for (const edge of sampleModelFixture.edges) {
    assert.ok(resourceIds.has(edge.fromNodeId));
    assert.ok(resourceIds.has(edge.toNodeId));
  }
});

test("fixture set contains a canonical valid and intentionally-invalid model", () => {
  assert.equal(modelFixtures.valid.metadata.name, sampleModelFixture.metadata.name);
  assert.equal(modelFixtures.invalid.metadata.name, invalidModelFixture.metadata.name);

  assert.equal(invalidModelFixture.resources[0].resourceType, "aws_vpc");
  assert.ok(!("cidr_block" in invalidModelFixture.resources[0].attributes));
  assert.equal(invalidModelFixture.resources[1].attributes.subnet_id.kind, "reference");
});
