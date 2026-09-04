import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#f5f4f1",
        surface: "#ffffff",
        "border-ui": "#e0ddd7",
        ink: "#1c1917",
        "ink-muted": "#78716c",
        accent: "#2563eb",
        "accent-hover": "#1d4ed8",
        dept: {
          cutting: "#0d9488",
          upper: "#6366f1",
          bottom: "#d97706",
          finish: "#059669",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
