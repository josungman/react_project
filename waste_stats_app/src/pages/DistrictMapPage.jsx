import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import DistrictMap from "@/components/DistrictMap";
import { ArrowLeft, Map as MapIcon, Table, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function DistrictMapPage() {
  const { province } = useParams();
  const [districtData, setDistrictData] = useState({});
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [viewMode, setViewMode] = useState("map");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("value");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedType, setSelectedType] = useState("total");
  const navigate = useNavigate();

  const supportedProvinces = ["경기"]; // ✅ 군 데이터 지원하지 않는 시도 목록

  const typeLabels = {
    total: "총계",
    self: "자가처리",
    consigned: "위탁처리",
    public: "공공처리",
  };

  useEffect(() => {
    if (!province) return;
    setLoading(true);
    setMapReady(false);

    const url = `https://elbserver.store/waste_status_api/sigungu/${province}?type=${selectedType}`;

    axios
      .get(url)
      .then((res) => {
        setDistrictData(res.data);
      })
      .catch((err) => {
        console.error("❌ 시군구 데이터 로딩 실패", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [province, selectedType]);

  useEffect(() => {
    if (viewMode === "map") {
      setMapReady(false);
    }
  }, [viewMode]);

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

  const handleDownloadCSV = async () => {
    try {
      const res = await axios.get(`https://elbserver.store/waste_status_api/sigungu/${province}/alldata`);
      const fullData = res.data;

      const csvRows = [
        ["시군구", "총계(톤)", "자가처리(톤)", "위탁처리(톤)", "공공처리(톤)"],
        ...Object.entries(fullData).map(([name, values]) => [
          name,
          Math.floor(values.total || 0),
          Math.floor(values.self || 0),
          Math.floor(values.consigned || 0),
          Math.floor(values.public || 0),
        ]),
      ];

      const csvContent = "\uFEFF" + csvRows.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${province}_시군구_폐기물_전체이력.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("❌ CSV 다운로드 실패", err);
    }
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
      className="bg-gradient-to-r from-[#fefefe] via-[#f5f9ff] to-[#eef4ff] bg-[length:600%_600%] animate-wavyGradient"
    >
      <style>
        {`
        .loader {
          width: 32px;
          height: 32px;
          border: 4px solid #ccc;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        `}
      </style>

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
          <h2 className="text-xl font-bold">{province} 시군구 폐기물 이력</h2>
        </div>

        {/* Type Selector */}
        <fieldset
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "1rem",
            padding: "0.75rem 0.5rem",
            borderRadius: "12px",
            border: "1px solid #eee",
            marginBottom: "0.8rem",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          {Object.entries(typeLabels).map(([key, label]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "14px" }}>
              <input type="radio" name="wasteType" value={key} checked={selectedType === key} onChange={() => setSelectedType(key)} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>

        {/* View toggle */}
        <div style={{ marginBottom: "0.4rem", display: "flex", justifyContent: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setViewMode("map")}
            style={{
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

        {supportedProvinces.includes(province) && <p style={{ fontSize: "12px", marginBottom: "0rem", color: "#374151" }}>*{province} 일부 데이터는 시.군 데이터만 지원합니다</p>}

        {/* View area */}
        <AnimatePresence mode="wait">
          {viewMode === "map" ? (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ position: "relative" }}>
              <DistrictMap data={districtData} province={province} onLoaded={() => setMapReady(true)} />
              {(loading || !mapReady) && (
                <div
                  style={{
                    position: "absolute",
                    top: "30%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "rgba(255,255,255,0.7)",
                    padding: "1rem",
                    borderRadius: "8px",
                  }}
                >
                  <div className="loader" />
                  <p>지도를 불러오는 중...</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              {/* Table */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", gap: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="시군구 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ flex: 1, padding: "0.4rem", border: "1px solid #ccc", borderRadius: "4px" }}
                />
                <button
                  onClick={handleDownloadCSV}
                  style={{
                    backgroundColor: "#10b981",
                    color: "#fff",
                    padding: "0.4rem 0.75rem",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <Download size={16} />
                  CSV 모두 다운로드
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f9fafb" }}>
                      <th onClick={() => handleSort("name")} style={{ cursor: "pointer", padding: "0.5rem", borderBottom: "1px solid #ddd" }}>
                        시군구 {sortKey === "name" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                      </th>
                      <th onClick={() => handleSort("value")} style={{ cursor: "pointer", padding: "0.5rem", borderBottom: "1px solid #ddd" }}>
                        폐기물량 (톤) {sortKey === "value" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFilteredData.map(([name, value]) => (
                      <tr key={name}>
                        <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>{name}</td>
                        <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>{Math.floor(value).toLocaleString()}톤</td>
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
