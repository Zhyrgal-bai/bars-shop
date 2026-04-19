/** CSS background for color swatch: HEX or named / text → stable HSL fallback. */
export function variantColorToCss(color: string): string {
  const c = color.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c)) {
    return c.length === 4
      ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`
      : c;
  }
  const lower = c.toLowerCase();
  const named: Record<string, string> = {
    black: "#1a1a1a",
    white: "#f5f5f5",
    red: "#c62828",
    green: "#2e7d32",
    blue: "#1565c0",
    yellow: "#f9a825",
    orange: "#ef6c00",
    purple: "#6a1b9a",
    pink: "#ad1457",
    gray: "#757575",
    grey: "#757575",
    brown: "#5d4037",
    чёрный: "#1a1a1a",
    черный: "#1a1a1a",
    белый: "#f5f5f5",
    красный: "#c62828",
    зелёный: "#2e7d32",
    зеленый: "#2e7d32",
    синий: "#1565c0",
    жёлтый: "#f9a825",
    желтый: "#f9a825",
  };
  if (named[lower]) return named[lower]!;

  let h = 0;
  for (let i = 0; i < c.length; i++) {
    h = (h + c.charCodeAt(i) * (i + 17)) % 360;
  }
  return `hsl(${h}, 42%, 48%)`;
}
