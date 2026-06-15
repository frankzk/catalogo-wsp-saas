import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // WhatsApp-inspired palette (reused by the public catalog later)
        whatsapp: {
          DEFAULT: "#25D366",
          dark: "#128C7E",
          teal: "#075E54",
          light: "#DCF8C6",
          bg: "#ECE5DD",
        },
        brand: {
          DEFAULT: "#0f766e",
          dark: "#115e59",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
