import { readFile } from "fs/promises";
import { basename, resolve } from "path";

import { leads as fixtureLeads } from "../lib/fixtures/demo-data";
import { commitLeadImportToLocalStore } from "../lib/local-import/store";

function toFsPath(absolutePath: string) {
  if (process.platform === "win32" && !absolutePath.startsWith("\\?\\") && absolutePath.length > 240) {
    return `\\?\\${absolutePath}`;
  }

  return absolutePath;
}

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error("Usage: npm run import:local -- <file-path>");
    process.exitCode = 1;
    return;
  }

  const absolutePath = resolve(inputPath);
  const buffer = await readFile(toFsPath(absolutePath));
  const existingPhones = fixtureLeads.flatMap((lead) => [lead.parent_phone, lead.student_phone]).filter(Boolean) as string[];
  const result = await commitLeadImportToLocalStore({
    buffer,
    fileName: basename(absolutePath),
    sourcePath: absolutePath,
    existingPhones,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
