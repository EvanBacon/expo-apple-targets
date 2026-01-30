import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const PROJECT_DIR_FILE = path.join(__dirname, ".e2e-project-dir");

export default async function globalSetup() {
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "apple-targets-e2e-")
  );

  console.log(`\n[e2e] Copying fixture to ${tmpDir}`);

  // Copy fixture to temp directory (contains only config files + clip's custom AppDelegate)
  const fixturePath = path.join(__dirname, "fixture");
  fs.cpSync(fixturePath, tmpDir, { recursive: true });

  // Copy Swift template files from create-target into each target directory.
  // The fixture only stores expo-target.config.* files; the actual Swift source
  // files live in packages/create-target/templates/ as the single source of truth.
  const templatesDir = path.resolve(
    __dirname,
    "..",
    "..",
    "create-target",
    "templates"
  );
  const targetsDir = path.join(tmpDir, "targets");

  for (const targetName of fs.readdirSync(targetsDir)) {
    const templateDir = path.join(templatesDir, targetName);
    const destDir = path.join(targetsDir, targetName);

    if (!fs.existsSync(templateDir) || !fs.statSync(templateDir).isDirectory()) {
      continue;
    }

    // Copy all template files, skipping config files and files that already
    // exist in the fixture (e.g. clip/AppDelegate.swift is a custom override)
    copyTemplateFiles(templateDir, destDir);
  }

  console.log("[e2e] Copied Swift templates from create-target");

  // Rewrite package.json so the file: link uses an absolute path
  // (the fixture uses file:../../ which breaks when copied to a temp dir)
  const pkgJsonPath = path.join(tmpDir, "package.json");
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
  const packageRoot = path.resolve(__dirname, "..");
  pkgJson.dependencies["@bacons/apple-targets"] = `file:${packageRoot}`;
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");

  console.log("[e2e] Installing dependencies...");
  execSync("bun install", {
    cwd: tmpDir,
    stdio: "inherit",
    env: { ...process.env, CI: "1" },
  });

  const templatePath = path.join(__dirname, "..", "prebuild-blank.tgz");

  console.log("[e2e] Running expo prebuild...");
  execSync(
    `npx expo prebuild --template ${templatePath} -p ios --no-install --clean`,
    {
      cwd: tmpDir,
      stdio: "inherit",
      env: { ...process.env, CI: "1" },
    }
  );

  // Write the temp dir path for tests to read
  fs.writeFileSync(PROJECT_DIR_FILE, tmpDir, "utf-8");
  console.log(`[e2e] Project prebuilt at ${tmpDir}`);
}

/** Recursively copy files from src to dest, skipping expo-target.config.* and existing files. */
function copyTemplateFiles(src: string, dest: string) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    // Skip config files — those are maintained in the fixture
    if (entry.name.startsWith("expo-target.config.")) continue;
    // Skip pods.rb (CocoaPods config not needed for e2e)
    if (entry.name === "pods.rb") continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyTemplateFiles(srcPath, destPath);
    } else {
      // Don't overwrite files that already exist in the fixture (custom overrides)
      if (!fs.existsSync(destPath)) {
        fs.cpSync(srcPath, destPath);
      }
    }
  }
}
