# Apple Targets Share Extension Demo

Added to Podfile:

```
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['APPLICATION_EXTENSION_API_ONLY'] = 'No'
       end
    end
```

Because only one `post_install do |installer|` is allowed.

- Need the build props `DEBUG` to be set in the configuration.
- Need to set:

```
 <key>NSAppTransportSecurity</key>
    <dict>
      <key>NSAllowsArbitraryLoads</key>
      <false/>
      <key>NSAllowsLocalNetworking</key>
      <true/>
    </dict>
```

- ip.txt must be written for physical device builds to work.
