import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import DistrictMap from "@/components/DistrictMap";
import { ArrowLeft, Map as MapIcon, Table, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function DistrictMapPage() {
  const { province } = useParams();
  const [districtData, setDistrictData] = useState({});
  const [viewMode, setViewMode] = useState("map");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const navigate = useNavigate();

  useEffect(() => {
    if (!province) return;
    axios
      .get(`https://elbserver.store/waste_status_api/sigungu/${province}`)
      .then((res) => setDistrictData(res.data))
      .catch((err) => console.error("❌ 시군구 데이터 로딩 실패", err));
  }, [province]);

  const sortedFilteredData = Object.entries(districtData)
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
    const csvRows = [["시군구", "폐기물량(톤)"], ...Object.entries(districtData).map(([name, value]) => [name, Math.floor(value)])];

    const csvContent = "\uFEFF" + csvRows.map((row) => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${province}_시군구_폐기물_현황.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        paddingTop: "4rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100vh",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "700px", width: "100%" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            marginBottom: "0.5rem",
          }}
        >
          <button
            onClick={() => navigate("/waste")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.25rem 0.75rem",
              backgroundColor: "#f9fafb",
              border: "2px solid #3b82f6",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} color="#1f2937" />
          </button>
          <h2 className="text-xl font-bold">{province} 시군구 폐기물 현황</h2>
        </div>

        {/* View toggle */}
        <div
          style={{
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <button
            onClick={() => setViewMode("map")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.4rem 1rem",
              borderRadius: "6px",
              backgroundColor: viewMode === "map" ? "#3b82f6" : "#f3f4f6",
              color: viewMode === "map" ? "#fff" : "#1f2937",
              cursor: "pointer",
            }}
          >
            <MapIcon size={18} />
          </button>
          <button
            onClick={() => setViewMode("table")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.4rem 1rem",
              borderRadius: "6px",
              backgroundColor: viewMode === "table" ? "#3b82f6" : "#f3f4f6",
              color: viewMode === "table" ? "#fff" : "#1f2937",
              cursor: "pointer",
            }}
          >
            <Table size={18} />
          </button>
        </div>

        {/* AnimatePresence for view transition */}
        <AnimatePresence mode="wait">
          {viewMode === "map" ? (
            <motion.div key="map" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <DistrictMap data={districtData} province={province} />
            </motion.div>
          ) : (
            <motion.div key="table" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {/* Search + CSV in a row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                  gap: "0.5rem",
                }}
              >
                <input
                  type="text"
                  placeholder="시군구 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.4rem 0.75rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
                <button
                  onClick={handleDownloadCSV}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    backgroundColor: "#10b981",
                    color: "#fff",
                    padding: "0.4rem 0.75rem",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Download size={16} />
                  CSV 다운로드
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "center",
                    fontSize: "14px",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f9fafb" }}>
                      <th
                        style={{
                          padding: "0.5rem",
                          borderBottom: "1px solid #ddd",
                          cursor: "pointer",
                        }}
                        onClick={() => handleSort("name")}
                      >
                        시군구 {sortKey === "name" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                      </th>
                      <th
                        style={{
                          padding: "0.5rem",
                          borderBottom: "1px solid #ddd",
                          cursor: "pointer",
                        }}
                        onClick={() => handleSort("value")}
                      >
                        폐기물량 (톤) {sortKey === "value" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFilteredData.map(([name, value]) => (
                      <tr key={name}>
                        <td
                          style={{
                            padding: "0.5rem",
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          {name}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem",
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          {Math.floor(value).toLocaleString()}톤
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default DistrictMapPage;
