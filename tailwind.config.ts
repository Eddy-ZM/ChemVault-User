import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vault: {
          ink: "#172033",
          muted: "#657083",
          line: "#d9dee8",
          mist: "#f8fafc",
          cyan: "#0e7490",
          blue: "#155eef",
          violet: "#5b5bd6",
        },
      },
      boxShadow: {
        card: "0 16px 40px rgba(23, 32, 51, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
