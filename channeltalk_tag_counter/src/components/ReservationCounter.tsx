import { useState, useEffect, useCallback, useRef } from "react";
import NavigationHeader from "./common/NavigationHeader";
import { formatTime } from "../utils/timeUtils";
import TimeSettingsModal from "./TimeSettingsModal";
import DateRangeSliderModal from "./DateRangeSliderModal";
import AmountFilterModal from "./AmountFilterModal";
import SummaryCards from "./SummaryCards";
import ReservationChart from "./ReservationChart";
import ReservationDetails from "./ReservationDetails";
import Toast from "./Toast";
import { collectBankDeposits, fetchBankDeposits, type BankDeposit } from "../services/api";

interface ReservationDetail {
  date: string;
  time: string;
  customerName: string;
  amount: number;
}

// 시간 설정 상수
const TIME_CONFIG = {
  COUNTDOWN_INITIAL: 60, // 1분
  PROGRESS_UPDATE_INTERVAL: 1000, // 1초
  ANIMATION_DURATION: 1000,
};

export default function ReservationCounter() {
  const [reservationDetails, setReservationDetails] = useState<ReservationDetail[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [updateInterval, setUpdateInterval] = useState<number>(() => {
    // localStorage에서 저장된 업데이트 간격 불러오기
    const saved = localStorage.getItem("reservationUpdateInterval");
    return saved ? parseInt(saved) : TIME_CONFIG.COUNTDOWN_INITIAL;
  });
  const [countdown, setCountdown] = useState<number>(updateInterval);

  // 중복 요청 방지를 위한 상태
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const lastCollectRequest = useRef<string>("");

  // 조회 기간 상태 (일수 기반)
  const [queryDays, setQueryDays] = useState<number>(() => {
    // localStorage에서 저장된 조회 일수 불러오기
    const savedDays = localStorage.getItem("reservationQueryDays");
    const days = savedDays ? parseInt(savedDays) : 7;
    return days >= 1 && days <= 30 ? days : 7;
  });

  // 날짜 계산 (일수 기반)
  const [startDate, setStartDate] = useState<Date>(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - queryDays + 1);
    return startDate;
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    return new Date(); // 오늘을 종료일로
  });
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState<boolean>(false);
  const [isAmountFilterModalOpen, setIsAmountFilterModalOpen] = useState<boolean>(false);

  // 금액 필터 상태
  const [maxAmountFilter, setMaxAmountFilter] = useState<number>(() => {
    // localStorage에서 저장된 최대 금액 필터 불러오기
    const savedAmount = localStorage.getItem("reservationMaxAmountFilter");
    const amount = savedAmount ? parseInt(savedAmount) : 100000000; // 기본값: 1억원
    return amount >= 100000 && amount <= 100000000 ? amount : 100000000;
  });

  // 토스트 상태
  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isVisible: false,
    message: "",
    type: "info",
  });

  // API 데이터를 ReservationDetail 형식으로 변환하는 함수
  const convertApiDataToReservationDetails = (apiData: BankDeposit[]): ReservationDetail[] => {
    return apiData.map((deposit) => {
      const regDate = new Date(deposit.reg_dt);
      const dateStr = `${regDate.getMonth() + 1}/${regDate.getDate()}`;
      const timeStr = `${regDate.getHours().toString().padStart(2, "0")}:${regDate.getMinutes().toString().padStart(2, "0")}`;

      return {
        date: dateStr,
        time: timeStr,
        customerName: deposit.depositor_name,
        amount: deposit.amount,
      };
    });
  };

  // 데이터 가져오기 함수
  const fetchData = useCallback(
    async (isTimerTriggered = false) => {
      setError(null);

      // 중복 요청 방지: 현재 요청 중이면 스킵
      if (isCollecting) {
        console.log("🔄 이미 수집 중인 요청이 있어서 스킵합니다.");
        return;
      }

      // 타이머 기반 업데이트의 경우 중복 요청 방지 로직을 더 엄격하게 적용
      if (isTimerTriggered) {
        const requestKey = `${startDate.toISOString().split("T")[0]}_${endDate.toISOString().split("T")[0]}_timer`;
        if (lastCollectRequest.current === requestKey) {
          console.log("⏰ 타이머 기반 중복 요청을 스킵합니다:", requestKey);
          return;
        }
        lastCollectRequest.current = requestKey;
      } else {
        // 수동 업데이트의 경우 기존 로직 유지
        const requestKey = `${startDate.toISOString().split("T")[0]}_${endDate.toISOString().split("T")[0]}`;
        if (lastCollectRequest.current === requestKey) {
          console.log("🔄 동일한 날짜 범위에 대한 중복 요청을 스킵합니다:", requestKey);
          return;
        }
        lastCollectRequest.current = requestKey;
      }

      try {
        setIsCollecting(true);

        // 모든 경우에 수집 + 조회 수행
        console.log(isTimerTriggered ? "⏰ 타이머 기반 업데이트: 수집 + 조회 수행" : "🔄 수동 업데이트: 수집 + 조회 수행");

        // 첫 번째 API: 예약금 수집 (토스트 메시지 없음)
        await collectBankDeposits(startDate, endDate);

        // 두 번째 API: 예약금 데이터 조회 (성공/실패 상관없이 실행)
        try {
          const bankDepositsData = await fetchBankDeposits(startDate, endDate);
          const detailData = convertApiDataToReservationDetails(bankDepositsData.data);

          setReservationDetails(detailData);
          setLastUpdated(new Date());
        } catch (fetchError) {
          console.error("예약금 데이터 조회 실패:", fetchError);
          setError("예약금 데이터를 불러오는데 실패했습니다.");
        }
      } catch (err) {
        console.error("데이터 처리 중 오류:", err);
        setError("예약금 데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsCollecting(false);
      }
    },
    [startDate, endDate, isCollecting]
  );

  // 날짜 업데이트 (queryDays가 변경될 때)
  useEffect(() => {
    const today = new Date();
    const newStartDate = new Date(today);
    newStartDate.setDate(today.getDate() - queryDays + 1);

    setStartDate(newStartDate);
    setEndDate(today);
  }, [queryDays]);

  // 카운트다운 타이머와 API 호출 동기화
  useEffect(() => {
    // 초기 데이터 로드
    fetchData(false);

    // 카운트다운 타이머 (1초마다)
    const countdownInterval = setInterval(() => {
      setCountdown((prev: number) => {
        if (prev <= 1) {
          // 카운트다운이 끝나면 데이터 새로고침 후 리셋
          fetchData(true);
          return updateInterval;
        }
        return prev - 1;
      });
    }, TIME_CONFIG.PROGRESS_UPDATE_INTERVAL);

    return () => clearInterval(countdownInterval);
  }, [fetchData, updateInterval]);

  // 프로그레스바 계산
  const progressPercentage = ((updateInterval - countdown) / updateInterval) * 100;

  // 조회기간 일수 계산
  const dateDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1);

  // 조회 기간 변경 핸들러
  const handleQueryDaysChange = useCallback(
    (newDays: number) => {
      setQueryDays(newDays);

      // 날짜 업데이트
      const today = new Date();
      const newStartDate = new Date(today);
      newStartDate.setDate(today.getDate() - newDays + 1);

      setStartDate(newStartDate);
      setEndDate(today);

      // 조회 일수를 localStorage에 저장
      localStorage.setItem("reservationQueryDays", newDays.toString());

      // 새로운 날짜로 직접 데이터 새로고침 (중복 방지 로직이 fetchData에 포함됨)
      fetchData(false);
    },
    [fetchData]
  );

  // 토스트 닫기 핸들러
  const handleToastClose = useCallback(() => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  // 금액 필터 변경 핸들러
  const handleMaxAmountChange = useCallback((newMaxAmount: number) => {
    setMaxAmountFilter(newMaxAmount);
    // localStorage에 최대 금액 필터 저장
    localStorage.setItem("reservationMaxAmountFilter", newMaxAmount.toString());
  }, []);

  // 업데이트 간격 변경 핸들러
  const handleUpdateIntervalChange = useCallback(
    (interval: number) => {
      // 유효성 검사: 30초 이상 3600초 이하인지 확인
      if (interval >= 30 && interval <= 3600) {
        setUpdateInterval(interval);
        setCountdown(interval); // 새로운 간격으로 리셋
        // localStorage에 업데이트 간격 저장
        localStorage.setItem("reservationUpdateInterval", interval.toString());

        // 즉시 데이터 새로고침
        fetchData(false);
      }
    },
    [fetchData]
  );

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
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-medium text-gray-700 mt-2">
                조회 기간: {formatTime.dateOnly(startDate)} ~ {formatTime.dateOnly(endDate)}
              </h2>
              {isCollecting && (
                <div className="flex items-center gap-2 text-sm text-blue-600 mt-3">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  데이터 수집 중...
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <p className="text-lg text-gray-600 font-medium">최종 업데이트 일시: {formatTime.timeOnly(lastUpdated)}</p>
              <button
                onClick={() => setIsDateRangeModalOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="조회 기간 설정"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setIsAmountFilterModalOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="예약금 표출 설정"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
                  />
                </svg>
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors" title="설정">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
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

        {/* 필터 상태 표시 */}
        {maxAmountFilter <= 100000000 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
                />
              </svg>
              <span className="text-blue-800 font-medium">
                {maxAmountFilter >= 100000000 ? "1억원 이하 예약금만 표시" : `${(maxAmountFilter / 10000).toFixed(0)}만원 이하 예약금만 표시`}
              </span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-0">예약금 통계</h2>

          {/* 요약 카드들 */}
          <SummaryCards reservationDetails={reservationDetails} maxAmountFilter={maxAmountFilter} dateDiff={dateDiff} />

          {/* 상세 내역 */}
          <ReservationDetails reservationDetails={reservationDetails} maxAmountFilter={maxAmountFilter} />

          {/* 차트 */}
          <ReservationChart reservationDetails={reservationDetails} maxAmountFilter={maxAmountFilter} startDate={startDate} endDate={endDate} />
        </div>
      </div>

      {/* 시간 설정 모달 */}
      <TimeSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} updateInterval={updateInterval} onUpdateIntervalChange={handleUpdateIntervalChange} />

      {/* 조회 기간 설정 모달 */}
      <DateRangeSliderModal isOpen={isDateRangeModalOpen} onClose={() => setIsDateRangeModalOpen(false)} currentDays={queryDays} onDaysChange={handleQueryDaysChange} />

      {/* 예약금 표출 설정 모달 */}
      <AmountFilterModal
        isOpen={isAmountFilterModalOpen}
        onClose={() => setIsAmountFilterModalOpen(false)}
        currentMaxAmount={maxAmountFilter}
        onMaxAmountChange={handleMaxAmountChange}
      />

      {/* 토스트 알림 */}
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={handleToastClose} />
    </div>
  );
}
