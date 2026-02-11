import type { TerraformType } from "../ir/model";

export interface AttributeSchema {
  type: TerraformType;
  required?: boolean;
  computed?: boolean;
  nestedBlocks?: Record<string, AttributeSchema>;
  conflictsWith?: string[];
  dependsOn?: string[];
}

export interface ResourceSchema {
  provider: string;
  resourceType: string;
  attributes: Record<string, AttributeSchema>;
}

export type ResourceSchemaRegistry = Record<string, ResourceSchema>;
