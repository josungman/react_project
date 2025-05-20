import { useEffect, useState } from "react";
import axios from "axios";
import KaKaoMap from "@/components/KaKaoMap";
import { Map as MapIcon, Table, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function RecyclingStatus() {
  const kakaoMapKey = import.meta.env.VITE_KAKAO_MAP_KEY;
  const [viewMode, setViewMode] = useState("map");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("entrps_nm");
  const [sortOrder, setSortOrder] = useState("desc");
  const [positions, setPositions] = useState([]);
  const [companyList, setCompanyList] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    axios
      .get("https://elbserver.store/waste_status_api/recycle-companies")
      .then((res) => {
        const list = res.data;

        const mappedPositions = list.map((item) => ({
          title: item.entrps_nm,
          latlng: {
            lat: parseFloat(item.latitude),
            lng: parseFloat(item.longitude),
          },
          ceo: item.rprsntv,
          phone: item.telno,
          type: item.wste,
        }));
        setPositions(mappedPositions);
        setCompanyList(list);
      })
      .catch((err) => {
        console.error("❌ API 호출 실패:", err);
      });
  }, []);

  const sortedFilteredList = companyList
    .filter((item) => item.entrps_nm.includes(search))
    .sort((a, b) => {
      const [aVal, bVal] =
        sortKey === "entrps_nm" ? [a.entrps_nm, b.entrps_nm] : sortKey === "telno" ? [a.telno, b.telno] : sortKey === "rprsntv" ? [a.rprsntv, b.rprsntv] : [a.wste, b.wste];
      return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });

  const totalPages = Math.ceil(sortedFilteredList.length / itemsPerPage);
  const paginatedList = sortedFilteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handleDownloadCSV = () => {
    const csvRows = [["업체명", "대표자", "주소", "전화번호", "폐기물종류", "품목", "처리방식", "위도", "경도"]];

    companyList.forEach((item) => {
      csvRows.push([
        `"${item.entrps_nm}"`,
        `"${item.rprsntv}"`,
        `"${item.adres}"`,
        `"${item.telno}"`,
        `"${item.wste}"`,
        `"${item.product_name}"`, // ⚠ 이 필드가 쉼표 포함 가능성 높음
        `"${item.process_mth}"`,
        `"${item.latitude}"`,
        `"${item.longitude}"`,
      ]);
    });

    const csvContent = "\uFEFF" + csvRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "폐기물_업체_전체목록.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSortArrow = (key) => {
    if (sortKey !== key) return "";
    return sortOrder === "asc" ? "▲" : "▼";
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="pt-8 pb-4 text-center bg-white shadow z-10">
        <h2 className="text-2xl font-bold mb-1">
          폐기물 실적 업체 정보 <span className="text-[12px] text-gray-500">23년 제공자료</span>
        </h2>
        <p className="text-sm">마커를 클릭하거나 업체명을 검색해 위치를 확인할 수 있습니다(작업중..)</p>
        <div className="flex justify-center gap-2 mt-3">
          <button onClick={() => setViewMode("map")} className={`px-4 py-1 rounded ${viewMode === "map" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>
            <MapIcon size={18} />
          </button>
          <button onClick={() => setViewMode("table")} className={`px-4 py-1 rounded ${viewMode === "table" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>
            <Table size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {viewMode === "map" ? (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full h-full">
              <KaKaoMap kakaoMapKey={kakaoMapKey} positions={positions} />
            </motion.div>
          ) : (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-[700px] mx-auto px-4 py-4"
            >
              <div className="flex justify-between items-center mb-3 gap-2">
                <input
                  type="text"
                  placeholder="업체명 검색"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
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
                      <th onClick={() => handleSort("entrps_nm")} className="cursor-pointer p-2 border-b">
                        업체명 {getSortArrow("entrps_nm")}
                      </th>
                      <th onClick={() => handleSort("rprsntv")} className="cursor-pointer p-2 border-b text-center">
                        대표자 {getSortArrow("rprsntv")}
                      </th>
                      <th onClick={() => handleSort("telno")} className="cursor-pointer p-2 border-b text-center">
                        연락처 {getSortArrow("telno")}
                      </th>
                      <th onClick={() => handleSort("wste")} className="cursor-pointer p-2 border-b text-center">
                        폐기물 {getSortArrow("wste")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border-b">{item.entrps_nm}</td>
                        <td className="p-2 border-b text-center">{item.rprsntv}</td>
                        <td className="p-2 border-b text-center">{item.telno}</td>
                        <td className="p-2 border-b text-center">{item.wste}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-center items-center mt-4 gap-2">
                <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-1 text-gray-600 disabled:text-gray-300">
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 text-gray-600 disabled:text-gray-300"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default RecyclingStatus;
