import { motion } from "framer-motion";
import KoreaMap from "@/components/KoreaMap";
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function WasteStatus() {
  const [provinceData, setProvinceData] = useState({});
  const [selectedType, setSelectedType] = useState("total");
  const navigate = useNavigate();

  const typeLabels = {
    total: "총계",
    self: "자가처리",
    consigned: "위탁처리",
    public: "공공처리",
  };

  useEffect(() => {
    const fetchData = async () => {
      const url = selectedType === "total" ? "https://elbserver.store/waste_status_api/sido" : `https://elbserver.store/waste_status_api/sido?type=${selectedType}`;

      try {
        const res = await axios.get(url);
        setProvinceData(res.data);
      } catch (err) {
        console.error("📉 시도 데이터 로딩 실패", err);
      }
    };

    fetchData();
  }, [selectedType]);

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
        paddingTop: "6rem",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        boxSizing: "border-box",
        textAlign: "center",
        flexDirection: "column",
      }}
      className="bg-gradient-to-r from-[#fefefe] via-[#f5f9ff] to-[#eef4ff] bg-[length:600%_600%] animate-wavyGradient"
    >
      <div>
        <h2 className="text-2xl font-bold mb-2">
          폐기물 발생이력 <span className="text-[12px] text-gray-500">22년 제공자료</span>
        </h2>
        <p className="mb-4 text-center">
          <span className="animate-pulse text-blue-600 font-semibold">시도 클릭시</span> 시군구 데이터를 볼 수 있습니다.
        </p>

        {/* ✅ 라운드 + 그림자 적용된 라디오 버튼 그룹 */}
        <fieldset
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "1rem",
            marginLeft: "0.5rem",
            marginRight: "0.5rem",
            padding: "0.75rem 0.5rem",
            borderRadius: "12px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb",
            backgroundColor: "#fff",
          }}
        >
          {Object.entries(typeLabels).map(([key, label]) => (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              <input type="radio" name="wasteType" value={key} checked={selectedType === key} onChange={() => setSelectedType(key)} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>

        {/* ✅ 지도 컴포넌트 */}
        <KoreaMap data={provinceData} onClickProvince={handleClickProvince} />
      </div>
    </motion.div>
  );
}

export default WasteStatus;
