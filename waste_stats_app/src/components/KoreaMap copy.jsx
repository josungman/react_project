import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as d3 from "d3";

function KoreaMap({ data, onClickProvince }) {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);

  const customLabelPositions = {
    경기: [16, 26],
    // 필요시 더 추가
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setLoading(true);
    const width = 700;
    const height = 500;

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height + 60}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    svg.selectAll(".legend").remove();
    svg.selectAll("defs").remove();
    svg.selectAll("*").remove();

    const labelMap = {
      서울특별시: "서울",
      부산광역시: "부산",
      대구광역시: "대구",
      인천광역시: "인천",
      광주광역시: "광주",
      대전광역시: "대전",
      울산광역시: "울산",
      세종특별자치시: "세종",
      경기도: "경기",
      강원도: "강원",
      충청북도: "충북",
      충청남도: "충남",
      전라북도: "전북",
      전라남도: "전남",
      경상북도: "경북",
      경상남도: "경남",
      제주특별자치도: "제주",
    };

    d3.json("/geo/jeongug-sido-geo_opt.json")
      .then((geoData) => {
        const projection = d3
          .geoMercator()
          .scale(isMobile ? 7400 : 5700)
          .center([127.5, 36.0])
          .translate([width / 2, height / 2]);

        const path = d3.geoPath().projection(projection);
        const values = Object.values(data);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const colorRange = ["#fef0d9", "#fdcc8a", "#fc8d59", "#e34a33", "#b30000"];
        const colorScale = d3.scaleQuantize().domain([minValue, maxValue]).range(colorRange);

        const mapLayer = svg.append("g").attr("class", "map-layer");

        mapLayer
          .selectAll("path")
          .data(geoData.features)
          .join("path")
          .attr("d", path)
          .attr("fill", (d) => {
            const name = d.properties.CTP_KOR_NM;
            const key = labelMap[name] || name;
            const value = data[key];
            return value ? colorScale(value) : "#eee";
          })
          .attr("stroke", "#555")
          .attr("stroke-width", 1)
          .style("filter", "drop-shadow(3px 3px 6px rgba(0,0,0,0.35))")
          .style("transition", "all 0.2s ease")
          .on("click", (e, d) => {
            const name = d.properties.CTP_KOR_NM;
            const key = labelMap[name] || name;
            navigate(`/map/${key}`);
            onClickProvince(key);
          })
          .on("mouseover", function (e, d) {
            const name = d.properties.CTP_KOR_NM;
            const key = labelMap[name] || name;
            const value = data[key];

            d3.select(this).raise().transition().duration(200).attr("transform", "scale(1.05)").attr("stroke", "#000").attr("stroke-width", 2);

            d3.select(tooltipRef.current)
              .style("opacity", 1)
              .html(`<strong>${key}</strong><br/>${value ? `${Math.floor(value).toLocaleString()}톤` : "데이터 없음"}`);
          })
          .on("mousemove", function (e) {
            const svgBounds = svgRef.current.getBoundingClientRect();
            d3.select(tooltipRef.current)
              .style("left", e.clientX - svgBounds.left + 10 + "px")
              .style("top", e.clientY - svgBounds.top - 40 + "px");
          })
          .on("mouseout", function (e, d) {
            const name = d.properties.CTP_KOR_NM;
            const key = labelMap[name] || name;
            const value = data[key];

            d3.select(this)
              .transition()
              .duration(200)
              .attr("transform", "scale(1)")
              .attr("stroke", "#555")
              .attr("stroke-width", 1)
              .attr("fill", value ? colorScale(value) : "#eee");

            d3.select(tooltipRef.current).style("opacity", 0);
          });

        svg
          .append("g")
          .attr("class", "label-layer")
          .selectAll("text")
          .data(geoData.features)
          .join("text")
          .text((d) => {
            const name = d.properties.CTP_KOR_NM;
            return labelMap[name] || name;
          })
          .attr("x", (d) => {
            const name = labelMap[d.properties.CTP_KOR_NM] || d.properties.CTP_KOR_NM;
            const [cx, cy] = path.centroid(d);
            const [dx] = customLabelPositions[name] || [];
            return isNaN(cx) ? 0 : cx + (dx ?? 0);
          })
          .attr("y", (d) => {
            const name = labelMap[d.properties.CTP_KOR_NM] || d.properties.CTP_KOR_NM;
            const [cx, cy] = path.centroid(d);
            const [, dy] = customLabelPositions[name] || [];
            return isNaN(cy) ? 0 : cy + (dy ?? 0);
          })
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("font-size", isMobile ? "10px" : "12px")
          .attr("fill", "#111")
          .attr("pointer-events", "none");

        const legendWidth = 200;
        const legendHeight = 10;
        const legendX = width / 2 - legendWidth / 2;
        const legendY = isMobile ? height + 70 : height + 4;

        const legend = svg.append("g").attr("class", "legend");
        const legendScale = d3.scaleLinear().domain([minValue, maxValue]).range([0, legendWidth]);
        const legendAxis = d3
          .axisBottom(legendScale)
          .ticks(4)
          .tickFormat((d) => {
            if (d >= 1_000_000) return `${d / 1_000_000}백만`;
            if (d >= 10_000) return `${(d / 10_000).toFixed(1)}만`;
            if (d >= 1_000) return `${(d / 1_000).toFixed(1)}천`;
            return `${d}톤`;
          });

        const gradient = legend.append("defs").append("linearGradient").attr("id", "legend-gradient");
        const step = 100 / (colorRange.length - 1);
        colorRange.forEach((color, i) => {
          gradient
            .append("stop")
            .attr("offset", `${i * step}%`)
            .attr("stop-color", color);
        });

        legend.append("rect").attr("x", legendX).attr("y", legendY).attr("width", legendWidth).attr("height", legendHeight).style("fill", "url(#legend-gradient)");

        legend
          .append("g")
          .attr("transform", `translate(${legendX}, ${legendY + legendHeight})`)
          .call(legendAxis)
          .selectAll("text")
          .style("font-size", "10px");

        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ 전국 GeoJSON 로딩 실패", err);
        setLoading(false);
      });
  }, [data, onClickProvince, isMobile]);

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        style={{
          width: "100%",
          maxWidth: "700px",
          height: isMobile ? "66vh" : "86vh",
          display: "block",
        }}
      ></svg>

      {loading && (
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
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "4px solid #ccc",
              borderTopColor: "#3b82f6",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          />
          <p>지도를 불러오는 중...</p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          padding: "6px 10px",
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          fontSize: "12px",
          borderRadius: "4px",
          pointerEvents: "none",
          opacity: 0,
          transition: "opacity 0.2s ease",
          zIndex: 1000,
        }}
      ></div>
    </div>
  );
}

export default KoreaMap;
