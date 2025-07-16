import React from "react";
import ReactApexChart from "react-apexcharts";

interface TagCount {
  tag: string;
  count: number;
}

interface BarChartProps {
  data: TagCount[];
  title?: string;
}

const BarChart: React.FC<BarChartProps> = ({ data, title = "태그별 통계 차트" }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
        <div className="text-center py-8 text-gray-500">표시할 데이터가 없습니다.</div>
      </div>
    );
  }

  // ApexCharts 설정
  const chartOptions = {
    chart: {
      type: "bar" as const,
      height: 350,
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
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 15,
        dataLabels: {
          position: "top",
        },
        distributed: false,
        shadow: {
          enabled: true,
          color: "#000",
          top: 2,
          left: 2,
          blur: 4,
          opacity: 0.15,
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return val.toString();
      },
      offsetY: -20,
      style: {
        fontSize: "12px",
        colors: ["#304758"],
      },
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: data.map((item) => item.tag),
      labels: {
        style: {
          colors: "#666",
          fontSize: "12px",
        },
        rotate: -45,
        rotateAlways: false,
      },
    },

    fill: {
      opacity: 1,
      colors: ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"],
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val + "회 사용";
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
          show: true,
        },
      },
    },
  };

  const chartSeries = [
    {
      name: "사용 횟수",
      data: data.map((item) => item.count),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
      <div className="h-80">
        <ReactApexChart options={chartOptions} series={chartSeries} type="bar" height={350} />
      </div>
    </div>
  );
};

export default BarChart;
