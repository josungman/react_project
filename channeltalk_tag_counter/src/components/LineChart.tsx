import React, { useState } from "react";
import ReactApexChart from "react-apexcharts";

interface DailyData {
  date: string;
  amount: number;
}

interface LineChartProps {
  data: DailyData[];
  title?: string;
}

const LineChart: React.FC<LineChartProps> = ({ data, title = "일별 예약금 추이" }) => {
  const [chartType, setChartType] = useState<"line" | "bar">("line");

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">{title}</h2>
        <div className="text-center py-8 text-gray-500">표시할 데이터가 없습니다.</div>
      </div>
    );
  }

  // ApexCharts 설정
  const chartOptions = {
    chart: {
      type: chartType as "line" | "bar",
      height: 280,
      toolbar: {
        show: false,
      },
      animations: {
        enabled: true,
        easing: "easeinout" as const,
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350,
        },
      },
    },
    stroke: {
      curve: "smooth" as const,
      width: 4,
      colors: ["#2563eb"],
    },
    markers: {
      size: chartType === "line" ? 8 : 0,
      colors: ["#2563eb"],
      strokeColors: "#ffffff",
      strokeWidth: 2,
      hover: {
        size: chartType === "line" ? 8 : 0,
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: "60%",
        colors: {
          ranges: [
            {
              from: 0,
              to: 100000000,
              color: "#2563eb",
            },
          ],
        },
      },
    },
    xaxis: {
      categories: data.map((item) => item.date),
      labels: {
        style: {
          colors: "#666",
          fontSize: "10px",
          fontWeight: "500",
        },
        rotate: -45,
        rotateAlways: false,
        maxHeight: 50,
        hideOverlappingLabels: true,
        showDuplicates: false,
      },
      tickAmount: data.length > 15 ? Math.ceil(data.length / 3) : data.length,
    },
    yaxis: {
      labels: {
        show: false,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        if (val >= 10000) {
          return (val / 10000).toFixed(0) + "만원";
        } else {
          return val.toLocaleString() + "원";
        }
      },
      style: {
        fontSize: "8px",
        fontWeight: "bold",
        colors: ["#2563eb"],
      },
      offsetY: -6,
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val.toLocaleString() + "원";
        },
      },
    },
    grid: {
      borderColor: "#e1e5e9",
      strokeDashArray: 5,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: false,
        },
      },
    },
    legend: {
      show: false,
    },
    fill: {
      type: "solid",
      colors: ["transparent"],
    },
  };

  const chartSeries = [
    {
      name: "예약금",
      data: data.map((item) => item.amount),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-2 sm:p-4">
      {/* 차트 타입 전환 버튼 */}
      <div className="flex justify-end mb-2">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setChartType("line")}
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
              chartType === "line" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            라인 차트
          </button>
          <button
            onClick={() => setChartType("bar")}
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
              chartType === "bar" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            막대 차트
          </button>
        </div>
      </div>

      <div className="h-64 sm:h-80">
        <ReactApexChart options={chartOptions} series={chartSeries} type={chartType} height={280} />
      </div>
    </div>
  );
};

export default LineChart;
