import { useState, useEffect, useCallback } from "react";
import LineChart from "./LineChart";
import NavigationHeader from "./common/NavigationHeader";
import { formatTime } from "../utils/timeUtils";

interface DailyReservationData {
  date: string;
  amount: number;
}

interface ReservationDetail {
  date: string;
  time: string;
  customerName: string;
  amount: number;
}

// 시간 설정 상수
const TIME_CONFIG = {
  COUNTDOWN_INITIAL: 60, //초
  PROGRESS_UPDATE_INTERVAL: 1000, // 1초
  ANIMATION_DURATION: 1000,
};

export default function ReservationCounter() {
  const [dailyData, setDailyData] = useState<DailyReservationData[]>([]);
  const [reservationDetails, setReservationDetails] = useState<ReservationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState<number>(TIME_CONFIG.COUNTDOWN_INITIAL);

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 정렬 상태
  const [sortField, setSortField] = useState<"date" | "time" | "customerName" | "amount">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // 일별 데이터 생성 함수 (상세 데이터에서 계산)
  const generateDailyData = (details: ReservationDetail[]): DailyReservationData[] => {
    const dailyMap = new Map<string, number>();

    // 상세 데이터에서 날짜별로 예약금 합계 계산
    details.forEach((detail) => {
      const currentAmount = dailyMap.get(detail.date) || 0;
      dailyMap.set(detail.date, currentAmount + detail.amount);
    });

    // 날짜 순으로 정렬하여 배열로 변환
    const sortedDates = Array.from(dailyMap.keys()).sort((a, b) => {
      const dateA = new Date(`2024/${a}`);
      const dateB = new Date(`2024/${b}`);
      return dateA.getTime() - dateB.getTime();
    });

    return sortedDates.map((date) => ({
      date,
      amount: dailyMap.get(date) || 0,
    }));
  };

  // 상세 예약 데이터 생성 함수
  const generateReservationDetails = (): ReservationDetail[] => {
    const details: ReservationDetail[] = [];
    const today = new Date();
    const customerNames = ["김철수", "이영희", "박민수", "최지영", "정현우", "한소영", "윤태호", "임수진", "강동원", "조미영"];

    // 오늘부터 7일전까지 각 날짜별로 1~4개의 예약 생성
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      const reservationCount = Math.floor(Math.random() * 4) + 1; // 1~4개 예약

      for (let j = 0; j < reservationCount; j++) {
        const timeStr = `${Math.floor(Math.random() * 24)
          .toString()
          .padStart(2, "0")}:${Math.floor(Math.random() * 60)
          .toString()
          .padStart(2, "0")}`;
        const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];
        const amount = Math.floor(Math.random() * 1000000) + 200000; // 20만원 ~ 120만원

        details.push({
          date: dateStr,
          time: timeStr,
          customerName: customerName,
          amount: amount,
        });
      }
    }

    // 날짜와 시간 순으로 정렬
    return details.sort((a, b) => {
      const dateA = new Date(`2024/${a.date}`);
      const dateB = new Date(`2024/${b.date}`);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      return a.time.localeCompare(b.time);
    });
  };

  // 데이터 가져오기 함수
  const fetchData = useCallback(async () => {
    setError(null);

    try {
      setLoading(true);
      const detailData = generateReservationDetails();
      const mockData = generateDailyData(detailData);
      setReservationDetails(detailData);
      setDailyData(mockData);
      setLastUpdated(new Date());
    } catch (err) {
      setError("예약금 데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 카운트다운 타이머와 API 호출 동기화
  useEffect(() => {
    // 초기 데이터 로드
    fetchData();

    // 카운트다운 타이머 (1초마다)
    const countdownInterval = setInterval(() => {
      setCountdown((prev: number) => {
        if (prev <= 1) {
          // 카운트다운이 끝나면 데이터 새로고침
          fetchData();
          return TIME_CONFIG.COUNTDOWN_INITIAL;
        }
        return prev - 1;
      });
    }, TIME_CONFIG.PROGRESS_UPDATE_INTERVAL);

    return () => clearInterval(countdownInterval);
  }, [fetchData]);

  // 프로그레스바 계산
  const progressPercentage = ((TIME_CONFIG.COUNTDOWN_INITIAL - countdown) / TIME_CONFIG.COUNTDOWN_INITIAL) * 100;

  // 오늘 날짜 계산
  const today = new Date();
  const todayStr = `${today.getMonth() + 1}/${today.getDate()}`;

  // 금일 총 예약금 (오늘 날짜의 예약금만 합계)
  const todayTotalAmount = reservationDetails.filter((item) => item.date === todayStr).reduce((sum, item) => sum + item.amount, 0);

  // 전체 기간 총 예약금 (차트용)
  const totalAmount = dailyData.reduce((sum, item) => sum + item.amount, 0);

  // 정렬 함수
  const sortData = (data: ReservationDetail[]) => {
    return [...data].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "date":
          aValue = new Date(`2024/${a.date}`).getTime();
          bValue = new Date(`2024/${b.date}`).getTime();
          break;
        case "time":
          aValue = a.time;
          bValue = b.time;
          break;
        case "customerName":
          aValue = a.customerName;
          bValue = b.customerName;
          break;
        case "amount":
          aValue = a.amount;
          bValue = b.amount;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  // 정렬된 데이터
  const sortedData = sortData(reservationDetails);

  // 페이징 계산
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = sortedData.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader title="예약금 통계" />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader title="예약금 통계" />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader title="예약금 통계" />
      <div className="max-w-6xl mx-auto p-6">
        {/* 모니터링 상태 카드 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{formatTime.dateOnly(new Date())} 화면구성완료(데이터 연동 필요. 목업데이터 사용중)</h2>
            </div>
            <div>
              <p className="text-lg text-gray-600 font-medium">최종 업데이트 일시: {formatTime.timeOnly(lastUpdated)}</p>
            </div>
          </div>

          {/* 다음 업데이트까지 카운트다운 프로그레스바 */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>다음 업데이트까지</span>
              <span>{countdown}초 남음</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${progressPercentage}%`,
                  transitionDuration: `${TIME_CONFIG.ANIMATION_DURATION}ms`,
                }}
              ></div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm">오류: {error}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">예약금 통계(최근 7일)</h2>

          {/* 요약 카드들 */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg text-center">
              <h3 className="text-lg font-medium text-blue-600 mb-2">금일 총 예약금</h3>
              <p className="text-4xl font-bold text-blue-800">{todayTotalAmount.toLocaleString()}원</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg text-center">
              <h3 className="text-lg font-medium text-green-600 mb-2">최근 7일 총 예약금</h3>
              <p className="text-4xl font-bold text-green-800">{totalAmount.toLocaleString()}원</p>
            </div>
          </div>

          {/* 차트 */}
          <div className="mb-6">
            <LineChart data={dailyData} title="일별 예약금 추이" />
          </div>

          {/* 상세 테이블 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">상세 내역</h3>
              <div className="text-sm text-gray-600">
                총 {sortedData.length}건 (페이지 {currentPage} / {totalPages})
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th
                      className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => {
                        if (sortField === "date") {
                          setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                        } else {
                          setSortField("date");
                          setSortDirection("asc");
                        }
                        setCurrentPage(1);
                      }}
                    >
                      <div className="flex items-center gap-1">
                        날짜
                        {sortField === "date" && <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">일시</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">입금자명</th>
                    <th
                      className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => {
                        if (sortField === "amount") {
                          setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                        } else {
                          setSortField("amount");
                          setSortDirection("asc");
                        }
                        setCurrentPage(1);
                      }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        예약금 (원)
                        {sortField === "amount" && <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, index) => (
                    <tr key={startIndex + index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900 border-b">{item.date}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border-b">{item.time}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border-b">{item.customerName}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border-b text-right">{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이징 컨트롤 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center mt-6 space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-sm border rounded-md ${currentPage === pageNum ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:bg-gray-50"}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
