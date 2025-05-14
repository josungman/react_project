import { motion } from "framer-motion";
import KoreaMap from "@/components/KoreaMap";
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function WasteStatus() {
  const [provinceData, setProvinceData] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("https://elbserver.store/waste_status_api/sido")
      .then((res) => setProvinceData(res.data))
      .catch((err) => console.error("📉 시도 데이터 로딩 실패", err));
  }, []);

  const handleClickProvince = (provinceName) => {
    navigate(`/map/${provinceName}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      style={{
        height: "100vh",
        paddingTop: "4rem", // ✅ 네비바 높이 보정 (64px)
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        boxSizing: "border-box",
        textAlign: "center",
        flexDirection: "column",
      }}
    >
      <div>
        <h2 className="text-2xl font-bold mb-2">
          폐기물 발생현황 <span className="text-[12px] text-gray-500">22년제공자료</span>
        </h2>
        <p className="mb-6 text-center">
          <span className="animate-pulse text-blue-600 font-semibold">시도 클릭시</span> 시군구 데이터를 볼 수 있습니다.
        </p>

        {/* ✅ 지도 컴포넌트 */}
        <KoreaMap data={provinceData} onClickProvince={handleClickProvince} />
      </div>
    </motion.div>
  );
}

export default WasteStatus;
