import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { config } from "dotenv";
import basicSsl from "@vitejs/plugin-basic-ssl";

// .env 파일 로드
config();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  define: {
    "process.env": {},
  },
  envDir: ".",
  envPrefix: "VITE_",
  server: {
    host: "0.0.0.0", // 내부망 허용
    port: 5173,
    https: true, // HTTPS 활성화 (SendBird Calls SDK 요구사항)
  },
});
