import fs from "fs";
import path from "path";

jest.unmock("fs");

const fixturePodfile = fs.readFileSync(
  path.join(__dirname, "./fixtures/52/Podfile"),
  "utf8"
);

import {
  addExtensionHookCocoaPods,
  addPostInstallExtensionHookCocoaPods,
} from "../withPodTargetExtension";

it(`adds extension pods to Podfile`, () => {
  const results = addExtensionHookCocoaPods(fixturePodfile);
  // matches a static snapshot
  expect(results.contents).toMatch(/apple-targets-extension-loader/);
  // did add new content
  expect(results.didMerge).toBe(true);
  // didn't remove old content
  expect(results.didClear).toBe(false);

  const modded = addExtensionHookCocoaPods(results.contents);
  // nothing changed
  expect(modded.didMerge).toBe(false);
  expect(modded.didClear).toBe(false);
});

it(`adds post_install hook to Podfile`, () => {
  const results = addPostInstallExtensionHookCocoaPods(fixturePodfile);
  // matches a static snapshot
  expect(results.contents).toMatch(
    /sync-d352962fa0b94d8aa90679ee0258481d46915020/
  );
  // did add new content
  expect(results.didMerge).toBe(true);
  // didn't remove old content
  expect(results.didClear).toBe(false);

  const modded = addPostInstallExtensionHookCocoaPods(results.contents);
  // nothing changed
  expect(modded.didMerge).toBe(false);
  expect(modded.didClear).toBe(false);
});
it(`adds both changes`, () => {
  const results = addPostInstallExtensionHookCocoaPods(
    addExtensionHookCocoaPods(fixturePodfile).contents
  ).contents;
  // matches a static snapshot
  expect(results).toMatchSnapshot();
});
