// Reading time is independent of the reduced-motion preference.
export function turnReadingTime(text: string, income = false): number {
  return income ? 2600 : Math.min(8500, Math.max(4200, 1800 + text.length * 45));
}
