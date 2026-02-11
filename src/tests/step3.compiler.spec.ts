import test from "node:test";
import assert from "node:assert/strict";

import type { InfrastructureModel } from "../ir/model";
import { sampleModelFixture } from "../fixtures/sampleModel";
import { compileModelToTerraform } from "../compiler";

function cloneFixture(): InfrastructureModel {
  return structuredClone(sampleModelFixture as InfrastructureModel);
}

const expectedProvidersTf = `terraform {
  required_version = ">= 1.5.0"
}

provider "aws" {
}
`;

const expectedMainTf = `resource "aws_instance" "res_instance_web" {
  ami = "ami-0c02fb55956c7d316"
  instance_type = "t3.micro"
  subnet_id = aws_subnet.res_subnet_public.id
  vpc_security_group_ids = [aws_security_group.res_sg_web.id]
}

resource "aws_s3_bucket" "res_bucket_logs" {
  bucket = "ime-demo-logs-bucket"
  force_destroy = false
  tags = {
    Name = "ime-logs"
  }
}

resource "aws_security_group" "res_sg_web" {
  description = "Allow web traffic"
  ingress = [
    {
      cidr_blocks = [
        "0.0.0.0/0"
      ]
      from_port = 80
      protocol = "tcp"
      to_port = 80
    }
  ]
  vpc_id = aws_vpc.res_vpc_main.id
}

resource "aws_subnet" "res_subnet_public" {
  availability_zone = "us-east-1a"
  cidr_block = "10.0.1.0/24"
  tags = {
    Name = "ime-public-subnet"
  }
  vpc_id = aws_vpc.res_vpc_main.id
}

resource "aws_vpc" "res_vpc_main" {
  cidr_block = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support = true
  tags = {
    Name = "ime-main-vpc"
  }
}
`;

const expectedVariablesTf = `variable "var_aws_region" {
  type = string
  default = "us-east-1"
  description = "Deployment region"
}
`;

const expectedOutputsTf = `output "out_bucket_arn" {
  value = aws_s3_bucket.res_bucket_logs.arn
  description = "ARN of the logs bucket"
}

output "out_instance_id" {
  value = aws_instance.res_instance_web.id
  description = "ID of the web instance"
}
`;

test("compiler produces expected Terraform snapshot files", () => {
  const output = compileModelToTerraform(cloneFixture());

  assert.equal(output["providers.tf"], expectedProvidersTf);
  assert.equal(output["main.tf"], expectedMainTf);
  assert.equal(output["variables.tf"], expectedVariablesTf);
  assert.equal(output["outputs.tf"], expectedOutputsTf);
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
