import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F4EFE3",
        ink: "#1C2A23",
        "ink-soft": "#4A5750",
        pine: "#1F4032",
        "pine-soft": "#2E5E47",
        card: "#FBF8F0",
        border: "#DDD5C2",
        water: "#C6DBDF",
        // function colors
        warming: "#D9702A",
        cooling: "#2E7FB8",
        cleanair: "#1F9E94",
        food: "#4F8F3A",
        charging: "#C49A1F",
        beds: "#7E57C2",
        rest: "#6B756D",
        // status colors
        "status-open": "#3C8A4C",
        "status-limited": "#C08A1A",
        "status-full": "#B8472E",
        "status-closed": "#8A847A",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-public-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
