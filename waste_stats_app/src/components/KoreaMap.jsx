import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as d3 from "d3";

function KoreaMap({ data, onClickProvince }) {
  const svgRef = useRef();
  const navigate = useNavigate(); // ✅ 추가
  const tooltipRef = useRef();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const width = 700;
    const height = 500;

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height + 60}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

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

    d3.json("/geo/jeongug-sido-geo_opt.json").then((geoData) => {
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
        .style("transition", "all 0.2s ease")
        .on("click", (e, d) => {
          const name = d.properties.CTP_KOR_NM;
          const key = labelMap[name] || name;
          navigate(`/map/${key}`); // ✅ 클릭 시 시군구 상세 페이지로 이동
          onClickProvince(key);
        })
        .on("mouseover", function (e, d) {
          const name = d.properties.CTP_KOR_NM;
          const key = labelMap[name] || name;
          const value = data[key];
          d3.select(this).attr("stroke", "#000").attr("stroke-width", 2);

          d3.select(tooltipRef.current)
            .style("opacity", 1)
            .html(`<strong>${key}</strong><br/>${value ? `${Math.floor(value).toLocaleString()}톤` : "데이터 없음"}`);
        })
        .on("mousemove", function (e) {
          d3.select(tooltipRef.current)
            .style("left", e.pageX + 10 + "px")
            .style("top", e.pageY - 40 + "px");
        })
        .on("mouseout", function (e, d) {
          const name = d.properties.CTP_KOR_NM;
          const key = labelMap[name] || name;
          const value = data[key];
          d3.select(this)
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
        .text((d) => labelMap[d.properties.CTP_KOR_NM] || d.properties.CTP_KOR_NM)
        .attr("x", (d) => path.centroid(d)[0])
        .attr("y", (d) => path.centroid(d)[1])
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", isMobile ? "10px" : "12px")
        .attr("fill", "#111")
        .attr("pointer-events", "none");

      const legendWidth = 200;
      const legendHeight = 10;
      const legendX = width / 2 - legendWidth / 2;
      const legendY = height + 100;

      const legend = svg.append("g").attr("class", "legend");
      const legendScale = d3.scaleLinear().domain([minValue, maxValue]).range([0, legendWidth]);
      const legendAxis = d3
        .axisBottom(legendScale)
        .ticks(5)
        .tickFormat((d) => (d >= 1000000 ? `${d / 1000000}백만` : `${Math.round(d / 10000)}만`));

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
    });
  }, [data, onClickProvince, isMobile]);

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
      ></svg>

      {/* ✅ 툴팁 */}
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

export default KoreaMap;
