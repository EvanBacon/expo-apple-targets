// @ts-expect-error
import normalizeColor from "@react-native/normalize-colors";

export function customColorFromCSS(color: string): {
  /** @example `0.86584504117670746` */
  red: number;
  /** @example `0.26445041990630447` */
  green: number;
  /** @example `0.3248577810203549` */
  blue: number;
  /** @example `1` */
  alpha: number;
} {
  let colorInt = normalizeColor(color);
  colorInt = ((colorInt << 24) | (colorInt >>> 8)) >>> 0;

  const red = ((colorInt >> 16) & 255) / 255;
  const green = ((colorInt >> 8) & 255) / 255;
  const blue = (colorInt & 255) / 255;
  const alpha = ((colorInt >> 24) & 255) / 255;

  return {
    red,
    green,
    blue,
    alpha,
  };
}
