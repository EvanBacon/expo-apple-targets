require File.join(File.dirname(`node --print "require.resolve('react-native/package.json')"`), "scripts/react_native_pods")

exclude = [
  # Bug in Expo Updates preventing it from working with App Clips.
  "expo-updates"
]
use_expo_modules!(exclude: exclude)

if ENV['EXPO_USE_COMMUNITY_AUTOLINKING'] == '1'
  config_command = ['node', '-e', "process.argv=['', '', 'config'];require('@react-native-community/cli').run()"];
else
  config_command = [
    'node',
    '--no-warnings',
    '--eval',
    'require(require.resolve(\'expo-modules-autolinking\', { paths: [require.resolve(\'expo/package.json\')] }))(process.argv.slice(1))',
    'react-native-config',
    '--json',
    '--platform',
    'ios'
  ]
end

config = use_native_modules!(config_command)

use_frameworks! :linkage => podfile_properties['ios.useFrameworks'].to_sym if podfile_properties['ios.useFrameworks']
use_frameworks! :linkage => ENV['USE_FRAMEWORKS'].to_sym if ENV['USE_FRAMEWORKS']

use_react_native!(
  :path => config[:reactNativePath],
  :hermes_enabled => podfile_properties['expo.jsEngine'] == nil || podfile_properties['expo.jsEngine'] == 'hermes',
  # An absolute path to your application root.
  :app_path => "#{Pod::Config.instance.installation_root}/..",
  :privacy_file_aggregation_enabled => podfile_properties['apple.privacyManifestAggregationEnabled'] != 'false',
)