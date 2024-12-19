import { ConfigPlugin, withPodfile } from "expo/config-plugins";
import {
  mergeContents,
  MergeResults,
  removeContents,
} from "@expo/config-plugins/build/utils/generateCode";

// TODO: This won't always match the correct target name. Need to pull the same algo in.
const extension = `
post_install_hooks = []

Dir.glob(File.join(__dir__, '..', 'targets', '**', 'pods.rb')).each do |target_file|
  target_name = File.basename(File.dirname(target_file))
  target target_name do
    target_binding = binding
    target_binding.local_variable_set(:podfile_properties, podfile_properties)

    eval(File.read(target_file), target_binding, target_file)

    if target_binding.local_variable_defined?(:target_post_install)
      post_install_hooks ||= []
      post_install_hooks << target_binding.local_variable_get(:target_post_install)
    end
  end
end
`;

export function addExtensionHookCocoaPods(src: string): MergeResults {
  return mergeContents({
    tag: "apple-targets-extension-loader",
    src,
    newSrc: extension,
    anchor: /prepare_react_native_project/,
    offset: 1,
    comment: "#",
  });
}

export function addPostInstallExtensionHookCocoaPods(
  src: string
): MergeResults {
  const next = [
    "post_install_hooks.each do |hook|",
    "  hook.call(installer)",
    "end",
  ]
    .map((l) => "    " + l)
    .join("\n");
  return mergeContents({
    tag: "apple-targets-extension-post-install",
    src,
    newSrc: next,
    anchor: /post_install do \|installer\|/,
    offset: 1,
    comment: "#",
  });
}

/** Inject a helper which matches `pods.rb` files in the target root directory and invokes it as a way to extend the Podfile. */
export const withPodTargetExtension: ConfigPlugin = (config) =>
  withPodfile(config, (config) => {
    config.modResults.contents = addExtensionHookCocoaPods(
      config.modResults.contents
    ).contents;
    config.modResults.contents = addPostInstallExtensionHookCocoaPods(
      config.modResults.contents
    ).contents;
    return config;
  });
