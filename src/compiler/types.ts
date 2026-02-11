import type { InfrastructureModel, OutputNode, ResourceNode, VariableNode } from "../ir/model";

export type CompilationTarget = "terraform" | (string & {});

export interface Compiler {
  readonly target: CompilationTarget;
  compile(model: InfrastructureModel): TerraformFileSet;
}

export interface CompileModelOptions {
  target?: CompilationTarget;
  featureFlags?: {
    multiTargetCompilation?: boolean;
  };
}

export interface TerraformFileSet {
  "providers.tf": string;
  "main.tf": string;
  "variables.tf": string;
  "outputs.tf": string;
}

export interface NormalizedResourceAst {
  resource: ResourceNode;
  localName: string;
  orderedAttributes: Array<[string, ResourceNode["attributes"][string]]>;
}

export interface NormalizedVariableAst {
  variable: VariableNode;
}

export interface NormalizedOutputAst {
  output: OutputNode;
}

export interface NormalizedModelAst {
  model: InfrastructureModel;
  variables: NormalizedVariableAst[];
  resources: NormalizedResourceAst[];
  outputs: NormalizedOutputAst[];
  resourceById: Map<string, NormalizedResourceAst>;
  providers: string[];
}
