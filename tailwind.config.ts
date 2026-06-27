import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#152017",
        leaf: "#286140",
        mint: "#dff3e8",
        amber: "#d99b2b",
        coral: "#dc5b4d",
        sky: "#4177c8"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(21, 32, 23, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
