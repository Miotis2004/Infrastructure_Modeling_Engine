export type TerraformPrimitive = "string" | "number" | "bool";

export type TerraformType =
  | TerraformPrimitive
  | { list: TerraformType }
  | { map: TerraformType }
  | { object: Record<string, TerraformType> };

export interface ProjectMetadata {
  name: string;
  description?: string;
  createdAt?: string;
}

export interface BaseNode {
  id: string;
  label: string;
  position?: { x: number; y: number };
}

export interface Reference {
  nodeId: string;
  attribute: string;
}

export type AttributeValue =
  | { kind: "literal"; value: unknown }
  | { kind: "reference"; ref: Reference }
  | { kind: "expression"; expression: string };

export interface LifecycleBlock {
  preventDestroy?: boolean;
  createBeforeDestroy?: boolean;
  ignoreChanges?: string[];
}

export interface VariableNode extends BaseNode {
  type: "variable";
  varType: TerraformType;
  defaultValue?: unknown;
  description?: string;
}

export interface ResourceNode extends BaseNode {
  type: "resource";
  provider: string;
  resourceType: string;
  attributes: Record<string, AttributeValue>;
  lifecycle?: LifecycleBlock;
}

export interface OutputNode extends BaseNode {
  type: "output";
  valueRef: Reference;
  description?: string;
}

export interface Edge {
  fromNodeId: string;
  fromAttribute: string;
  toNodeId: string;
  toAttribute: string;
}

export interface InfrastructureModel {
  version: string;
  metadata: ProjectMetadata;
  variables: VariableNode[];
  resources: ResourceNode[];
  outputs: OutputNode[];
  edges: Edge[];
}
