module.exports = {
  content: ["./public/index.html", "./public/assets/js/**/*.js"],
  theme: {
    extend: {
      colors: {
        emerald: { 850: "#112e1f", 900: "#163b27", 950: "#0b1d13" },
        gold: { 400: "#e5c158", 500: "#d4af37", 600: "#b59226", 700: "#8c6e17" }
      },
      fontFamily: { sans: ["Noto Kufi Arabic", "system-ui", "sans-serif"] }
    }
  },
  plugins: []
};
