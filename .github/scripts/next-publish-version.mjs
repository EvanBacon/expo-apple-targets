import { pathToFileURL } from "node:url";

/**
 * Choose the npm version both publish workflows should ship.
 *
 * If package.json is strictly newer than npm dist-tags.latest, publish that
 * version with no extra patch bump (6.0.0 local vs 5.0.0 published stays
 * 6.0.0). Otherwise bump the patch of the higher version, same as before.
 * A missing published version counts as 0.0.0.
 *
 * Optional prerelease (no leading hyphen) is appended: 6.0.0 + beta.1.1
 * → 6.0.0-beta.1.1.
 */
export function nextPublishVersion(local, published, prerelease = "") {
  const localParts = parseVersion(local);
  const publishedParts = parseVersion(
    published == null || String(published).trim() === "" ? "0.0.0" : published,
  );
  const base =
    compare(localParts, publishedParts) > 0
      ? localParts
      : bumpPatch(maxVersion(localParts, publishedParts));
  const core = base.join(".");
  const tag = String(prerelease || "").trim().replace(/^-/, "");
  return tag ? `${core}-${tag}` : core;
}

function parseVersion(version) {
  const core = String(version).trim().split("-")[0];
  const parts = core.split(".").map((part) => {
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid semver component "${part}" in "${version}"`);
    }
    return value;
  });
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

function compare(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function maxVersion(a, b) {
  return compare(a, b) >= 0 ? a.slice() : b.slice();
}

function bumpPatch(parts) {
  const next = parts.slice();
  next[2] += 1;
  return next;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [local, published = "", prerelease = ""] = process.argv.slice(2);
  if (!local) {
    console.error(
      "usage: next-publish-version.mjs <local> [published] [prerelease]",
    );
    process.exit(1);
  }
  process.stdout.write(`${nextPublishVersion(local, published, prerelease)}\n`);
}
