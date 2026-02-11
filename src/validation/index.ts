import type { InfrastructureModel } from "../ir/model";
import { awsResourceSchemaRegistry } from "../schemas/aws";
import type { ResourceSchemaRegistry } from "../schemas/types";
import { runGraphValidation } from "./graphValidation";
import { runSchemaValidation } from "./schemaValidation";
import { runAwsSemanticValidation } from "./semanticValidation";
import type { ValidationResult } from "./types";

export * from "./types";

export function validateModel(
  model: InfrastructureModel,
  registry: ResourceSchemaRegistry = awsResourceSchemaRegistry
): ValidationResult {
  const context = { model, registry };

  const diagnostics = [
    ...runSchemaValidation(context),
    ...runGraphValidation(context),
    ...runAwsSemanticValidation(context)
  ];

  return {
    diagnostics,
    isValid: diagnostics.every((diagnostic) => diagnostic.severity !== "error")
  };
}
