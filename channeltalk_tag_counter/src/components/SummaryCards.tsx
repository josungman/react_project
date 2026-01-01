import { useState } from "react";

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
  const [isVisible, setIsVisible] = useState(false);

  // 오늘 날짜 계산 (년도 포함)
  const today = new Date();
  const todayStr = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

  // 금액 필터 적용된 데이터
  const filteredData = reservationDetails.filter((item) => item.amount <= maxAmountFilter);

  // 금일 총 예약금 (오늘 날짜의 예약금만 합계) - 필터링 적용
  const todayTotalAmount = filteredData.filter((item) => item.date === todayStr).reduce((sum, item) => sum + item.amount, 0);

  // 전체 기간 총 예약금 - 필터링 적용
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="mb-4">
      {/* 토글 버튼 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base sm:text-lg font-semibold text-gray-700">요약 통계</h3>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
        >
          <span>{isVisible ? "숨기기" : "보기"}</span>
          <svg className={`w-4 h-4 transition-transform ${isVisible ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* 카드들 */}
      {isVisible && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg text-center">
            <h3 className="text-sm sm:text-base font-medium text-blue-600 mb-1">금일 총 예약금</h3>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-800 break-words">{todayTotalAmount.toLocaleString()}원</p>
          </div>
          <div className="bg-green-50 p-3 sm:p-4 rounded-lg text-center">
            <h3 className="text-sm sm:text-base font-medium text-green-600 mb-1">최근 {dateDiff}일 총 예약금</h3>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-800 break-words">{totalAmount.toLocaleString()}원</p>
          </div>
        </div>
      )}
    </div>
  );
}
