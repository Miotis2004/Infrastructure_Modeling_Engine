import test from "node:test";
import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";

import { compileModelToTerraform } from "../compiler";
import { sampleModelFixture } from "../fixtures/sampleModel";
import { createSampleArchitectureTemplate } from "../frontend";
import { compileModelToTerraformZip, createTerraformProjectZip } from "../export";

interface ZipEntry {
  name: string;
  content: string;
}

function discoverZipEntries(archive: Buffer): ZipEntry[] {
  const signature = 0x04034b50;
  const entries: ZipEntry[] = [];

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
    const contentStart = nameEnd + extraLength;
    const contentEnd = contentStart + compressedSize;

    const fileName = archive.subarray(nameStart, nameEnd).toString("utf8");
    const compressedData = archive.subarray(contentStart, contentEnd);

    entries.push({
      name: fileName,
      content: inflateRawSync(compressedData).toString("utf8")
    });

    offset = contentEnd;
  }

  return entries;
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

  const names = discoverZipEntries(archive).map((entry) => entry.name);
  assert.deepEqual(names, ["demo/main.tf", "demo/outputs.tf", "demo/providers.tf", "demo/variables.tf"]);
});

test("compileModelToTerraformZip composes compile + zip export", () => {
  const archive = compileModelToTerraformZip(sampleModelFixture);

  assert.ok(archive.length > 64);
  const names = discoverZipEntries(archive).map((entry) => entry.name);
  assert.deepEqual(names, ["main.tf", "outputs.tf", "providers.tf", "variables.tf"]);
});

test("compileModelToTerraformZip is byte stable for unchanged model", () => {
  const firstArchive = compileModelToTerraformZip(sampleModelFixture);
  const secondArchive = compileModelToTerraformZip(sampleModelFixture);

  assert.deepEqual(firstArchive, secondArchive);
});

test("zip contents exactly match compiled Terraform preview output", () => {
  const files = compileModelToTerraform(sampleModelFixture);
  const archive = compileModelToTerraformZip(sampleModelFixture);
  const entries = discoverZipEntries(archive);

  assert.equal(entries.length, Object.keys(files).length);

  for (const entry of entries) {
    const previewContent = files[entry.name as keyof typeof files];
    assert.equal(entry.content, previewContent);
  }
});
