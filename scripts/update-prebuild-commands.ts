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

  const finalReplacement = `\`\`\`sh
# Initial setup, or after changing expo-target.config.js, app.json, or adding/removing targets
npx expo prebuild --clean

# Swift files in targets/ are linked - no prebuild needed for code-only changes
\`\`\``;

  // Pattern 1a: Original simple format
  const pattern1a = /```sh\nnpx expo prebuild --clean\n```/g;

  // Pattern 1b: Incorrect format from first pass (with "Subsequent runs")
  const pattern1b = /```sh\n# Initial setup or after changing expo-target\.config\.js\nnpx expo prebuild --clean\n\n# Subsequent runs when editing Swift code only \(target files live outside \/ios\)\nnpx expo prebuild\n```/g;

  // Pattern 2: With cd command before it
  const pattern2 = /```sh\ncd your-expo-app\nbunx create-target ([a-z-]+)\n```\n\n```json\n\/\/ app\.json\n{\n  "expo": {\n    "plugins": \[\["@bacons\/apple-targets"\]\]\n  }\n}\n```\n\n```sh\nnpx expo prebuild --clean\n```/g;

  let updated = content;
  let changed = false;

  // Replace pattern 1a (original standalone prebuild command)
  if (pattern1a.test(content)) {
    updated = updated.replace(pattern1a, finalReplacement);
    changed = true;
  }

  // Replace pattern 1b (incorrect format from first pass)
  if (pattern1b.test(updated)) {
    updated = updated.replace(pattern1b, finalReplacement);
    changed = true;
  }

  // Replace pattern 2 (full setup section) - also handle old incorrect format
  const pattern2incorrect = /```sh\ncd your-expo-app\nbunx create-target ([a-z-]+)\n```\n\n```json\n\/\/ app\.json\n{\n  "expo": {\n    "plugins": \[\["@bacons\/apple-targets"\]\]\n  }\n}\n```\n\n```sh\n# Initial setup or after changing expo-target\.config\.js.*?\nnpx expo prebuild --clean\n\n# Subsequent runs when editing Swift code only.*?\nnpx expo prebuild\n```/gs;

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

${finalReplacement}`;
  });

  updated = updated.replace(pattern2incorrect, (match, targetType) => {
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

${finalReplacement}`;
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
