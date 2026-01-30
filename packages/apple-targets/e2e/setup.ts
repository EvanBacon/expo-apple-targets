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

  // Copy fixture to temp directory
  const fixturePath = path.join(__dirname, "fixture");
  fs.cpSync(fixturePath, tmpDir, { recursive: true });

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
