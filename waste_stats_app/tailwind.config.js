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
      animation: {
        wavyGradient: "wavyGradient 8s ease-in-out infinite",
        marquee: "marquee 10s linear infinite",
      },
      keyframes: {
        wavyGradient: {
          "0%": { backgroundPosition: "0% 50%" },
          "25%": { backgroundPosition: "50% 100%" },
          "50%": { backgroundPosition: "100% 50%" },
          "75%": { backgroundPosition: "50% 0%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" }, // ❗ 50%만 이동
        },
      },

    },
  },
  plugins: [require("tailwindcss-animate")],
};

