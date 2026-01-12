/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F6F1E8",
          warm: "#F2ECE2",
          cool: "#EDF1EC",
        },
        ink: {
          DEFAULT: "#1F1A16",
          black: "#161311",
          light: "#3E362E",
          muted: "#6E665D",
        },
        "outer-bg": "#ECE7DD",
        accent: {
          DEFAULT: "#4F8B72",
          muted: "#6FA58A",
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
