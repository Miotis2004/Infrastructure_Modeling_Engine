import test from "node:test";
import assert from "node:assert/strict";

import { compileModelToTerraform } from "../compiler";
import { sampleModelFixture } from "../fixtures/sampleModel";
import { createSampleArchitectureTemplate } from "../frontend";
import { compileModelToTerraformZip, createTerraformProjectZip } from "../export";

function discoverZipEntryNames(archive: Buffer): string[] {
  const signature = 0x04034b50;
  const names: string[] = [];

  let offset = 0;
  while (offset + 30 <= archive.length) {
    if (archive.readUInt32LE(offset) !== signature) {
      break;
    }

    const compressedSize = archive.readUInt32LE(offset + 18);
    const fileNameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + fileNameLength;

    names.push(archive.subarray(nameStart, nameEnd).toString("utf8"));

    offset = nameEnd + extraLength + compressedSize;
  }

  return names;
}

test("one-click sample architecture template returns clone of fixture", () => {
  const template = createSampleArchitectureTemplate();

  assert.deepEqual(template, sampleModelFixture);
  assert.notEqual(template, sampleModelFixture);
});

test("export-to-ZIP packages deterministic Terraform project files", () => {
  const files = compileModelToTerraform(sampleModelFixture);
  const archive = createTerraformProjectZip(files, { projectFolderName: "demo" });

  assert.equal(archive.readUInt32LE(0), 0x04034b50);

  const names = discoverZipEntryNames(archive);
  assert.deepEqual(names, ["demo/main.tf", "demo/outputs.tf", "demo/providers.tf", "demo/variables.tf"]);
});

test("compileModelToTerraformZip composes compile + zip export", () => {
  const archive = compileModelToTerraformZip(sampleModelFixture);

  assert.ok(archive.length > 64);
  const names = discoverZipEntryNames(archive);
  assert.deepEqual(names, ["main.tf", "outputs.tf", "providers.tf", "variables.tf"]);
});
