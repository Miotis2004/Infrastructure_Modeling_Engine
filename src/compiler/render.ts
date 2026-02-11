import type { AttributeValue, TerraformType } from "../ir/model";
import type { NormalizedModelAst, NormalizedResourceAst, TerraformFileSet } from "./types";

function renderTerraformType(type: TerraformType): string {
  if (typeof type === "string") {
    return type;
  }

  if ("list" in type) {
    return `list(${renderTerraformType(type.list)})`;
  }

  if ("map" in type) {
    return `map(${renderTerraformType(type.map)})`;
  }

  const orderedEntries = Object.entries(type.object).sort(([left], [right]) => left.localeCompare(right));
  const body = orderedEntries.map(([key, value]) => `${key} = ${renderTerraformType(value)}`).join(", ");

  return `object({ ${body} })`;
}

function renderLiteral(value: unknown, indentLevel = 0): string {
  const indent = "  ".repeat(indentLevel);
  const childIndent = "  ".repeat(indentLevel + 1);

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    const items = value.map((item) => `${childIndent}${renderLiteral(item, indentLevel + 1)}`).join(",\n");
    return `[\n${items}\n${indent}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    if (entries.length === 0) {
      return "{}";
    }

    const lines = entries
      .map(([key, nestedValue]) => `${childIndent}${key} = ${renderLiteral(nestedValue, indentLevel + 1)}`)
      .join("\n");

    return `{\n${lines}\n${indent}}`;
  }

  return JSON.stringify(value);
}

function renderReferenceExpression(ast: NormalizedModelAst, nodeId: string, attribute: string): string {
  const target = ast.resourceById.get(nodeId);
  if (!target) {
    return `null # unresolved reference ${nodeId}.${attribute}`;
  }

  return `${target.resource.resourceType}.${target.localName}.${attribute}`;
}

function renderAttributeValue(ast: NormalizedModelAst, value: AttributeValue, indentLevel = 0): string {
  if (value.kind === "literal") {
    return renderLiteral(value.value, indentLevel);
  }

  if (value.kind === "expression") {
    return value.expression;
  }

  return renderReferenceExpression(ast, value.ref.nodeId, value.ref.attribute);
}

function renderResourceBlock(ast: NormalizedModelAst, resourceAst: NormalizedResourceAst): string {
  const lines = resourceAst.orderedAttributes.map(
    ([attribute, value]) => `  ${attribute} = ${renderAttributeValue(ast, value, 1)}`
  );

  return `resource ${JSON.stringify(resourceAst.resource.resourceType)} ${JSON.stringify(resourceAst.localName)} {\n${lines.join("\n")}\n}`;
}

function renderProvidersFile(ast: NormalizedModelAst): string {
  const providerBlocks = ast.providers.map((provider) => `provider ${JSON.stringify(provider)} {\n}`).join("\n\n");
  return [
    "terraform {",
    "  required_version = \">= 1.5.0\"",
    "}",
    "",
    providerBlocks
  ]
    .join("\n")
    .trimEnd() + "\n";
}

function renderVariablesFile(ast: NormalizedModelAst): string {
  if (ast.variables.length === 0) {
    return "";
  }

  const body = ast.variables
    .map(({ variable }) => {
      const lines = [`variable ${JSON.stringify(variable.id)} {`, `  type = ${renderTerraformType(variable.varType)}`];
      if (typeof variable.defaultValue !== "undefined") {
        lines.push(`  default = ${renderLiteral(variable.defaultValue, 1)}`);
      }

      if (variable.description) {
        lines.push(`  description = ${JSON.stringify(variable.description)}`);
      }

      lines.push("}");
      return lines.join("\n");
    })
    .join("\n\n");

  return `${body}\n`;
}

function renderOutputsFile(ast: NormalizedModelAst): string {
  if (ast.outputs.length === 0) {
    return "";
  }

  const body = ast.outputs
    .map(({ output }) => {
      const lines = [
        `output ${JSON.stringify(output.id)} {`,
        `  value = ${renderReferenceExpression(ast, output.valueRef.nodeId, output.valueRef.attribute)}`
      ];

      if (output.description) {
        lines.push(`  description = ${JSON.stringify(output.description)}`);
      }

      lines.push("}");
      return lines.join("\n");
    })
    .join("\n\n");

  return `${body}\n`;
}

function renderMainFile(ast: NormalizedModelAst): string {
  if (ast.resources.length === 0) {
    return "";
  }

  return `${ast.resources.map((resourceAst) => renderResourceBlock(ast, resourceAst)).join("\n\n")}\n`;
}

export function renderTerraformFileSet(ast: NormalizedModelAst): TerraformFileSet {
  return {
    "providers.tf": renderProvidersFile(ast),
    "main.tf": renderMainFile(ast),
    "variables.tf": renderVariablesFile(ast),
    "outputs.tf": renderOutputsFile(ast)
  };
}
