export type TerraformPrimitive = "string" | "number" | "bool";

export type TerraformType =
  | TerraformPrimitive
  | { list: TerraformType }
  | { map: TerraformType }
  | { object: Record<string, TerraformType> };

export interface ProjectMetadata {
  name: string;
  description?: string;
}

export interface InfrastructureModel {
  version: string;
  metadata: ProjectMetadata;
}
