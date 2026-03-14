import { readFile } from "fs/promises";
import { basename, resolve } from "path";

import { previewLeadImport } from "../lib/import/parser";

async function main() {
  const inputPaths = process.argv.slice(2);

  if (inputPaths.length === 0) {
    console.error("Usage: npm run import:preview -- <file-path> [more-files...]");
    process.exitCode = 1;
    return;
  }

  for (const inputPath of inputPaths) {
    const absolutePath = resolve(inputPath);
    const fsPath =
      process.platform === "win32" && !absolutePath.startsWith("\\\\?\\") && absolutePath.length > 240
        ? `\\\\?\\${absolutePath}`
        : absolutePath;
    const buffer = await readFile(fsPath);
    const preview = previewLeadImport({
      buffer,
      fileName: basename(absolutePath),
    });

    console.log(`\n=== ${absolutePath} ===`);
    console.log(JSON.stringify(preview, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
