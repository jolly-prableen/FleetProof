import type { Config } from "tailwindcss";

// Restrained palette: white, ink, one grey scale, and three status colours
// that each carry meaning (ok = verified, warn = retake, review = needs a person).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#16212B", soft: "#5B6773", faint: "#8A95A0" },
        line: "#E6E9EC",
        paper: "#FFFFFF",
        wash: "#F6F7F8",
        brand: { DEFAULT: "#1F4E5F", dark: "#163A47" },
        ok: { DEFAULT: "#1E8E5A", bg: "#E8F5EE" },
        warn: { DEFAULT: "#C8341F", bg: "#FCEBE8" },
        review: { DEFAULT: "#B7791F", bg: "#FBF3E1" },
      },
      fontFamily: { sans: ["var(--font-mukta)", "system-ui", "sans-serif"] },
      borderRadius: { xl2: "1.25rem" },
      boxShadow: { soft: "0 8px 24px rgba(22, 33, 43, 0.06)" },
    },
  },
  plugins: [],
};
export default config;
