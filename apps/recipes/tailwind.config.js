/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F5F2ED",
          warm: "#F5F2ED",
          cool: "#E6F2EF",
        },
        ink: {
          DEFAULT: "#1a1a1a",
          black: "#050505",
          light: "#333333",
          muted: "#666666",
        },
        "outer-bg": "#ffffff",
        accent: {
          DEFAULT: "#4ade80",
          muted: "#22c55e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
        serif: ["Libre Baskerville", "Georgia", "serif"],
        pixel: ["VT323", "monospace"],
      },
      letterSpacing: {
        "tight-headline": "-0.04em",
        "tight-subhead": "-0.03em",
        "tight-body": "-0.02em",
        "tight-industrial": "-0.05em",
      },
      lineHeight: {
        headline: "0.85",
        subhead: "1.1",
      },
      borderWidth: {
        "3": "3px",
        "4": "4px",
      },
      typography: {
        DEFAULT: {
          css: {
            "--tw-prose-body": "#1a1a1a",
            "--tw-prose-headings": "#1a1a1a",
            maxWidth: "none",
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
