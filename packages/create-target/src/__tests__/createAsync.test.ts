import { getTemplateConfig } from "../createAsync";

const ALL_TARGET_TYPES = [
  "action",
  "app-intent",
  "widget",
  "watch",
  "clip",
  "safari",
  "share",
  "notification-content",
  "notification-service",
  "intent",
  "intent-ui",
  "spotlight",
  "bg-download",
  "quicklook-thumbnail",
  "location-push",
  "credentials-provider",
  "account-auth",
  "device-activity-monitor",
];

describe(getTemplateConfig, () => {
  ALL_TARGET_TYPES.map((target) => {
    it(`should return a valid template for ${target}`, () => {
      const config = getTemplateConfig(target);
      expect(config).toMatchSnapshot();

      // Eval the config to ensure it's valid JS
      // eslint-disable-next-line no-eval
      const configFunction = eval(config);
      expect(configFunction instanceof Function).toBe(true);
      const result = configFunction({});
      // Expect result to be a serializable object
      expect(result).toBeInstanceOf(Object);
      expect(() => JSON.stringify(result)).not.toThrow();
    });
  });
});
