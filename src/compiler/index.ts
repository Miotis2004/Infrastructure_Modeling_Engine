import type { InfrastructureModel } from "../ir/model";
import { resolveEngineFeatureFlags } from "../featureFlags";
import { normalizeModelAst } from "./normalize";
import { renderTerraformFileSet } from "./render";
import type { CompileModelOptions, CompilationTarget, Compiler, TerraformFileSet } from "./types";

export * from "./types";

const TERRAFORM_TARGET: CompilationTarget = "terraform";

export const terraformCompiler: Compiler = {
  target: TERRAFORM_TARGET,
  compile(model) {
    const ast = normalizeModelAst(model);
    return renderTerraformFileSet(ast);
  }
};

export function compileModelToTerraform(model: InfrastructureModel, options: CompileModelOptions = {}): TerraformFileSet {
  const flags = resolveEngineFeatureFlags(options.featureFlags);
  const target = options.target ?? TERRAFORM_TARGET;

  if (target !== TERRAFORM_TARGET && !flags.multiTargetCompilation) {
    throw new Error(
      `Compilation target '${target}' is disabled. Enable the 'multiTargetCompilation' feature flag to use non-default targets.`
    );
  }

  if (target !== TERRAFORM_TARGET) {
    throw new Error(`Compilation target '${target}' is not implemented yet.`);
  }

  const ast = normalizeModelAst(model);
  return renderTerraformFileSet(ast);
}
