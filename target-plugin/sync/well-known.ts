export const KNOWN_EXTENSION_POINT_IDENTIFIERS = [
  "com.apple.AppSSO.idp-extension",
  "com.apple.ManagedSettings.shield-action-service",
  "com.apple.ManagedSettingsUI.shield-configuration-service",
  "com.apple.Safari.content-blocker",
  "com.apple.Safari.web-extension",
  "com.apple.appintents-extension",
  "com.apple.authentication-services-account-authentication-modification-ui",
  "com.apple.authentication-services-credential-provider-ui",
  "com.apple.background-asset-downloader-extension",
  "com.apple.broadcast-services-setupui",
  "com.apple.broadcast-services-upload",
  "com.apple.calendar.virtualconference",
  "com.apple.callkit.call-directory",
  "com.apple.classkit.context-provider",
  "com.apple.ctk-tokens",
  "com.apple.deviceactivity.monitor-extension",
  "com.apple.deviceactivityui.report-extension",
  "com.apple.fileprovider-actionsui",
  "com.apple.fileprovider-nonui",
  "com.apple.identitylookup.classification-ui",
  "com.apple.identitylookup.message-filter",
  "com.apple.intents-service",
  "com.apple.intents-ui-service",
  "com.apple.keyboard-service",
  "com.apple.location.push.service",
  "com.apple.matter.support.extension.device-setup",
  "com.apple.message-payload-provider",
  "com.apple.photo-editing",
  "com.apple.printing.discovery",
  "com.apple.quicklook.preview",
  "com.apple.quicklook.thumbnail",
  "com.apple.share-services",
  "com.apple.spotlight.import",
  "com.apple.ui-services",
  "com.apple.usernotifications.content-extension",
  "com.apple.usernotifications.service",
  "com.apple.widgetkit-extension",
];

// @ts-expect-error
const RECOMMENDED_ENTITLEMENTS: Record<Partial<ExtensionType>, any> = {
  "shield-config": {
    "com.apple.developer.family-controls": true,
  },
  "shield-action": {
    "com.apple.developer.family-controls": true,
  },
  "activity-report": {
    "com.apple.developer.family-controls": true,
  },
  "activity-monitor": {
    "com.apple.developer.family-controls": true,
  },
  clip: {
    "com.apple.developer.parent-application-identifiers": [
      "$(AppIdentifierPrefix)REPLACE_ME",
    ],
  },
  "autofill-credentials": {
    "com.apple.developer.authentication-services.autofill-credential-provider":
      true,
  },
  classkit: {
    "com.apple.developer.ClassKit-environment": true,
  },
  "network-extension": {
    "com.apple.security.application-groups": ["group.com.bacon.bacon-widget"],
  },
  share: {
    "com.apple.security.application-groups": ["group.com.bacon.bacon-widget"],
  },
  "file-provider": {
    "com.apple.security.application-groups": ["group.com.bacon.bacon-widget"],
  },
  "bg-download": {
    "com.apple.security.application-groups": ["group.com.bacon.bacon-widget"],
    // "com.apple.developer.team-identifier": "$(TeamIdentifierPrefix)",
  },
  "credentials-provider": {
    "com.apple.developer.authentication-services.autofill-credential-provider":
      true,
  },
  // 'media-discovery': {
  //     'com.apple.developer.media-device-discovery-extension': true,
  // }
};
