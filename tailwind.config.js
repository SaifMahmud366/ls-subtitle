/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./web/pages/*.html",
    "./web/js/*.js"
  ],
  theme: {
    extend: {
      colors: {
        brand: "#22c55e",
        darkbg: "#0B0F19",
        cardbg: "#161B22",
        border: "#30363D",
        muted: "#9CA3AF"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      }
    }
  },
  plugins: []
};
