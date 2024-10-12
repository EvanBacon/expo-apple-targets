exclude = []
use_expo_modules!(exclude: exclude)
config = use_native_modules!

use_frameworks! :linkage => podfile_properties['ios.useFrameworks'].to_sym if podfile_properties['ios.useFrameworks']
use_frameworks! :linkage => ENV['USE_FRAMEWORKS'].to_sym if ENV['USE_FRAMEWORKS']

use_react_native!(
  :path => config[:reactNativePath],
  :hermes_enabled => podfile_properties['expo.jsEngine'] == nil || podfile_properties['expo.jsEngine'] == 'hermes',
  # An absolute path to your application root.
  :app_path => "#{Pod::Config.instance.installation_root}/..",
  :privacy_file_aggregation_enabled => podfile_properties['apple.privacyManifestAggregationEnabled'] != 'false',
)
