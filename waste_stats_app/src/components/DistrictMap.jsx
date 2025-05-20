import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

function DistrictMap({ data, province, onLoaded }) {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [isMobile, setIsMobile] = useState(false);

  const customLabelPositions = {
    성남시: [null, 14],
    수원시: [null, 14],
    용인시: [-16, -14],
    이천시: [-10, -10],
    안산시: [-16, 6],
    군포시: [null, 6],
    과천시: [null, -6],
    천안시: [2, -30],
    서산시: [15, -70],
    당진시: [-50, 25],
    홍성군: [55, -28],
    보령시: [42, -40],
    서천군: [36, -20],
    태안군: [-30, -100],
    포항시: [-30, -50],
    경주시: [-40, -36],
    영덕군: [-10, -38],
    울진군: [-10, -50],
    청주시: [-28, -10],
    전주시: [null, -8],
    순천시: [-10, -46],
    광양시: [16, -36],
    여수시: [-50, -140],
    고흥군: [-56, -76],
    보성군: [16, -46],
    장흥군: [null, -76],
    강진군: [-10, -76],
    영암군: [60, 2],
    무안군: [15, -30],
    신안군: [15, -140],
    영광군: [30, -30],
    완도군: [50, -50],
    해남군: [15, -80],
    진도군: [15, -40],
    창원시: [-10, 40],
    제주시: [300, -140],
    서귀포시: [280, -100],
    // 추가 커스텀 라벨 위치 지정 가능
  };

  const provinceMap = {
    서울특별시: "seoul",
    서울: "seoul",
    부산광역시: "busan",
    부산: "busan",
    대구광역시: "daegu",
    대구: "daegu",
    인천광역시: "incheon",
    인천: "incheon",
    광주광역시: "gwangju",
    광주: "gwangju",
    대전광역시: "daejeon",
    대전: "daejeon",
    울산광역시: "ulsan",
    울산: "ulsan",
    세종특별자치시: "sejong",
    세종: "sejong",
    경기도: "gyeonggi",
    경기: "gyeonggi",
    강원도: "gangwon",
    강원: "gangwon",
    충청북도: "chungbuk",
    충북: "chungbuk",
    충청남도: "chungnam",
    충남: "chungnam",
    전라북도: "jeonbuk",
    전북: "jeonbuk",
    전라남도: "jeonnam",
    전남: "jeonnam",
    경상북도: "gyeongbuk",
    경북: "gyeongbuk",
    경상남도: "gyeongnam",
    경남: "gyeongnam",
    제주특별자치도: "jeju",
    제주: "jeju",
  };

  const getDistrictName = (fullName) => {
    return fullName.replace(
      /^(서울특별시|부산광역시|전라남도|강원특별자치도|경기도|충청남도|인천광역시|충청북도|대전광역시|경상북도|대구광역시|울산광역시|경상남도|전북특별차지도|광주광역시|제주특별자치도|제주도)\s*/,
      ""
    );
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!province) return;

    const width = 700;
    const height = 500;
    const filename = provinceMap[province] || province.toLowerCase();
    const geoUrl = `/geo/sgg/${filename}-geo.json`;

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height + 60}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    d3.json(geoUrl)
      .then((geoData) => {
        // ✅ 중복 제거 코드
        svg.selectAll(".map-layer").remove();
        svg.selectAll(".label-layer").remove();
        svg.selectAll(".legend").remove();
        svg.select("defs").remove();

        const projection = d3.geoMercator().fitSize([width, height], geoData);
        const path = d3.geoPath().projection(projection);

        const values = Object.values(data);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const colorScale = d3.scaleQuantize().domain([minValue, maxValue]).range(["#fef0d9", "#fdcc8a", "#fc8d59", "#e34a33", "#b30000"]);

        svg
          .append("g")
          .selectAll("path")
          .data(geoData.features)
          .join("path")
          .attr("d", path)
          .attr("fill", (d) => {
            const trimmedName = getDistrictName(d.properties.SGG_NM);
            const value = data[trimmedName];
            return value ? colorScale(value) : "#eee";
          })
          .attr("stroke", "#888")
          .attr("stroke-width", 1)
          .attr("fill-opacity", 0.95)
          .on("mouseover", function (e, d) {
            const name = d.properties.SGG_NM;
            const trimmedName = getDistrictName(name);
            const value = data[trimmedName];
            d3.select(this).attr("stroke", "#000").attr("stroke-width", 2);
            d3.select(tooltipRef.current)
              .style("opacity", 1)
              .html(`<strong>${name}</strong><br/>${value ? `${Math.floor(value).toLocaleString()}톤` : "데이터 없음"}`);
          })
          .on("mousemove", function (e) {
            const svgBounds = svgRef.current.getBoundingClientRect();
            d3.select(tooltipRef.current)
              .style("left", e.clientX - svgBounds.left + 10 + "px")
              .style("top", e.clientY - svgBounds.top - 40 + "px");
          })
          .on("mouseout", function (e, d) {
            const trimmedName = getDistrictName(d.properties.SGG_NM);
            const value = data[trimmedName];
            d3.select(this)
              .attr("stroke", "#888")
              .attr("stroke-width", 1)
              .attr("fill", value ? colorScale(value) : "#eee");
            d3.select(tooltipRef.current).style("opacity", 0);
          });

        const labelGroup = svg.append("g");

        const shownLabels = new Set();
        const filteredFeatures = geoData.features.filter((d) => {
          const name = getDistrictName(d.properties.SGG_NM);
          if (shownLabels.has(name)) return false;
          shownLabels.add(name);
          return true;
        });

        labelGroup
          .selectAll("text")
          .data(filteredFeatures)
          .join("text")
          .text((d) => getDistrictName(d.properties.SGG_NM))
          .attr("x", (d) => {
            const name = getDistrictName(d.properties.SGG_NM);
            const [cx, cy] = path.centroid(d);
            const [dx] = customLabelPositions[name] || [];
            return isNaN(cx) ? 0 : cx + (dx ?? 0);
          })
          .attr("y", (d) => {
            const name = getDistrictName(d.properties.SGG_NM);
            const [cx, cy] = path.centroid(d);
            const [, dy] = customLabelPositions[name] || [];
            return isNaN(cy) ? 0 : cy + (dy ?? 0);
          })
          .attr("text-anchor", "middle")
          .attr("dy", null)
          .attr("font-size", isMobile ? "9px" : "11px")
          .attr("fill", "#111")
          .attr("pointer-events", "none");

        const legendWidth = 200;
        const legendHeight = 10;
        const legendX = width / 2 - legendWidth / 2;
        const legendY = height + 40;

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

        const gradient = legend.append("defs").append("linearGradient").attr("id", "district-legend-gradient");
        const step = 100 / (colorScale.range().length - 1);
        colorScale.range().forEach((color, i) => {
          gradient
            .append("stop")
            .attr("offset", `${i * step}%`)
            .attr("stop-color", color);
        });

        legend.append("rect").attr("x", legendX).attr("y", legendY).attr("width", legendWidth).attr("height", legendHeight).style("fill", "url(#district-legend-gradient)");

        legend
          .append("g")
          .attr("transform", `translate(${legendX}, ${legendY + legendHeight})`)
          .call(legendAxis)
          .selectAll("text")
          .style("font-size", "10px");

        if (onLoaded) requestAnimationFrame(() => onLoaded());
      })
      .catch((err) => {
        console.error("❌ GeoJSON 로딩 실패:", err);
        if (onLoaded) onLoaded();
      });
  }, [data, province, isMobile, onLoaded]);

  return (
    <>
      <svg
        ref={svgRef}
        style={{
          width: "100%",
          maxWidth: "700px",
          height: isMobile ? "66vh" : "86vh",
          display: "block",
        }}
      />
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
    </>
  );
}

export default DistrictMap;
