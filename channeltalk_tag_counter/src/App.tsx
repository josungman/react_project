import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
      </div>
    </Router>
  );
}

export default App;
