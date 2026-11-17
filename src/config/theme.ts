/**
 * Orbit Theme Constants
 * Mirrored from src/config/theme.css for convenient TypeScript access.
 * Theme: Liquid Titanium & Deep Obsidian (matching public/orbit-logo.png)
 */
export const themeConfig = {
  accent: {
    DEFAULT: "var(--accent, #e8e8ea)",
    hover: "var(--accent-hover, #ffffff)",
    light: "var(--accent-light, #f4f4f5)",
    dark: "var(--accent-dark, #d4d4d8)",
    contrast: "var(--accent-contrast, #080808)",
    subtle: "var(--accent-subtle, rgba(232, 232, 234, 0.12))",
    glow: "var(--accent-glow, rgba(232, 232, 234, 0.25))",
    hex: "#e8e8ea",
  },
  background: {
    app: "var(--bg-app, #080808)",
    surface: "var(--bg-surface, #121214)",
    surfaceElevated: "var(--bg-surface-elevated, #1a1a1d)",
    surfaceHover: "var(--bg-surface-hover, #222226)",
    player: "var(--bg-player, #0c0c0e)",
    input: "var(--bg-input, #161619)",
  },
} as const;
