import { ConfigPlugin, withDangerousMod } from "expo/config-plugins";

import { AppIntent } from "./config";

type WidgetConfig = {
  intents: AppIntent[];
};

function generateSwiftModule(config: WidgetConfig): string {
  const { intents } = config;

  const widgetBundleBody = intents
    .map((intent, index) => `//         widgetControl${index}()`)
    .join("\n");

  const widgetDefinitions = intents
    .map((intent, index) => {
      return `
@available(iOS 18.0, *)
struct widgetControl${index}: ControlWidget {
    static let kind: String = "${intent.kind}"
    var body: some ControlWidgetConfiguration {
      StaticControlConfiguration(kind: Self.kind) {
        ControlWidgetButton(action: OpenAppIntent${index}()) {
          Label("${intent.label}", systemImage: "${intent.icon}")
        }
      }
      .displayName("${intent.displayName}")
      .description("${intent.description}")
    }
}

// This must be in both targets when \`openAppWhenRun = true\`
// https://developer.apple.com/forums/thread/763851
@available(iOS 18.0, *)
struct OpenAppIntent${index}: ControlConfigurationIntent {
    static let title: LocalizedStringResource = "${intent.displayName}"
    static let description = IntentDescription(stringLiteral: "${intent.description}")
    static let isDiscoverable = false
    static let openAppWhenRun: Bool = true
    
    @MainActor
    func perform() async throws -> some IntentResult & OpensIntent {
        return .result(opensIntent: OpenURLIntent(URL(string: "${intent.url}")!))
    }
}`;
    })
    .join("\n");

  return `
// Generated by @bacons/apple-targets via the appIntents option in the config file.
import AppIntents
import SwiftUI
import WidgetKit

// TODO: These must be added to the WidgetBundle manually. They need to be linked outside of the _shared folder.
// @main
// struct exportWidgets: WidgetBundle {
//     var body: some Widget {
${widgetBundleBody}
//     }
// }
${widgetDefinitions}
      `;
}

import fs from "fs";
const withLinkAppIntent: ConfigPlugin<{
  intents: AppIntent[];
  targetRoot: string;
}> = (config, { targetRoot, intents }) => {
  withDangerousMod(config, [
    "ios",
    async (config) => {
      const sharedFile = `${targetRoot}/_shared/generated-intents.swift`;

      await fs.promises.mkdir(`${targetRoot}/_shared`, { recursive: true });
      await fs.promises.writeFile(
        sharedFile,
        generateSwiftModule({
          intents: intents.map((intent, index) => ({
            ...intent,
            kind: intent.kind ?? `${config.ios!.bundleIdentifier}.${index}`,
          })),
        }),
        "utf-8"
      );

      return config;
    },
  ]);

  return config;
};

export default withLinkAppIntent;
