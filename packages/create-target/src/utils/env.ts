import { boolish } from "getenv";

class Env {
  /** Enable debug logging */
  get EXPO_DEBUG() {
    return boolish("EXPO_DEBUG", false);
  }
  /** Is running in non-interactive CI mode */
  get CI() {
    return boolish("CI", false);
  }
}

export const env = new Env();
