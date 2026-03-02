#!/usr/bin/env node

/**
 * import-designs.js
 *
 * CLI tool for importing new design mockups into the review system.
 *
 * Usage:
 *   node scripts/import-designs.js <source-dir> <component> <category>
 *
 * Example:
 *   node scripts/import-designs.js ../new-splashes splash aurora-v2
 *   node scripts/import-designs.js ./drafts controls slider-v3 --generation 2 --source-pr "#45"
 *
 * Options:
 *   --generation N     Generation number for the CATALOG entry (default: 1)
 *   --source-pr "#XX"  Source PR reference for traceability
 */

import { readdir, copyFile, mkdir, stat } from "node:fs/promises";
import { join, resolve, basename, extname } from "node:path";
import { existsSync } from "node:fs";

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function extractFlag(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  const value = args[idx + 1];
  args.splice(idx, 2);
  return value;
}

const generation = extractFlag("--generation") ?? "1";
const sourcePr = extractFlag("--source-pr") ?? null;

// Positional arguments (after flags have been removed)
const [sourceDir, component, category] = args;

if (!sourceDir || !component || !category) {
  console.error(
    `Usage: node scripts/import-designs.js <source-dir> <component> <category> [--generation N] [--source-pr "#XX"]`
  );
  console.error(
    `Example: node scripts/import-designs.js ../new-splashes splash aurora-v2`
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Resolve paths
// ---------------------------------------------------------------------------

const projectRoot = resolve(import.meta.dirname, "..");
const sourcePath = resolve(sourceDir);
const targetPath = join(projectRoot, "design-review", component, category);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

async function validateSourceDir(dir) {
  try {
    const info = await stat(dir);
    if (!info.isDirectory()) {
      console.error(`Error: "${dir}" is not a directory.`);
      process.exit(1);
    }
  } catch {
    console.error(`Error: Source directory "${dir}" does not exist.`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await validateSourceDir(sourcePath);

  // Collect .html files from the source directory
  const entries = await readdir(sourcePath);
  const htmlFiles = entries.filter(
    (f) => extname(f).toLowerCase() === ".html"
  );

  if (htmlFiles.length === 0) {
    console.error(
      `No .html files found in "${sourcePath}". Nothing to import.`
    );
    process.exit(1);
  }

  // Create target directory if it doesn't exist
  if (!existsSync(targetPath)) {
    await mkdir(targetPath, { recursive: true });
    console.log(`Created target directory: ${targetPath}`);
  }

  // Copy each .html file
  const copied = [];
  for (const file of htmlFiles) {
    const src = join(sourcePath, file);
    const dest = join(targetPath, file);
    await copyFile(src, dest);
    copied.push(file);
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log("");
  console.log("=== Import Summary ===");
  console.log(`  Source:      ${sourcePath}`);
  console.log(`  Target:      ${targetPath}`);
  console.log(`  Component:   ${component}`);
  console.log(`  Category:    ${category}`);
  console.log(`  Generation:  ${generation}`);
  if (sourcePr) {
    console.log(`  Source PR:   ${sourcePr}`);
  }
  console.log(`  Files copied (${copied.length}):`);
  for (const f of copied) {
    console.log(`    - ${f}`);
  }
  console.log("");

  // ---------------------------------------------------------------------------
  // Generate CATALOG entry snippets
  // ---------------------------------------------------------------------------

  console.log("=== CATALOG Entry Snippets ===");
  console.log(
    "Copy the following into the CATALOG object in design-review/index.html:\n"
  );

  for (const file of copied) {
    const name = basename(file, extname(file));
    const slug = `${component}-${category}-${name}`;
    const title = name
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const entry = {
      id: slug,
      title: title,
      component: component,
      category: category,
      file: `${component}/${category}/${file}`,
      generation: Number(generation),
      ...(sourcePr ? { sourcePr: sourcePr } : {}),
      dateAdded: new Date().toISOString().split("T")[0],
    };

    console.log(`// ${title}`);
    console.log(JSON.stringify(entry, null, 2) + ",\n");
  }

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
