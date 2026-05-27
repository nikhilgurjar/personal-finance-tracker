/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#050810",
        surface: "#0d111d",
        card: "#111829",
        "card-hover": "#16202f",
        border: "rgba(255,255,255,0.08)",
        "border-med": "rgba(255,255,255,0.12)",
        "border-strong": "rgba(255,255,255,0.18)",
        text: "#f0f4f9",
        "text-muted": "#8a96b4",
        "text-dim": "#4a5a72",
        cyan: "#06d6ff",
        amber: "#ffb319",
        green: "#3fd858",
        red: "#ff5757",
        purple: "#d060ff",
      },
      fontFamily: {
        syne: ["Syne", "sans-serif"],
        sans: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      spacing: {
        "safe-b": "env(safe-area-inset-bottom)",
        "safe-t": "env(safe-area-inset-top)",
        "safe-l": "env(safe-area-inset-left)",
        "safe-r": "env(safe-area-inset-right)",
      },
    },
  },
  plugins: [],
};
