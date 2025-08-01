import LineChart from "./LineChart";

interface ReservationDetail {
  date: string;
  time: string;
  customerName: string;
  amount: number;
}

interface DailyReservationData {
  date: string;
  amount: number;
}

interface ReservationChartProps {
  reservationDetails: ReservationDetail[];
  maxAmountFilter: number;
  startDate: Date;
  endDate: Date;
}

export default function ReservationChart({ reservationDetails, maxAmountFilter, startDate, endDate }: ReservationChartProps) {
  // 차트용 일별 데이터 생성 함수
  const generateChartData = (details: ReservationDetail[]): DailyReservationData[] => {
    const dailyMap = new Map<string, number>();

    // 상세 데이터에서 날짜별로 예약금 합계 계산
    details.forEach((detail) => {
      const currentAmount = dailyMap.get(detail.date) || 0;
      dailyMap.set(detail.date, currentAmount + detail.amount);
    });

    // 조회기간의 모든 날짜 생성
    const allDates: DailyReservationData[] = [];
    const currentDate = new Date(startDate);
    const endDateForChart = new Date(endDate);

    while (currentDate <= endDateForChart) {
      const dateStr = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
      allDates.push({
        date: dateStr,
        amount: dailyMap.get(dateStr) || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return allDates;
  };

  // 금액 필터 적용된 데이터
  const filteredData = reservationDetails.filter((item) => item.amount <= maxAmountFilter);

  return (
    <div className="mb-4 sm:mb-6">
      <LineChart data={generateChartData(filteredData)} title="일별 예약금 추이" />
    </div>
  );
}
