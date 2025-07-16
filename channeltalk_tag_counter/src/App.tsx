import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ChannelTalkCounter from "@/components/ChannelTalkCounter";
import HomePage from "@/components/HomePage";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App w-full h-full">
        <Routes>
          {/* 홈페이지 */}
          <Route path="/" element={<HomePage />} />
          {/* 대시보드 */}
          <Route path="/dashboard" element={<ChannelTalkCounter />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
