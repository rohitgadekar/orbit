/**
 * Orbit Theme Constants
 * Mirrored from src/config/theme.css for convenient TypeScript access.
 */
export const themeConfig = {
  accent: {
    DEFAULT: "var(--accent, #ff7a59)",
    hover: "var(--accent-hover, #ff9478)",
    light: "var(--accent-light, #ffb39c)",
    dark: "var(--accent-dark, #e8603f)",
    subtle: "var(--accent-subtle, rgba(255, 122, 89, 0.15))",
    glow: "var(--accent-glow, rgba(255, 122, 89, 0.25))",
    hex: "#ff7a59",
  },
  background: {
    app: "var(--bg-app, #1a1a1c)",
    surface: "var(--bg-surface, #222224)",
    surfaceElevated: "var(--bg-surface-elevated, #2c2c2f)",
    surfaceHover: "var(--bg-surface-hover, #262628)",
    player: "var(--bg-player, #141416)",
    input: "var(--bg-input, #2a2a2d)",
  },
} as const;

