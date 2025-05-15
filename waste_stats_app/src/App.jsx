import { useLocation, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import WasteStatus from "./pages/WasteStatus";
import RecyclingStatus from "./pages/RecyclingStatus";
import DistrictMapPage from "./pages/DistrictMapPage";
import ScrollToTop from "@/components/ScrollToTop";

function App() {
  const location = useLocation();
  const hideNavbarRoutes = ["/"]; // 이 경로에서는 Navbar 숨김

  return (
    <>
      {!hideNavbarRoutes.includes(location.pathname) && <Navbar />}

      {/* ✅ 여기에 위치 */}
      <ScrollToTop />

      <main className={!hideNavbarRoutes.includes(location.pathname) ? "pt-10" : ""}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/waste" element={<WasteStatus />} />
            <Route path="/recycle" element={<RecyclingStatus />} />
            <Route path="/map/:province" element={<DistrictMapPage />} />
          </Routes>
        </AnimatePresence>
      </main>
    </>
  );
}

export default App;
