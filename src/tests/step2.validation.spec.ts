import test from "node:test";
import assert from "node:assert/strict";

import type { InfrastructureModel } from "../ir/model";
import { sampleModelFixture } from "../fixtures/sampleModel";
import { validateModel } from "../validation";

function cloneFixture(): InfrastructureModel {
  return structuredClone(sampleModelFixture as InfrastructureModel);
}

test("validation pipeline succeeds for canonical fixture", () => {
  const result = validateModel(cloneFixture());
  assert.equal(result.isValid, true);
  assert.equal(result.diagnostics.length, 0);
});

test("schema validation emits diagnostics for every schema rule", async (t) => {
  const cases: Array<{ name: string; mutate: (model: InfrastructureModel) => void; expectedCode: string }> = [
    {
      name: "unknown resource type",
      mutate: (model) => {
        model.resources[0].resourceType = "aws_not_real";
      },
      expectedCode: "SCHEMA_RESOURCE_TYPE_UNKNOWN"
    },
    {
      name: "provider mismatch",
      mutate: (model) => {
        model.resources[0].provider = "google";
      },
      expectedCode: "SCHEMA_PROVIDER_MISMATCH"
    },
    {
      name: "unknown attribute",
      mutate: (model) => {
        model.resources[0].attributes.bad_attr = { kind: "literal", value: true };
      },
      expectedCode: "SCHEMA_ATTRIBUTE_UNKNOWN"
    },
    {
      name: "computed attribute assigned literal",
      mutate: (model) => {
        model.resources[0].attributes.id = { kind: "literal", value: "manual-id" };
      },
      expectedCode: "SCHEMA_ATTRIBUTE_COMPUTED_SET"
    },
    {
      name: "attribute type mismatch",
      mutate: (model) => {
        model.resources[0].attributes.cidr_block = { kind: "literal", value: 42 };
      },
      expectedCode: "SCHEMA_ATTRIBUTE_TYPE_MISMATCH"
    },
    {
      name: "required attribute missing",
      mutate: (model) => {
        delete model.resources[0].attributes.cidr_block;
      },
      expectedCode: "SCHEMA_REQUIRED_ATTRIBUTE_MISSING"
    }
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, () => {
      const model = cloneFixture();
      testCase.mutate(model);

      const result = validateModel(model);
      assert.ok(result.diagnostics.some((d) => d.code === testCase.expectedCode));
    });
  }
});

test("graph validation emits diagnostics for every graph rule", async (t) => {
  const cases: Array<{ name: string; mutate: (model: InfrastructureModel) => void; expectedCode: string }> = [
    {
      name: "orphan attribute reference",
      mutate: (model) => {
        model.resources[1].attributes.vpc_id = {
          kind: "reference",
          ref: { nodeId: "res_missing", attribute: "id" }
        };
      },
      expectedCode: "GRAPH_REFERENCE_ORPHAN"
    },
    {
      name: "orphan edge source",
      mutate: (model) => {
        model.edges[0].fromNodeId = "res_missing";
      },
      expectedCode: "GRAPH_EDGE_ORPHAN_SOURCE"
    },
    {
      name: "orphan edge target",
      mutate: (model) => {
        model.edges[0].toNodeId = "res_missing";
      },
      expectedCode: "GRAPH_EDGE_ORPHAN_TARGET"
    },
    {
      name: "orphan output reference",
      mutate: (model) => {
        model.outputs[0].valueRef.nodeId = "res_missing";
      },
      expectedCode: "GRAPH_OUTPUT_REFERENCE_ORPHAN"
    },
    {
      name: "resource cycle detection",
      mutate: (model) => {
        model.resources[0].attributes.cidr_block = {
          kind: "reference",
          ref: { nodeId: "res_subnet_public", attribute: "id" }
        };
      },
      expectedCode: "GRAPH_CYCLE_DETECTED"
    }
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, () => {
      const model = cloneFixture();
      testCase.mutate(model);

      const result = validateModel(model);
      assert.ok(result.diagnostics.some((d) => d.code === testCase.expectedCode));
    });
  }
});

test("AWS semantic validation emits diagnostics for every semantic rule", async (t) => {
  const cases: Array<{ name: string; mutate: (model: InfrastructureModel) => void; expectedCode: string }> = [
    {
      name: "instance AMI format",
      mutate: (model) => {
        model.resources[3].attributes.ami = { kind: "literal", value: "ubuntu-ami" };
      },
      expectedCode: "SEMANTIC_AWS_INSTANCE_AMI_FORMAT"
    },
    {
      name: "instance type empty",
      mutate: (model) => {
        model.resources[3].attributes.instance_type = { kind: "literal", value: "" };
      },
      expectedCode: "SEMANTIC_AWS_INSTANCE_TYPE_EMPTY"
    },
    {
      name: "security group invalid ingress range",
      mutate: (model) => {
        model.resources[2].attributes.ingress = {
          kind: "literal",
          value: [
            {
              from_port: 443,
              to_port: 80,
              protocol: "tcp",
              cidr_blocks: ["0.0.0.0/0"]
            }
          ]
        };
      },
      expectedCode: "SEMANTIC_AWS_SG_PORT_RANGE"
    },
    {
      name: "s3 bucket naming constraints",
      mutate: (model) => {
        model.resources[4].attributes.bucket = { kind: "literal", value: "Invalid_Bucket_Name" };
      },
      expectedCode: "SEMANTIC_AWS_S3_BUCKET_NAME"
    }
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, () => {
      const model = cloneFixture();
      testCase.mutate(model);

      const result = validateModel(model);
      assert.ok(result.diagnostics.some((d) => d.code === testCase.expectedCode));
    });
  }
});
