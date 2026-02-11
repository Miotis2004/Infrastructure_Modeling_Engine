import type { ValidationDiagnostic, ValidatorStage } from "./types";
import { isTerraformTypeCompatible } from "./types";

export const runSchemaValidation: ValidatorStage = ({ model, registry }) => {
  const diagnostics: ValidationDiagnostic[] = [];

  model.resources.forEach((resource, resourceIndex) => {
    const resourcePath = `resources[${resourceIndex}]`;
    const schema = registry[resource.resourceType];

    if (!schema) {
      diagnostics.push({
        code: "SCHEMA_RESOURCE_TYPE_UNKNOWN",
        message: `Resource type '${resource.resourceType}' is not registered in schema registry.`,
        path: `${resourcePath}.resourceType`,
        severity: "error"
      });
      return;
    }

    if (schema.provider !== resource.provider) {
      diagnostics.push({
        code: "SCHEMA_PROVIDER_MISMATCH",
        message: `Provider '${resource.provider}' does not match schema provider '${schema.provider}' for type '${resource.resourceType}'.`,
        path: `${resourcePath}.provider`,
        severity: "error"
      });
    }

    Object.entries(resource.attributes).forEach(([attributeName, attributeValue]) => {
      const attributePath = `${resourcePath}.attributes.${attributeName}`;
      const attributeSchema = schema.attributes[attributeName];

      if (!attributeSchema) {
        diagnostics.push({
          code: "SCHEMA_ATTRIBUTE_UNKNOWN",
          message: `Attribute '${attributeName}' is not defined on schema '${resource.resourceType}'.`,
          path: attributePath,
          severity: "error"
        });
        return;
      }

      if (attributeSchema.computed && attributeValue.kind === "literal") {
        diagnostics.push({
          code: "SCHEMA_ATTRIBUTE_COMPUTED_SET",
          message: `Computed attribute '${attributeName}' should not be assigned a literal value.`,
          path: attributePath,
          severity: "error"
        });
        return;
      }

      if (attributeValue.kind === "literal" && !isTerraformTypeCompatible(attributeValue.value, attributeSchema.type)) {
        diagnostics.push({
          code: "SCHEMA_ATTRIBUTE_TYPE_MISMATCH",
          message: `Attribute '${attributeName}' value does not match expected Terraform type.`,
          path: attributePath,
          severity: "error"
        });
      }
    });

    Object.entries(schema.attributes)
      .filter(([, attributeSchema]) => attributeSchema.required)
      .forEach(([requiredAttribute]) => {
        if (!(requiredAttribute in resource.attributes)) {
          diagnostics.push({
            code: "SCHEMA_REQUIRED_ATTRIBUTE_MISSING",
            message: `Required attribute '${requiredAttribute}' is missing for resource '${resource.id}'.`,
            path: `${resourcePath}.attributes.${requiredAttribute}`,
            severity: "error"
          });
        }
      });
  });

  return diagnostics;
};
