interface ReservationDetail {
  date: string;
  time: string;
  customerName: string;
  amount: number;
}

interface SummaryCardsProps {
  reservationDetails: ReservationDetail[];
  maxAmountFilter: number;
  dateDiff: number;
}

export default function SummaryCards({ reservationDetails, maxAmountFilter, dateDiff }: SummaryCardsProps) {
  // 오늘 날짜 계산
  const today = new Date();
  const todayStr = `${today.getMonth() + 1}/${today.getDate()}`;

  // 금액 필터 적용된 데이터
  const filteredData = reservationDetails.filter((item) => item.amount <= maxAmountFilter);

  // 금일 총 예약금 (오늘 날짜의 예약금만 합계) - 필터링 적용
  const todayTotalAmount = filteredData.filter((item) => item.date === todayStr).reduce((sum, item) => sum + item.amount, 0);

  // 전체 기간 총 예약금 - 필터링 적용
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-blue-50 p-4 rounded-lg text-center">
        <h3 className="text-base font-medium text-blue-600 mb-1">금일 총 예약금</h3>
        <p className="text-3xl font-bold text-blue-800">{todayTotalAmount.toLocaleString()}원</p>
      </div>
      <div className="bg-green-50 p-4 rounded-lg text-center">
        <h3 className="text-base font-medium text-green-600 mb-1">최근 {dateDiff}일 총 예약금</h3>
        <p className="text-3xl font-bold text-green-800">{totalAmount.toLocaleString()}원</p>
      </div>
    </div>
  );
}
