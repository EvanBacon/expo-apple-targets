import path from "path";
import { ConfigPlugin, withDangerousMod } from "@expo/config-plugins";
import {
  withIosAccentColor,
  withIosWidgetBackgroundColor,
} from "./accentColor/withAccentColor";
import { withIosIcon } from "./icon/withIosIcon";
import { withXcodeChanges, ExtensionType } from "./withXcodeChanges";
import { withXcodeProjectBetaBaseMod } from "./withXcparse";
import fs from "fs";

type Props = {
  directory?: string;
  name?: string;
  icon?: string;
  accentColor?: { color: string; darkColor?: string } | string;
  backgroundColor?: { color: string; darkColor?: string } | string;
  /** 16.4 */
  deploymentTarget?: string;

  type: ExtensionType;
  frameworks?: string[];
};

import {
  ENTRY_FILE,
  INFO_PLIST,
  INTENT_DEFINITION,
  WIDGET,
} from "./fixtures/template";

function kebabToCamelCase(str: string) {
  return str.replace(/-([a-z])/g, function (g) {
    return g[1].toUpperCase();
  });
}

import plist from "@expo/plist";

function getInfoPlistForType(type: ExtensionType) {
  if (type === "widget") {
    return INFO_PLIST;
  } else if (type === "notification-service") {
    return plist.build({
      NSExtension: {
        NSExtensionAttributes: {
          NSExtensionActivationRule: "TRUEPREDICATE",
        },
        // TODO: Update `NotificationService` dynamically
        NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).NotificationService",
        // NSExtensionMainStoryboard: 'MainInterface',
        NSExtensionPointIdentifier: "com.apple.usernotifications.service",
      },
    });
  } else if (type === "spotlight") {
    return plist.build({
      CSExtensionLabel: "myImporter",
      NSExtension: {
        NSExtensionAttributes: {
          CSSupportedContentTypes: ["com.example.plain-text"],
        },
        // TODO: Update `ImportExtension` dynamically
        NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).ImportExtension",
        // NSExtensionMainStoryboard: 'MainInterface',
        NSExtensionPointIdentifier: "com.apple.spotlight.import",
      },
    });
  } else if (type === "share") {
    return plist.build({
      NSExtension: {
        NSExtensionAttributes: {
          NSExtensionActivationRule: "TRUEPREDICATE",
        },
        // TODO: Update `ShareViewController` dynamically
        NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).ShareViewController",
        // NSExtensionMainStoryboard: 'MainInterface',
        NSExtensionPointIdentifier: "com.apple.share-services",
      },
    });
  } else if (type === "intent-ui") {
    return plist.build({
      NSExtension: {
        NSExtensionAttributes: {
          IntentsSupported: ["INSendMessageIntent"],
        },
        // TODO: Update `IntentViewController` dynamically
        NSExtensionPrincipalClass:
          "$(PRODUCT_MODULE_NAME).IntentViewController",
        NSExtensionPointIdentifier: "com.apple.intents-ui-service",
      },
    });
  } else if (type === "intent") {
    return plist.build({
      NSExtension: {
        NSExtensionAttributes: {
          IntentsRestrictedWhileLocked: [],
          IntentsSupported: [
            "INSendMessageIntent",
            "INSearchForMessagesIntent",
            "INSetMessageAttributeIntent",
          ],
        },
        // TODO: Update `IntentHandler` dynamically
        NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).IntentHandler",
        NSExtensionPointIdentifier: "com.apple.intents-service",
      },
    });
  } else if (type === "safari") {
    return plist.build({
      NSExtension: {
        // TODO: Update `SafariWebExtensionHandler` dynamically
        NSExtensionPrincipalClass:
          "$(PRODUCT_MODULE_NAME).SafariWebExtensionHandler",
        // NSExtensionMainStoryboard: 'MainInterface',
        NSExtensionPointIdentifier: "com.apple.Safari.web-extension",
      },
    });
  } else {
    return plist.build({
      NSExtension: {
        NSExtensionAttributes: {
          UNNotificationExtensionCategory: "myNotificationCategory",
          UNNotificationExtensionInitialContentSizeRatio: 1,
        },
        // TODO: Update `NotificationViewController` dynamically
        NSExtensionPrincipalClass:
          "$(PRODUCT_MODULE_NAME).NotificationViewController",
        // NSExtensionMainStoryboard: 'MainInterface',
        NSExtensionPointIdentifier:
          "com.apple.usernotifications.content-extension",
      },
    });
  }
}

function xcodeFrameworksForType(type: ExtensionType) {
  if (type === "widget") {
    return [
      // CD07060B2A2EBE2E009C1192 /* WidgetKit.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = WidgetKit.framework; path = System/Library/Frameworks/WidgetKit.framework; sourceTree = SDKROOT; };
      "WidgetKit",
      // CD07060D2A2EBE2E009C1192 /* SwiftUI.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = SwiftUI.framework; path = System/Library/Frameworks/SwiftUI.framework; sourceTree = SDKROOT; };
      "SwiftUI",
    ];
  } else if (type === "intent") {
    return ["Intents"];
  } else if (type === "intent-ui") {
    return ["IntentsUI"];
  } else if (type === "notification-content") {
    return ["UserNotifications", "UserNotificationsUI"];
  } else {
    return [];
  }
}

const withWidget: ConfigPlugin<Props> = (config, props) => {
  // TODO: Magically based on the top-level folders in the `ios-widgets/` folder

  const widgetDir = (props.name ?? path.basename(props.directory))
    .replace(/\/+$/, "")
    .replace(/^\/+/, "");

  const widget = kebabToCamelCase(widgetDir);

  const widgetFolderAbsolutePath = path.join(
    config._internal.projectRoot,
    props.directory
  );

  // Ensure the entry file exists
  withDangerousMod(config, [
    "ios",
    async (config) => {
      fs.mkdirSync(widgetFolderAbsolutePath, { recursive: true });

      const files: [string, string][] = [
        ["Info.plist", getInfoPlistForType(props.type)],
      ];

      if (props.type === "widget") {
        files.push(
          [
            "index.swift",
            ENTRY_FILE.replace(
              "// Export widgets here",
              "// Export widgets here\n" + `        ${widget}()`
            ),
          ],
          [widget + ".swift", WIDGET.replace(/alpha/g, widget)],
          [widget + ".intentdefinition", INTENT_DEFINITION]
        );
      }

      files.forEach(([filename, content]) => {
        const filePath = path.join(widgetFolderAbsolutePath, filename);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, content);
        }
      });

      return config;
    },
  ]);

  withXcodeChanges(config, {
    name: widget,
    cwd:
      "../" +
      path.relative(
        config._internal.projectRoot,
        path.resolve(props.directory)
      ),
    deploymentTarget: props.deploymentTarget ?? "16.4",
    bundleId: config.ios.bundleIdentifier! + "." + widget,

    // @ts-expect-error: who cares
    currentProjectVersion: config.ios?.buildNumber || 1,

    frameworks: xcodeFrameworksForType(props.type).concat(
      props.frameworks || []
    ),
    type: props.type,
  });

  if (props.accentColor) {
    const lightColor =
      typeof props.accentColor === "string"
        ? props.accentColor
        : props.accentColor.color;
    const darkColor =
      typeof props.accentColor === "string"
        ? undefined
        : props.accentColor.darkColor;
    // You use the WidgetBackground and AccentColor to style the widget configuration interface of a configurable widget. Apple could have chosen names to make that more obvious.
    // https://useyourloaf.com/blog/widget-background-and-accent-color/
    // i.e. when you press and hold on a widget to configure it, the background color of the widget configuration interface changes to the background color we set here.
    withIosAccentColor(config, {
      cwd: props.directory,
      color: lightColor,
      darkColor: darkColor,
    });
  }

  if (props.backgroundColor) {
    const lightColor =
      typeof props.backgroundColor === "string"
        ? props.backgroundColor
        : props.backgroundColor.color;
    const darkColor =
      typeof props.backgroundColor === "string"
        ? undefined
        : props.backgroundColor.darkColor;
    withIosWidgetBackgroundColor(config, {
      cwd: props.directory,
      color: lightColor,
      darkColor: darkColor,
    });
  }

  if (props.icon) {
    withIosIcon(config, {
      cwd: props.directory,
      // TODO: read from the top-level icon.png file in the folder -- ERR this doesn't allow for URLs
      iconFilePath: props.icon,
    });
  }

  return config;
};

export default withWidget;

export { withXcodeProjectBetaBaseMod };
