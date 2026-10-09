import { sanitizeNameForNonDisplayUse } from "./util";

export const POD_TARGET_LOADER_START =
  "# apple-targets-extension-loader -- Dynamic loading of target configurations";
export const POD_TARGET_LOADER_END = "# apple-targets-extension-loader-end";

export type PodTargetEntry = {
  /** Path of pods.rb relative to the ios/ directory (Podfile location). */
  podsRbRelativeToIos: string;
  /** Same product name withXcodeChanges uses for the native target. */
  productName: string;
};

/** Match the Xcode product name in with-widget.ts. */
export function productNameForTarget(
  name: string | undefined,
  targetDirName: string,
  type: string,
) {
  return (
    sanitizeNameForNonDisplayUse(name || targetDirName) ||
    sanitizeNameForNonDisplayUse(targetDirName) ||
    sanitizeNameForNonDisplayUse(type)
  );
}

function rubySingleQuoted(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/**
 * Emit a Podfile loader that opens `target '<productName>'` for each pods.rb.
 * Folder names are not used: expo-target.config `name` can diverge from the
 * directory (targets/widget + name "MyWidget" → target 'MyWidget').
 */
export function buildPodTargetExtension(entries: PodTargetEntry[]) {
  const rows = entries
    .map(
      (entry) =>
        `  ${rubySingleQuoted(entry.podsRbRelativeToIos)} => ${rubySingleQuoted(entry.productName)},`,
    )
    .join("\n");

  return `${POD_TARGET_LOADER_START}
# Product names match sanitizeNameForNonDisplayUse(config.name || folder).
{
${rows}
}.each do |relative_path, target_name|
  target_file = File.expand_path(relative_path, __dir__)
  next unless File.exist?(target_file)
  target target_name do
    target_binding = binding
    target_binding.local_variable_set(:podfile_properties, podfile_properties)
    eval(File.read(target_file), target_binding, target_file)
  end
end
${POD_TARGET_LOADER_END}
`;
}

export function upsertPodTargetExtension(
  podfile: string,
  entries: PodTargetEntry[],
) {
  const extension = buildPodTargetExtension(entries);
  const start = podfile.indexOf("# apple-targets-extension-loader");
  if (start === -1) {
    return `${podfile.replace(/\s*$/, "")}\n\n${extension}`;
  }

  const endMarker = podfile.indexOf(POD_TARGET_LOADER_END, start);
  if (endMarker !== -1) {
    const after = endMarker + POD_TARGET_LOADER_END.length;
    return `${podfile.slice(0, start)}${extension}${podfile.slice(after).replace(/^\n/, "")}`;
  }

  // Legacy loader was appended with no end marker. It is the tail of the Podfile.
  return `${podfile.slice(0, start).replace(/\s*$/, "")}\n\n${extension}`;
}
