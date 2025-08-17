// StrictMode는 개발 모드 이중 마운트 이슈를 피하기 위해 현재 사용하지 않습니다
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Supergroup 리액션 안내 경고만 필터링
const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  try {
    if (typeof args?.[0] === "string" && args[0].includes("EnableReactionsSupergroup")) {
      return;
    }
  } catch {}
  originalConsoleWarn(...args);
};

const isProd = import.meta.env.PROD;

createRoot(document.getElementById("root")!).render(
  isProd ? (
    <App />
  ) : (
    // 개발 모드에서는 StrictMode 비활성화하여 useEffect 이중 호출 방지
    <App />
  )
);
