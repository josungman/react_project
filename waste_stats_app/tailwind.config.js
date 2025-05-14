module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  safelist: [
    "bg-destructive",
    "text-destructive-foreground",
    "hover:bg-destructive/90"
  ],
  theme: {
    extend: {
      colors: {
        destructive: "#dc2626", // 빨간색 계열
        "destructive-foreground": "#ffffff"
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
