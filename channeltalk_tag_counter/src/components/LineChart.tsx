import React from "react";
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
      type: "line" as const,
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
    stroke: {
      curve: "smooth" as const,
      width: 4,
      colors: ["#1e40af"],
    },
    markers: {
      size: 8,
      colors: ["#1e40af"],
      strokeColors: "#ffffff",
      strokeWidth: 3,
      hover: {
        size: 10,
      },
    },
    xaxis: {
      categories: data.map((item) => item.date),
      labels: {
        style: {
          colors: "#666",
          fontSize: "16px",
          fontWeight: "500",
        },
      },
    },
    yaxis: {
      labels: {
        show: false,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return (val / 10000).toFixed(0) + "만원";
      },
      style: {
        fontSize: "12px",
        fontWeight: "bold",
        colors: ["#1e40af"],
      },
      offsetY: -10,
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
          show: true,
        },
      },
    },
    legend: {
      show: false,
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        shadeIntensity: 0.2,
        gradientToColors: ["#1e40af"],
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0.2,
        stops: [0, 100],
      },
    },
  };

  const chartSeries = [
    {
      name: "예약금",
      data: data.map((item) => item.amount),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="h-96">
        <ReactApexChart options={chartOptions} series={chartSeries} type="line" height={400} />
      </div>
    </div>
  );
};

export default LineChart;
