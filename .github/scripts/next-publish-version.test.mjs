import assert from "node:assert/strict";
import test from "node:test";

import { nextPublishVersion } from "./next-publish-version.mjs";

test("uses local 6.0.0 when npm latest is 5.0.0", () => {
  assert.equal(nextPublishVersion("6.0.0", "5.0.0"), "6.0.0");
  assert.equal(
    nextPublishVersion("6.0.0", "5.0.0", "beta.12.1"),
    "6.0.0-beta.12.1",
  );
});

test("treats a missing npm latest as 0.0.0 and keeps the local major", () => {
  assert.equal(nextPublishVersion("6.0.0", ""), "6.0.0");
  assert.equal(nextPublishVersion("6.0.0", "   "), "6.0.0");
});

test("bumps the patch when local is not strictly newer", () => {
  assert.equal(nextPublishVersion("6.0.0", "6.0.0"), "6.0.1");
  assert.equal(nextPublishVersion("5.0.0", "5.0.5"), "5.0.6");
  assert.equal(nextPublishVersion("6.0.0", "6.1.0"), "6.1.1");
  assert.equal(nextPublishVersion("3.0.5", "3.0.5", "beta.4.2"), "3.0.6-beta.4.2");
});

test("does not bump again when local is already ahead by a patch", () => {
  assert.equal(nextPublishVersion("6.0.1", "6.0.0"), "6.0.1");
});
