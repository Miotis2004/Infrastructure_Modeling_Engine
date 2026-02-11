import type { ResourceSchemaRegistry } from "./types";

const AWS_PROVIDER = "aws";

export const awsResourceSchemaRegistry: Readonly<ResourceSchemaRegistry> = Object.freeze({
  aws_vpc: {
    provider: AWS_PROVIDER,
    resourceType: "aws_vpc",
    attributes: {
      cidr_block: { type: "string", required: true },
      enable_dns_support: { type: "bool" },
      enable_dns_hostnames: { type: "bool" },
      id: { type: "string", computed: true },
      tags: { type: { map: "string" } }
    }
  },
  aws_subnet: {
    provider: AWS_PROVIDER,
    resourceType: "aws_subnet",
    attributes: {
      vpc_id: { type: "string", required: true },
      cidr_block: { type: "string", required: true },
      availability_zone: { type: "string" },
      id: { type: "string", computed: true },
      tags: { type: { map: "string" } }
    }
  },
  aws_security_group: {
    provider: AWS_PROVIDER,
    resourceType: "aws_security_group",
    attributes: {
      name: { type: "string" },
      description: { type: "string", required: true },
      vpc_id: { type: "string", required: true },
      ingress: {
        type: { list: { object: { from_port: "number", to_port: "number", protocol: "string", cidr_blocks: { list: "string" } } } }
      },
      egress: {
        type: { list: { object: { from_port: "number", to_port: "number", protocol: "string", cidr_blocks: { list: "string" } } } }
      },
      id: { type: "string", computed: true },
      tags: { type: { map: "string" } }
    }
  },
  aws_instance: {
    provider: AWS_PROVIDER,
    resourceType: "aws_instance",
    attributes: {
      ami: { type: "string", required: true },
      instance_type: { type: "string", required: true },
      subnet_id: { type: "string" },
      vpc_security_group_ids: { type: { list: "string" } },
      user_data: { type: "string" },
      id: { type: "string", computed: true },
      arn: { type: "string", computed: true },
      tags: { type: { map: "string" } }
    }
  },
  aws_s3_bucket: {
    provider: AWS_PROVIDER,
    resourceType: "aws_s3_bucket",
    attributes: {
      bucket: { type: "string", required: true },
      force_destroy: { type: "bool" },
      acl: { type: "string" },
      id: { type: "string", computed: true },
      arn: { type: "string", computed: true },
      tags: { type: { map: "string" } }
    }
  }
});

export const INITIAL_AWS_RESOURCE_TYPES = Object.freeze(Object.keys(awsResourceSchemaRegistry));

export function getAwsResourceSchema(resourceType: string) {
  return awsResourceSchemaRegistry[resourceType];
}
