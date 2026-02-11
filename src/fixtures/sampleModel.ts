import type { InfrastructureModel } from "../ir/model";

export const sampleModelFixture: Readonly<InfrastructureModel> = Object.freeze({
  version: "0.1.0",
  metadata: {
    name: "sample-web-stack",
    description: "Canonical fixture for validation/compiler testing"
  },
  variables: [
    {
      id: "var_aws_region",
      type: "variable",
      label: "AWS Region",
      varType: "string",
      defaultValue: "us-east-1",
      description: "Deployment region"
    }
  ],
  resources: [
    {
      id: "res_vpc_main",
      type: "resource",
      label: "Main VPC",
      provider: "aws",
      resourceType: "aws_vpc",
      attributes: {
        cidr_block: { kind: "literal", value: "10.0.0.0/16" },
        enable_dns_support: { kind: "literal", value: true },
        enable_dns_hostnames: { kind: "literal", value: true },
        tags: { kind: "literal", value: { Name: "ime-main-vpc" } }
      }
    },
    {
      id: "res_subnet_public",
      type: "resource",
      label: "Public Subnet",
      provider: "aws",
      resourceType: "aws_subnet",
      attributes: {
        vpc_id: {
          kind: "reference",
          ref: { nodeId: "res_vpc_main", attribute: "id" }
        },
        cidr_block: { kind: "literal", value: "10.0.1.0/24" },
        availability_zone: { kind: "literal", value: "us-east-1a" },
        tags: { kind: "literal", value: { Name: "ime-public-subnet" } }
      }
    },
    {
      id: "res_sg_web",
      type: "resource",
      label: "Web Security Group",
      provider: "aws",
      resourceType: "aws_security_group",
      attributes: {
        description: { kind: "literal", value: "Allow web traffic" },
        vpc_id: {
          kind: "reference",
          ref: { nodeId: "res_vpc_main", attribute: "id" }
        },
        ingress: {
          kind: "literal",
          value: [
            {
              from_port: 80,
              to_port: 80,
              protocol: "tcp",
              cidr_blocks: ["0.0.0.0/0"]
            }
          ]
        }
      }
    },
    {
      id: "res_instance_web",
      type: "resource",
      label: "Web Instance",
      provider: "aws",
      resourceType: "aws_instance",
      attributes: {
        ami: { kind: "literal", value: "ami-0c02fb55956c7d316" },
        instance_type: { kind: "literal", value: "t3.micro" },
        subnet_id: {
          kind: "reference",
          ref: { nodeId: "res_subnet_public", attribute: "id" }
        },
        vpc_security_group_ids: {
          kind: "expression",
          expression: "[aws_security_group.res_sg_web.id]"
        }
      }
    },
    {
      id: "res_bucket_logs",
      type: "resource",
      label: "Logs Bucket",
      provider: "aws",
      resourceType: "aws_s3_bucket",
      attributes: {
        bucket: { kind: "literal", value: "ime-demo-logs-bucket" },
        force_destroy: { kind: "literal", value: false },
        tags: { kind: "literal", value: { Name: "ime-logs" } }
      }
    }
  ],
  outputs: [
    {
      id: "out_instance_id",
      type: "output",
      label: "Instance ID",
      valueRef: { nodeId: "res_instance_web", attribute: "id" },
      description: "ID of the web instance"
    },
    {
      id: "out_bucket_arn",
      type: "output",
      label: "Bucket ARN",
      valueRef: { nodeId: "res_bucket_logs", attribute: "arn" },
      description: "ARN of the logs bucket"
    }
  ],
  edges: [
    {
      fromNodeId: "res_vpc_main",
      fromAttribute: "id",
      toNodeId: "res_subnet_public",
      toAttribute: "vpc_id"
    },
    {
      fromNodeId: "res_vpc_main",
      fromAttribute: "id",
      toNodeId: "res_sg_web",
      toAttribute: "vpc_id"
    },
    {
      fromNodeId: "res_subnet_public",
      fromAttribute: "id",
      toNodeId: "res_instance_web",
      toAttribute: "subnet_id"
    }
  ]
} as InfrastructureModel);
