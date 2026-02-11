import type { ResourceNode } from "../ir/model";
import type { NormalizedModelAst, NormalizedResourceAst } from "./types";
import type { InfrastructureModel } from "../ir/model";

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b);
}

function sortAttributeEntries(attributes: ResourceNode["attributes"]): Array<[string, ResourceNode["attributes"][string]]> {
  return Object.entries(attributes).sort(([left], [right]) => compareStrings(left, right));
}

function sanitizeTerraformName(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, "_");
}

function normalizeResource(resource: ResourceNode): NormalizedResourceAst {
  return {
    resource,
    localName: sanitizeTerraformName(resource.id),
    orderedAttributes: sortAttributeEntries(resource.attributes)
  };
}

export function normalizeModelAst(model: InfrastructureModel): NormalizedModelAst {
  const variables = [...model.variables]
    .sort((left, right) => compareStrings(left.id, right.id))
    .map((variable) => ({ variable }));

  const resources = [...model.resources]
    .sort((left, right) => {
      const byType = compareStrings(left.resourceType, right.resourceType);
      if (byType !== 0) {
        return byType;
      }

      return compareStrings(left.id, right.id);
    })
    .map(normalizeResource);

  const outputs = [...model.outputs]
    .sort((left, right) => compareStrings(left.id, right.id))
    .map((output) => ({ output }));

  const resourceById = new Map(resources.map((resourceAst) => [resourceAst.resource.id, resourceAst]));
  const providers = [...new Set(resources.map((resourceAst) => resourceAst.resource.provider))].sort(compareStrings);

  return {
    model,
    variables,
    resources,
    outputs,
    resourceById,
    providers
  };
}
