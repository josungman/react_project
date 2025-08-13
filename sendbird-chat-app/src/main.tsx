import { StrictMode } from "react";
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
