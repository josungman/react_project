import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // ✅ 추가

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  optimizeDeps: {
    include: ["react-apexcharts"], // ✅ react-apexcharts 미리 번들링
  },
});
