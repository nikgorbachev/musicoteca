import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FAFAF7",
        ink: "#1a1a1a",
        "warm-grey": "#8a857c",
        "warm-line": "#e4e1d8",
        night: "#0D0F14",
        chalk: "#F0F0ED",
        "cool-grey": "#7b8493",
        "cool-line": "#222632",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
