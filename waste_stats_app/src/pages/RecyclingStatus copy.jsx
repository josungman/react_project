import { useRef, useState } from "react";
import { motion } from "framer-motion";
import KaKaoMap from "@/components/KaKaoMap"; // 경로는 실제 위치에 맞게 수정

function RecyclingStatus() {
  const kakaoMapKey = import.meta.env.VITE_KAKAO_MAP_KEY;
  const [searchTerm, setSearchTerm] = useState("");
  const mapRef = useRef(null);

  const handleSearch = () => {
    setSearchTerm((prev) => prev.trim()); // trigger useEffect in MapContainer
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gradient-to-r from-[#fefefe] via-[#f5f9ff] to-[#eef4ff] bg-[length:600%_600%] animate-wavyGradient">
      {/* 상단 영역 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="p-6 text-center z-10 bg-white/70 backdrop-blur-md shadow-md flex flex-col items-center gap-2"
      >
        <h2 className="text-2xl font-bold mb-1 pt-2">
          폐기물 실적 업체 정보 <span className="text-[12px] text-gray-500">22년 제공자료</span>
        </h2>
        <p className="text-sm">마커를 클릭하거나 업체명을 검색해 위치를 확인할 수 있습니다.</p>
      </motion.div>
      {/* 지도를 분리된 컴포넌트로 표시 */}
      <KaKaoMap kakaoMapKey={kakaoMapKey} />;
    </div>
  );
}

export default RecyclingStatus;
