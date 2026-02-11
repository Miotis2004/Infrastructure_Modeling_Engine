import type { InfrastructureModel, ResourceNode, TerraformType } from "../ir/model";
import type { ResourceSchemaRegistry } from "../schemas/types";

export type DiagnosticSeverity = "error" | "warning";

export interface ValidationDiagnostic {
  code: string;
  message: string;
  path: string;
  severity: DiagnosticSeverity;
}

export interface ValidationContext {
  model: InfrastructureModel;
  registry: ResourceSchemaRegistry;
}

export type ValidatorStage = (context: ValidationContext) => ValidationDiagnostic[];

export interface ValidationResult {
  diagnostics: ValidationDiagnostic[];
  isValid: boolean;
}

export interface ResourceWithIndex {
  resource: ResourceNode;
  index: number;
}

export function isTerraformTypeCompatible(value: unknown, type: TerraformType): boolean {
  if (type === "string") {
    return typeof value === "string";
  }

  if (type === "number") {
    return typeof value === "number";
  }

  if (type === "bool") {
    return typeof value === "boolean";
  }

  if ("list" in type) {
    return Array.isArray(value) && value.every((item) => isTerraformTypeCompatible(item, type.list));
  }

  if ("map" in type) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }

    return Object.values(value as Record<string, unknown>).every((item) => isTerraformTypeCompatible(item, type.map));
  }

  if ("object" in type) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }

    const recordValue = value as Record<string, unknown>;
    const entries = Object.entries(type.object);

    return entries.every(([key, objectType]) => isTerraformTypeCompatible(recordValue[key], objectType));
  }

  return false;
}
