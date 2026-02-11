import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { compileModelToTerraform } from "../compiler";
import { sampleModelFixture } from "../fixtures/sampleModel";

const outputPathArg = process.argv[2];
if (!outputPathArg) {
  throw new Error("Usage: node dist/tools/renderFixtureTerraform.js <output-directory>");
}

const outputDirectory = resolve(outputPathArg);
rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });

const terraformFiles = compileModelToTerraform(sampleModelFixture);
for (const [fileName, content] of Object.entries(terraformFiles)) {
  writeFileSync(resolve(outputDirectory, fileName), content, "utf8");
}

console.log(`Rendered Terraform fixture to ${outputDirectory}`);
