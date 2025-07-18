import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ChannelTalkCounter from "@/components/ChannelTalkCounter";
import ReservationCounter from "@/components/ReservationCounter";
import HomePage from "@/components/HomePage";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App w-full h-full">
        <Routes>
          {/* 홈페이지 */}
          <Route path="/" element={<HomePage />} />
          {/* 태그 대시보드 */}
          <Route path="/tag_dashboard" element={<ChannelTalkCounter />} />
          {/* 예약금 대시보드 */}
          <Route path="/reservation_dashboard" element={<ReservationCounter />} />
        </Routes>

        {/* 토스트 알림 */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: "#363636",
              color: "#fff",
            },
            success: {
              duration: 3000,
              style: {
                background: "#10B981",
              },
            },
            error: {
              duration: 5000,
              style: {
                background: "#EF4444",
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
