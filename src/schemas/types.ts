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
  unsupportedConstructs?: UnsupportedSchemaConstruct[];
}

export type ResourceSchemaRegistry = Record<string, ResourceSchema>;

export type UnsupportedSchemaConstructCode =
  | "dynamic_blocks"
  | "polymorphic_types"
  | "provider_defined_functions"
  | "cross_resource_conditionals"
  | "unknown";

export interface UnsupportedSchemaConstruct {
  code: UnsupportedSchemaConstructCode;
  message: string;
  path?: string;
  blocking?: boolean;
}
