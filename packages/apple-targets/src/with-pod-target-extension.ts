import { ConfigPlugin, withPodfile } from "expo/config-plugins";

// TODO: This won't always match the correct target name. Need to pull the same algo in.
const extension = `# apple-targets-extension-loader -- Dynamic loading of target configurations
Dir.glob(File.join(__dir__, '..', 'targets', '**', 'pods.rb')).each do |target_file|
  target_name = File.basename(File.dirname(target_file))
  target target_name do
    # Create a new binding with access to necessary methods and variables
    target_binding = binding
    target_binding.local_variable_set(:podfile_properties, podfile_properties)

    # Evaluate the target file content in the new binding
    eval(File.read(target_file), target_binding, target_file)
  end
end
`;

/** Inject a helper which matches `pods.rb` files in the target root directory and invokes it as a way to extend the Podfile. */
export const withPodTargetExtension: ConfigPlugin = (config) =>
  withPodfile(config, (config) => {
    if (config.modResults.contents.includes("apple-targets-extension-loader")) {
      return config;
    }

    config.modResults.contents += "\n\n" + extension;

    return config;
  });
