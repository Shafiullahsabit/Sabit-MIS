/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        "surface-muted": "hsl(var(--surface-muted))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          soft: "hsl(var(--accent-soft))",
        },
        positive: {
          DEFAULT: "hsl(var(--positive))",
          soft: "hsl(var(--positive-soft))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          soft: "hsl(var(--warning-soft))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border: "hsl(var(--border))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          muted: "hsl(var(--sidebar-muted))",
          border: "hsl(var(--sidebar-border) / 0.1)",
          card: "hsl(var(--sidebar-card))",
          icon: {
            DEFAULT: "hsl(var(--sidebar-icon))",
            foreground: "hsl(var(--sidebar-icon-foreground))",
            muted: "hsl(var(--sidebar-icon-muted))",
          },
          hover: "hsl(var(--sidebar-hover) / 0.07)",
          active: "hsl(var(--sidebar-active))",
          "active-foreground": "hsl(var(--sidebar-active-foreground))",
          indicator: "hsl(var(--sidebar-indicator))",
          "badge-active": "hsl(var(--sidebar-badge-active))",
        },
      },
      boxShadow: {
        soft: "0 2px 12px rgba(20, 33, 25, 0.045)",
      },
      fontFamily: {
        sans: [
          "Inter Variable",
          "Noto Sans Arabic Variable",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
