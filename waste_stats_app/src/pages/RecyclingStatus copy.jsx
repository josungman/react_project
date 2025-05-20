import { useState /*, useEffect */ } from "react";
// import axios from "axios";
import KaKaoMap from "@/components/KaKaoMap";
import { Map as MapIcon, Table, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function RecyclingStatus() {
  const kakaoMapKey = import.meta.env.VITE_KAKAO_MAP_KEY;
  const [viewMode, setViewMode] = useState("map");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("value");
  const [sortOrder, setSortOrder] = useState("desc");

  // ✅ 추후 백엔드 연동 시 사용 예정
  // const [data, setData] = useState({});
  // useEffect(() => {
  //   axios
  //     .get("/your-api-endpoint")
  //     .then((res) => setData(res.data))
  //     .catch((err) => console.error("❌ 데이터 로딩 실패", err));
  // }, []);

  const sampleData = {
    서울시청: 1234,
    부산시청: 987,
  };

  const positions = [
    {
      title: "서울시청",
      latlng: { lat: 37.5665, lng: 126.978 },
      ceo: "홍길동",
      phone: "02-123-4567",
      type: "생활폐기물",
    },
    {
      title: "부산시청",
      latlng: { lat: 35.1796, lng: 129.0756 },
      ceo: "김철수",
      phone: "051-987-6543",
      type: "건설폐기물",
    },
  ];

  const sortedFilteredData = Object.entries(sampleData)
    .filter(([name]) => name.includes(search))
    .sort(([aName, aVal], [bName, bVal]) => {
      const [a, b] = sortKey === "name" ? [aName, bName] : [aVal, bVal];
      return sortOrder === "asc" ? (a > b ? 1 : -1) : a < b ? 1 : -1;
    });

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handleDownloadCSV = () => {
    const csvRows = [["업체명", "폐기물량"]];
    for (const [name, value] of Object.entries(sampleData)) {
      csvRows.push([name, Math.floor(value).toString()]);
    }
    const csvContent = "\uFEFF" + csvRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "재활용_업체_이력.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-gradient-to-r from-[#fefefe] via-[#f5f9ff] to-[#eef4ff] bg-[length:600%_600%] animate-wavyGradient min-h-screen pt-16 text-center">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold mb-1">
          폐기물 실적 업체 정보 <span className="text-[12px] text-gray-500">23년 제공자료</span>
        </h2>
        <p className="text-sm">마커를 클릭하거나 업체명을 검색해 위치를 확인할 수 있습니다(작업중..)</p>
      </div>

      {/* View Toggle */}
      <div className="flex justify-center gap-2 mb-2">
        <button onClick={() => setViewMode("map")} className={`px-4 py-1 rounded ${viewMode === "map" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>
          <MapIcon size={18} />
        </button>
        <button onClick={() => setViewMode("table")} className={`px-4 py-1 rounded ${viewMode === "table" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>
          <Table size={18} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "map" ? (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className=" px-4"
            style={{ height: "calc(100vh - 4rem)" }}
          >
            <KaKaoMap kakaoMapKey={kakaoMapKey} positions={positions} />
          </motion.div>
        ) : (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="max-w-[700px] mx-auto">
            <div className="flex justify-between items-center mb-3 gap-2">
              <input
                type="text"
                placeholder="업체명 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
              />
              <button onClick={handleDownloadCSV} className="bg-emerald-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1">
                <Download size={16} /> CSV 다운로드
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th onClick={() => handleSort("name")} className="cursor-pointer p-2 border-b">
                      업체명 {sortKey === "name" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th onClick={() => handleSort("value")} className="cursor-pointer p-2 border-b">
                      폐기물량 (톤) {sortKey === "value" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFilteredData.map(([name, value]) => (
                    <tr key={name}>
                      <td className="p-2 border-b">{name}</td>
                      <td className="p-2 border-b">{Math.floor(value).toLocaleString()}톤</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RecyclingStatus;
