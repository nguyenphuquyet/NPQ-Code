/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /*
         * Every UI colour is a CSS variable (`src/index.css` defines one block per
         * theme), so switching a theme needs no re-render of the components.
         * Variables hold `R G B` triples, which keeps Tailwind opacity modifiers
         * such as `bg-vs-accent/40` working.
         */
        vs: {
          panel: "rgb(var(--vs-panel) / <alpha-value>)",
          titlebar: "rgb(var(--vs-titlebar) / <alpha-value>)",
          titlebarHover: "rgb(var(--vs-titlebar-hover) / <alpha-value>)",
          tab: "rgb(var(--vs-tab) / <alpha-value>)",
          sidebar: "rgb(var(--vs-sidebar) / <alpha-value>)",
          activity: "rgb(var(--vs-activity) / <alpha-value>)",
          editor: "rgb(var(--vs-editor) / <alpha-value>)",
          status: "rgb(var(--vs-status) / <alpha-value>)",
          border: "rgb(var(--vs-border) / <alpha-value>)",
          hover: "rgb(var(--vs-hover) / <alpha-value>)",
          select: "rgb(var(--vs-select) / <alpha-value>)",
          selectBorder: "rgb(var(--vs-select-border) / <alpha-value>)",
          text: "rgb(var(--vs-text) / <alpha-value>)",
          strong: "rgb(var(--vs-strong) / <alpha-value>)",
          dim: "rgb(var(--vs-dim) / <alpha-value>)",
          accent: "rgb(var(--vs-accent) / <alpha-value>)",
          button: "rgb(var(--vs-button) / <alpha-value>)",
          green: "rgb(var(--vs-green) / <alpha-value>)",
          red: "rgb(var(--vs-red) / <alpha-value>)",
          orange: "rgb(var(--vs-orange) / <alpha-value>)",
          yellow: "rgb(var(--vs-yellow) / <alpha-value>)",
          purple: "rgb(var(--vs-purple) / <alpha-value>)",
          blue: "rgb(var(--vs-blue) / <alpha-value>)",
          modified: "rgb(var(--vs-modified) / <alpha-value>)",
          input: "rgb(var(--vs-input) / <alpha-value>)",
          badge: "rgb(var(--vs-badge) / <alpha-value>)",
          highlight: "rgb(var(--vs-highlight) / <alpha-value>)",
        },
      },
      fontFamily: {
        ui: ['"Segoe UI"', '"Inter"', "system-ui", "sans-serif"],
        mono: ['"Cascadia Code"', '"JetBrains Mono"', '"Fira Code"', "Consolas", "monospace"],
      },
      fontSize: {
        // rem-based so the UI zoom (--ui-scale) scales these too.
        "2xs": ["0.6875rem", "0.9375rem"], // 11px / 15px at 100%
      },
    },
  },
  plugins: [],
};
