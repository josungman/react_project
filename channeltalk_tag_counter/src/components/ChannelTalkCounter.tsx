import React, { useState, useEffect, useCallback } from "react";
import NavigationHeader from "@/components/common/NavigationHeader";
import { fetchTagCounts, fetchExcludedTags } from "../services/api";
import type { TagCount } from "../services/api";
import { formatTime } from "../utils/timeUtils";
import ExcludedTagsModal from "./ExcludedTagsModal";
import TimeSettingsModal from "./TimeSettingsModal";
//import BarChart from "./BarChart";

// 시간 설정 상수
const TIME_CONFIG = {
  COUNTDOWN_INITIAL: 60, //초
  PROGRESS_UPDATE_INTERVAL: 1000, // 1초
  ANIMATION_DURATION: 1000,
};

const ChannelTalkCounter: React.FC = () => {
  const [tagCounts, setTagCounts] = useState<TagCount[]>([]);
  const [excludedTags, setExcludedTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [hideZeroReservations, setHideZeroReservations] = useState<boolean>(() => {
    // localStorage에서 저장된 설정 불러오기
    const saved = localStorage.getItem("hideZeroReservations");
    return saved ? JSON.parse(saved) : false;
  });

  const [rankByCompleted, setRankByCompleted] = useState<boolean>(() => {
    // localStorage에서 저장된 순위 기준 설정 불러오기
    const saved = localStorage.getItem("rankByCompleted");
    return saved ? JSON.parse(saved) : true; // 기본값은 예약완료 기준
  });

  const [updateInterval, setUpdateInterval] = useState<number>(() => {
    // localStorage에서 저장된 업데이트 간격 불러오기
    const saved = localStorage.getItem("updateInterval");
    return saved ? parseInt(saved) : TIME_CONFIG.COUNTDOWN_INITIAL;
  });

  const [countdown, setCountdown] = useState<number>(updateInterval);

  // 데이터 가져오기 함수
  const fetchData = useCallback(async () => {
    console.log("🔄 데이터 가져오기 시작 - ChannelTalkCounter.tsx의 fetchData 함수");
    setError(null);

    try {
      // 실제 API에서 데이터 가져오기
      console.log("📡 API 호출 시작 - fetchTagCounts()");
      const response = await fetchTagCounts();
      console.log("📡 API 응답 받음:", response);

      if (!response.success || !response.data) {
        throw new Error(response.error || "API에서 데이터를 가져오는데 실패했습니다.");
      }

      console.log("✅ 데이터 설정 완료:", response.data);
      setTagCounts(response.data);
      setLastUpdated(new Date());
      setCountdown(updateInterval); // 카운트다운을 현재 간격으로 리셋
    } catch (err) {
      console.error("❌ 데이터 가져오기 실패:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    }
  }, [updateInterval]);

  // 제외 태그 가져오기 함수
  const fetchExcludedTagsData = useCallback(async () => {
    try {
      const response = await fetchExcludedTags();
      if (response.success && response.data) {
        setExcludedTags(response.data);
      }
    } catch (err) {
      console.error("제외 태그 가져오기 실패:", err);
    }
  }, []);

  // 제외 태그 업데이트 핸들러
  const handleExcludedTagsUpdate = useCallback((updatedTags: string[]) => {
    setExcludedTags(updatedTags);
  }, []);

  // 업데이트 간격 변경 핸들러
  const handleUpdateIntervalChange = useCallback(
    (interval: number) => {
      setUpdateInterval(interval);
      setCountdown(interval); // 카운트다운을 새로운 간격으로 리셋
      // localStorage에 업데이트 간격 저장
      localStorage.setItem("updateInterval", interval.toString());

      // 즉시 데이터 새로고침하여 프로그레스바를 정상적으로 시작
      fetchData();
    },
    [fetchData]
  );

  // 0건 숨기기 설정 변경 핸들러
  const handleHideZeroReservationsChange = useCallback((checked: boolean) => {
    setHideZeroReservations(checked);
    // localStorage에 설정 저장
    localStorage.setItem("hideZeroReservations", JSON.stringify(checked));
  }, []);

  // 순위 기준 변경 핸들러
  const handleRankByCompletedChange = useCallback((rankByCompleted: boolean) => {
    setRankByCompleted(rankByCompleted);
    // localStorage에 설정 저장
    localStorage.setItem("rankByCompleted", JSON.stringify(rankByCompleted));
  }, []);

  // 카운트다운 타이머와 API 호출 동기화
  useEffect(() => {
    // 초기 데이터 로드
    fetchData();
    fetchExcludedTagsData();

    // 카운트다운 타이머 (1초마다)
    const countdownInterval = setInterval(() => {
      setCountdown((prev: number) => {
        if (prev <= 1) {
          // 카운트다운이 끝나면 데이터 새로고침
          fetchData();
          return updateInterval;
        }
        return prev - 1;
      });
    }, TIME_CONFIG.PROGRESS_UPDATE_INTERVAL);

    return () => clearInterval(countdownInterval);
  }, [fetchData, fetchExcludedTagsData, updateInterval]);

  // 프로그레스바 계산
  const progressPercentage = ((updateInterval - countdown) / updateInterval) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <NavigationHeader title="채널톡 태그 통계" />

      <div className="max-w-6xl mx-auto mt-8">
        {/* 컨트롤 패널 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{formatTime.dateOnly(new Date())}</h2>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-lg text-gray-600 font-medium">최종 업데이트 일시: {formatTime.timeOnly(lastUpdated)}</p>
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

        {/* 태그 통계 카드 - 에러가 없을 때만 표시 */}
        {!error && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">태그 통계</h2>

              {/* 요약 정보 - 우측에 배치 */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div>
                  <b>표출 태그 </b>{" "}
                  <span className="font-bold text-blue-600">
                    {(() => {
                      let filteredTags = tagCounts.filter((tag) => !excludedTags.includes(tag.tag));
                      if (hideZeroReservations) {
                        filteredTags = filteredTags.filter((tag) => tag.leftCount > 0);
                      }
                      return filteredTags.length;
                    })()}
                  </span>
                  개
                </div>
                <div>
                  <button onClick={() => setIsModalOpen(true)} className="cursor-pointer hover:text-red-700 transition-colors">
                    제외 태그 <span className="font-bold text-red-600">{excludedTags.length}</span>개
                  </button>
                </div>
                <div>
                  예약 완료{" "}
                  <span className="font-bold text-green-600">
                    {(() => {
                      const targetTag = tagCounts.find((tag) => tag.tag === "상담프로세스/예약완료");
                      if (targetTag) {
                        return `${targetTag.rightCount}`;
                      }
                      return "0/0";
                    })()}
                  </span>
                  건
                </div>
              </div>
            </div>

            {/* 설명 텍스트와 필터 옵션 */}
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">n/n건 (예약완료 / 상담태그)</span> - 예약완료태그 건수와 상담태그 건수를 표시합니다.
                  <br />* 하나의 상담방에 여러 태그가 동시 등록된 경우, 예약완료 건수도 해당 태그별로 중복 집계됩니다.
                  <br />* 이로 인해 태그별 예약, 총 예약완료 건수는 우측 상단 확인 가능합니다.
                </p>
              </div>

              {/* 순위 기준 선택 버튼 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-600 font-bold underline">순위 기준:</span>
                  <div className="flex bg-gray-100 rounded-md p-0.5">
                    <button
                      onClick={() => handleRankByCompletedChange(true)}
                      className={`px-2 py-0.5 text-xs rounded transition-all duration-200 ${
                        rankByCompleted ? "bg-blue-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                      }`}
                    >
                      예약완료
                    </button>
                    <button
                      onClick={() => handleRankByCompletedChange(false)}
                      className={`px-2 py-0.5 text-xs rounded transition-all duration-200 ${
                        !rankByCompleted ? "bg-blue-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                      }`}
                    >
                      상담태그
                    </button>
                  </div>
                </div>

                {/* 필터 옵션 */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hideZeroReservations"
                    checked={hideZeroReservations}
                    onChange={(e) => handleHideZeroReservationsChange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="hideZeroReservations" className="text-sm text-gray-700 cursor-pointer whitespace-nowrap">
                    예약완료 건수가 0건인 태그 숨기기
                  </label>
                </div>
              </div>
            </div>

            {(() => {
              // 제외 태그 필터링
              let filteredTagCounts = tagCounts.filter((tag) => !excludedTags.includes(tag.tag));

              // 0건 숨기기 설정이 활성화된 경우 예약완료 건수가 0인 태그 제외
              if (hideZeroReservations) {
                filteredTagCounts = filteredTagCounts.filter((tag) => tag.leftCount > 0);
              }

              if (filteredTagCounts.length === 0) {
                return <div className="text-center py-8 text-gray-500">표시할 태그가 없습니다.</div>;
              }

              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {(() => {
                    // 선택된 기준에 따라 정렬
                    const sortedTagCounts = [...filteredTagCounts].sort((a, b) => {
                      if (rankByCompleted) {
                        // 예약완료 기준 정렬 (내림차순)
                        return b.leftCount - a.leftCount;
                      } else {
                        // 전체 기준 정렬 (내림차순)
                        return b.rightCount - a.rightCount;
                      }
                    });

                    return sortedTagCounts.map((tagCount, index) => {
                      // 순위 계산 - 정렬된 인덱스 기반
                      const rank = index + 1;
                      const isFirst = rank === 1;
                      const rankText = `${rank}위`;
                      return (
                        <div
                          key={tagCount.tag}
                          className={
                            isFirst
                              ? "p-1 rounded border transition-all duration-300 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                              : "p-1 rounded border transition-all duration-300 bg-blue-50 border-blue-200"
                          }
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={isFirst ? "font-medium text-green-800 text-xs" : "font-medium text-gray-800 text-xs"}>{tagCount.tag}</span>
                            <span className={isFirst ? "text-[10px] text-green-500" : "text-[10px] text-gray-400"}>{rankText}</span>
                          </div>
                          <div className={isFirst ? "text-base font-bold mb-0.5 text-green-600" : "text-base font-bold mb-0.5 text-blue-600"}>
                            <span className="text-orange-500">{tagCount.leftCount}</span>/{tagCount.rightCount}건
                          </div>
                          <div className={isFirst ? "w-full rounded h-1 bg-green-200" : "w-full rounded h-1 bg-blue-200"}>
                            <div
                              className={isFirst ? "h-1 rounded transition-all duration-300 bg-green-600" : "h-1 rounded transition-all duration-300 bg-blue-400"}
                              style={{
                                width: `${
                                  ((rankByCompleted ? tagCount.leftCount : tagCount.rightCount) /
                                    Math.max(...sortedTagCounts.map((t) => (rankByCompleted ? t.leftCount : t.rightCount)))) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              );
            })()}
          </div>
        )}

        {/* BarChart 컴포넌트 주석처리 */}
        {/* <BarChart data={tagCounts} /> */}
      </div>

      {/* 제외 태그 관리 모달 */}
      <ExcludedTagsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onTagsUpdate={handleExcludedTagsUpdate} />

      {/* 시간 설정 모달 */}
      <TimeSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} updateInterval={updateInterval} onUpdateIntervalChange={handleUpdateIntervalChange} />
    </div>
  );
};

export default ChannelTalkCounter;
