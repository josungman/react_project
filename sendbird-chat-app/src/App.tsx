import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/layout/Header";
import SendbirdChat from "./pages/SendbirdChat";
import ChatCreationPage from "./pages/ChatCreationPage";
import MainPage from "./pages/MainPage";
import CustomerSupportPage from "./pages/CustomerSupportPage";
import SupportListPage from "./pages/SupportListPage";

const pages = [
  {
    id: "chat-create",
    label: "채팅 생성",
    icon: "➕",
    path: "/chat/create",
    component: ChatCreationPage,
  },
  {
    id: "support-list",
    label: "상담방 관리",
    icon: "🎧",
    path: "/support/list",
    component: SupportListPage,
  },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
        <Header pages={pages} />

        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/main" replace />} />
            <Route path="/main" element={<MainPage />} />
            <Route path="/chat/:channelId?" element={<SendbirdChat />} />
            <Route path="/chat/create" element={<ChatCreationPage />} />
            <Route path="/support" element={<CustomerSupportPage />} />
            <Route path="/support/list" element={<SupportListPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
