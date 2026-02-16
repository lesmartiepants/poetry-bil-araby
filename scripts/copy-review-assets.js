#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');

const REVIEW_ASSET_DIRECTORIES = ['design-review-output', 'mockups'];

if (!fs.existsSync(distDir)) {
  console.error('Build output directory "dist" not found.');
  process.exit(1);
}

for (const directory of REVIEW_ASSET_DIRECTORIES) {
  const sourcePath = path.join(repoRoot, directory);
  const destinationPath = path.join(distDir, directory);

  if (!fs.existsSync(sourcePath)) {
    console.warn(`Skipping ${directory}: source directory does not exist.`);
    continue;
  }

  fs.cpSync(sourcePath, destinationPath, { recursive: true, force: true });
  console.log(`Copied ${directory} -> dist/${directory}`);
}
