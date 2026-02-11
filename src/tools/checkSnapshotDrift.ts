import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { compileModelToTerraform } from "../compiler";
import { sampleModelFixture } from "../fixtures/sampleModel";

const rendered = compileModelToTerraform(sampleModelFixture);
const goldenDir = path.join(process.cwd(), "src", "tests", "golden");

for (const [fileName, fileBody] of Object.entries(rendered)) {
  const expected = readFileSync(path.join(goldenDir, fileName), "utf8");
  assert.equal(fileBody, expected, `Snapshot drift detected for ${fileName}.`);
}

console.log("Snapshot drift check passed.");
