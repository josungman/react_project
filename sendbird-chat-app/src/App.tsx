import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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

function RoutedApp() {
  const location = useLocation();
  const pathname = location.pathname || "";
  const isChatCreation = pathname === "/chat/create";
  const isChatRoom = pathname === "/chat" || (pathname.startsWith("/chat/") && !isChatCreation);
  const hideHeader = isChatRoom;

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {!hideHeader && <Header pages={pages} />}

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
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RoutedApp />
    </BrowserRouter>
  );
}
