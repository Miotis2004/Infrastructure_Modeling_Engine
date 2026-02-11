import { deflateRawSync } from "node:zlib";

import type { InfrastructureModel } from "../ir/model";
import { compileModelToTerraform } from "../compiler";
import type { TerraformFileSet } from "../compiler";

const ZIP_LOCAL_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[index] = crc >>> 0;
  }

  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    const offset = (crc ^ byte) & 0xff;
    crc = (crc >>> 8) ^ crcTable[offset];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  fileName: string;
  localHeader: Buffer;
  compressedData: Buffer;
  centralDirectory: Buffer;
}

function createZipEntry(fileName: string, content: string, offset: number): ZipEntry {
  const fileNameBuffer = Buffer.from(fileName, "utf8");
  const uncompressedData = Buffer.from(content, "utf8");
  const compressedData = deflateRawSync(uncompressedData);
  const contentCrc = crc32(uncompressedData);

  const localHeader = Buffer.alloc(30 + fileNameBuffer.length);
  localHeader.writeUInt32LE(ZIP_LOCAL_HEADER_SIGNATURE, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(8, 8);
  localHeader.writeUInt16LE(0, 10);
  localHeader.writeUInt16LE(0, 12);
  localHeader.writeUInt32LE(contentCrc, 14);
  localHeader.writeUInt32LE(compressedData.length, 18);
  localHeader.writeUInt32LE(uncompressedData.length, 22);
  localHeader.writeUInt16LE(fileNameBuffer.length, 26);
  localHeader.writeUInt16LE(0, 28);
  fileNameBuffer.copy(localHeader, 30);

  const centralDirectory = Buffer.alloc(46 + fileNameBuffer.length);
  centralDirectory.writeUInt32LE(ZIP_CENTRAL_HEADER_SIGNATURE, 0);
  centralDirectory.writeUInt16LE(20, 4);
  centralDirectory.writeUInt16LE(20, 6);
  centralDirectory.writeUInt16LE(0, 8);
  centralDirectory.writeUInt16LE(8, 10);
  centralDirectory.writeUInt16LE(0, 12);
  centralDirectory.writeUInt16LE(0, 14);
  centralDirectory.writeUInt32LE(contentCrc, 16);
  centralDirectory.writeUInt32LE(compressedData.length, 20);
  centralDirectory.writeUInt32LE(uncompressedData.length, 24);
  centralDirectory.writeUInt16LE(fileNameBuffer.length, 28);
  centralDirectory.writeUInt16LE(0, 30);
  centralDirectory.writeUInt16LE(0, 32);
  centralDirectory.writeUInt16LE(0, 34);
  centralDirectory.writeUInt16LE(0, 36);
  centralDirectory.writeUInt32LE(0, 38);
  centralDirectory.writeUInt32LE(offset, 42);
  fileNameBuffer.copy(centralDirectory, 46);

  return {
    fileName,
    localHeader,
    compressedData,
    centralDirectory
  };
}

export function createTerraformProjectZip(
  files: TerraformFileSet,
  options: { projectFolderName?: string } = {}
): Buffer {
  const folderPrefix = options.projectFolderName ? `${options.projectFolderName.replace(/\/$/, "")}/` : "";

  const orderedFiles = Object.entries(files).sort(([left], [right]) => left.localeCompare(right));
  const entries: ZipEntry[] = [];

  let offset = 0;
  for (const [fileName, content] of orderedFiles) {
    const entry = createZipEntry(`${folderPrefix}${fileName}`, content, offset);
    entries.push(entry);
    offset += entry.localHeader.length + entry.compressedData.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectoryBody = Buffer.concat(entries.map((entry) => entry.centralDirectory));

  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectoryBody.length, 12);
  endRecord.writeUInt32LE(centralDirectoryOffset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([
    ...entries.flatMap((entry) => [entry.localHeader, entry.compressedData]),
    centralDirectoryBody,
    endRecord
  ]);
}

export function compileModelToTerraformZip(
  model: InfrastructureModel,
  options: { projectFolderName?: string } = {}
): Buffer {
  const files = compileModelToTerraform(model);
  return createTerraformProjectZip(files, options);
}
