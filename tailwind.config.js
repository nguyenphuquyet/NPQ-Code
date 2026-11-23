/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Flat light palette modelled on VS Code's Light+ theme.
        vs: {
          panel: "#F8F8F8",
          sidebar: "#F3F3F3",
          activity: "#F8F8F8",
          editor: "#FFFFFF",
          status: "#007ACC",
          border: "#E2E2E2",
          hover: "#E8E8E8",
          select: "#D7E8F8",
          selectBorder: "#BBD9F2",
          text: "#3B3B3B",
          strong: "#1F1F1F",
          dim: "#6B6B6B",
          accent: "#0066B8",
          green: "#16825D",
          red: "#CD3131",
          orange: "#B06A00",
          yellow: "#9A7A00",
          purple: "#7B3FA0",
          blue: "#1A6FB5",
          modified: "#0066B8",
          input: "#FFFFFF",
          badge: "#E1E1E1",
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
