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
  // (the fixture uses file:../../ which breaks when copied to a temp dir).
  // bun.lock pins the same specifier, so retarget that too before a frozen install.
  const packageRoot = path.resolve(__dirname, "..");
  retargetAppleTargetsLink(tmpDir, packageRoot);

  console.log("[e2e] Installing dependencies...");
  execSync("bun install --frozen-lockfile", {
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

/**
 * Point the copied fixture at this checkout and keep bun.lock frozen.
 * Bun records the file: dependency twice: the workspace specifier as written
 * (`file:../../`) and the package key with one trailing slash removed
 * (`file:../..`).
 */
function retargetAppleTargetsLink(tmpDir: string, packageRoot: string) {
  const pkgJsonPath = path.join(tmpDir, "package.json");
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
  const fromSpec = pkgJson.dependencies["@bacons/apple-targets"];
  const toSpec = `file:${packageRoot}`;
  pkgJson.dependencies["@bacons/apple-targets"] = toSpec;
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");

  const lockPath = path.join(tmpDir, "bun.lock");
  const fromKeySpec = fromSpec.endsWith("/") ? fromSpec.slice(0, -1) : fromSpec;
  let lock = fs.readFileSync(lockPath, "utf-8");
  const workspaceFrom = `"@bacons/apple-targets": "${fromSpec}"`;
  const workspaceTo = `"@bacons/apple-targets": "${toSpec}"`;
  const keyFrom = `@bacons/apple-targets@${fromKeySpec}`;
  const keyTo = `@bacons/apple-targets@${toSpec}`;
  if (!lock.includes(workspaceFrom) || !lock.includes(keyFrom)) {
    throw new Error(
      `e2e fixture bun.lock is missing the ${fromSpec} link; regenerate it with Bun 1.4.2`
    );
  }
  lock = lock.split(workspaceFrom).join(workspaceTo);
  lock = lock.split(keyFrom).join(keyTo);
  fs.writeFileSync(lockPath, lock);
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
