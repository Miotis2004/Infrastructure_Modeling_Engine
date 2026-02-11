import type { InfrastructureModel } from "../ir/model";
import { normalizeModelAst } from "./normalize";
import { renderTerraformFileSet } from "./render";
import type { TerraformFileSet } from "./types";

export * from "./types";

export function compileModelToTerraform(model: InfrastructureModel): TerraformFileSet {
  const ast = normalizeModelAst(model);
  return renderTerraformFileSet(ast);
}
