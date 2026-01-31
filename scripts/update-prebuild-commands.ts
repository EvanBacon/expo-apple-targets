#!/usr/bin/env bun
/**
 * Updates all skill files to use nuanced prebuild commands instead of always using --clean
 */

import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const SKILLS_DIR = join(import.meta.dir, "../skills");

// Files to skip
const SKIP_FILES = new Set(["_template.md", "SKILL.md", "README.md"]);

async function updateSkillFile(filePath: string): Promise<boolean> {
  const content = await readFile(filePath, "utf-8");

  // Pattern 1: Simple three-line format (most common)
  const pattern1 = /```sh\nnpx expo prebuild --clean\n```/g;
  const replacement1 = `\`\`\`sh
# Initial setup or after changing expo-target.config.js
npx expo prebuild --clean

# Subsequent runs when editing Swift code only (target files live outside /ios)
npx expo prebuild
\`\`\``;

  // Pattern 2: With cd command before it
  const pattern2 = /```sh\ncd your-expo-app\nbunx create-target ([a-z-]+)\n```\n\n```json\n\/\/ app\.json\n{\n  "expo": {\n    "plugins": \[\["@bacons\/apple-targets"\]\]\n  }\n}\n```\n\n```sh\nnpx expo prebuild --clean\n```/g;

  let updated = content;
  let changed = false;

  // Replace pattern 1 (standalone prebuild command)
  if (pattern1.test(content)) {
    updated = updated.replace(pattern1, replacement1);
    changed = true;
  }

  // Replace pattern 2 (full setup section)
  updated = updated.replace(pattern2, (match, targetType) => {
    changed = true;
    return `\`\`\`sh
cd your-expo-app
bunx create-target ${targetType}
\`\`\`

\`\`\`json
// app.json
{
  "expo": {
    "plugins": [["@bacons/apple-targets"]]
  }
}
\`\`\`

\`\`\`sh
# Initial setup or after changing expo-target.config.js
npx expo prebuild --clean

# Subsequent runs when editing Swift code only (target files live outside /ios)
npx expo prebuild
\`\`\``;
  });

  if (changed) {
    await writeFile(filePath, updated, "utf-8");
    return true;
  }

  return false;
}

async function main() {
  const files = await readdir(SKILLS_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md") && !SKIP_FILES.has(f));

  console.log(`Updating ${mdFiles.length} skill files...`);

  let updatedCount = 0;
  for (const file of mdFiles) {
    const filePath = join(SKILLS_DIR, file);
    try {
      const updated = await updateSkillFile(filePath);
      if (updated) {
        console.log(`✓ ${file}`);
        updatedCount++;
      } else {
        console.log(`- ${file} (no changes needed)`);
      }
    } catch (error) {
      console.error(`✗ ${file}: ${error}`);
    }
  }

  console.log(`\nUpdated ${updatedCount} of ${mdFiles.length} files.`);
}

main().catch(console.error);
