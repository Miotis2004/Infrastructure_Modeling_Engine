import type { ValidatorStage, ValidationDiagnostic } from "./types";

const S3_BUCKET_REGEX = /^(?!\d+\.\d+\.\d+\.\d+$)(?!-)(?!.*--)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export const runAwsSemanticValidation: ValidatorStage = ({ model }) => {
  const diagnostics: ValidationDiagnostic[] = [];

  model.resources.forEach((resource, resourceIndex) => {
    const resourcePath = `resources[${resourceIndex}]`;

    if (resource.provider !== "aws") {
      return;
    }

    if (resource.resourceType === "aws_instance") {
      const ami = resource.attributes.ami;
      if (ami?.kind === "literal") {
        const amiValue = asString(ami.value);
        if (!amiValue || !amiValue.startsWith("ami-")) {
          diagnostics.push({
            code: "SEMANTIC_AWS_INSTANCE_AMI_FORMAT",
            message: `AMI for '${resource.id}' must be a string starting with 'ami-'.`,
            path: `${resourcePath}.attributes.ami`,
            severity: "error"
          });
        }
      }

      const instanceType = resource.attributes.instance_type;
      if (instanceType?.kind === "literal") {
        const instanceTypeValue = asString(instanceType.value);
        if (!instanceTypeValue || instanceTypeValue.trim().length === 0) {
          diagnostics.push({
            code: "SEMANTIC_AWS_INSTANCE_TYPE_EMPTY",
            message: `Instance type for '${resource.id}' cannot be empty.`,
            path: `${resourcePath}.attributes.instance_type`,
            severity: "error"
          });
        }
      }
    }

    if (resource.resourceType === "aws_security_group") {
      const ingress = resource.attributes.ingress;
      if (ingress?.kind === "literal" && Array.isArray(ingress.value)) {
        ingress.value.forEach((rule, ruleIndex) => {
          const fromPort = asNumber((rule as Record<string, unknown>).from_port);
          const toPort = asNumber((rule as Record<string, unknown>).to_port);

          if (fromPort === undefined || toPort === undefined || fromPort > toPort) {
            diagnostics.push({
              code: "SEMANTIC_AWS_SG_PORT_RANGE",
              message: `Ingress rule ${ruleIndex} for '${resource.id}' has an invalid port range.`,
              path: `${resourcePath}.attributes.ingress[${ruleIndex}]`,
              severity: "error"
            });
          }
        });
      }
    }

    if (resource.resourceType === "aws_s3_bucket") {
      const bucket = resource.attributes.bucket;
      if (bucket?.kind === "literal") {
        const bucketName = asString(bucket.value);

        if (!bucketName || !S3_BUCKET_REGEX.test(bucketName)) {
          diagnostics.push({
            code: "SEMANTIC_AWS_S3_BUCKET_NAME",
            message: `Bucket name for '${resource.id}' does not satisfy AWS naming constraints.`,
            path: `${resourcePath}.attributes.bucket`,
            severity: "error"
          });
        }
      }
    }
  });

  return diagnostics;
};
