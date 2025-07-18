import React, { useState, useEffect, useCallback } from "react";
import NavigationHeader from "@/components/common/NavigationHeader";
import { fetchTagCounts, fetchExcludedTags } from "../services/api";
import { formatTime } from "../utils/timeUtils";
import ExcludedTagsModal from "./ExcludedTagsModal";
//import BarChart from "./BarChart";

interface TagCount {
  tag: string;
  count: number;
}

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

  const [countdown, setCountdown] = useState<number>(TIME_CONFIG.COUNTDOWN_INITIAL);

  // 데이터 가져오기 함수
  const fetchData = useCallback(async () => {
    setError(null);

    try {
      // 실제 API에서 데이터 가져오기
      const response = await fetchTagCounts();
      if (!response.success || !response.data) {
        throw new Error(response.error || "API에서 데이터를 가져오는데 실패했습니다.");
      }

      setTagCounts(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      console.error("데이터 가져오기 실패:", err);
    }
  }, []);

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
          return TIME_CONFIG.COUNTDOWN_INITIAL;
        }
        return prev - 1;
      });
    }, TIME_CONFIG.PROGRESS_UPDATE_INTERVAL);

    return () => clearInterval(countdownInterval);
  }, [fetchData, fetchExcludedTagsData]);

  // 프로그레스바 계산
  const progressPercentage = ((TIME_CONFIG.COUNTDOWN_INITIAL - countdown) / TIME_CONFIG.COUNTDOWN_INITIAL) * 100;

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

        {/* 태그 통계 카드 - 에러가 없을 때만 표시 */}
        {!error && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">태그 통계</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div>
                  <b>표출 태그 </b>{" "}
                  <span className="font-bold text-blue-600">{tagCounts.filter((tag) => tag.count > 0).filter((tag) => !excludedTags.includes(tag.tag)).length}</span>개
                </div>
                <div>
                  <button onClick={() => setIsModalOpen(true)} className="cursor-pointer hover:text-red-700 transition-colors">
                    제외 태그 <span className="font-bold text-red-600">{excludedTags.length}</span>개
                  </button>
                </div>
                <div>
                  전체 건수{" "}
                  <span className="font-bold text-green-600">
                    {tagCounts
                      .filter((tag) => tag.count > 0)
                      .filter((tag) => !excludedTags.includes(tag.tag))
                      .reduce((sum, tag) => sum + tag.count, 0)}
                  </span>
                  건
                </div>
              </div>
            </div>

            {(() => {
              // 0건인 태그와 제외 태그 필터링
              const filteredTagCounts = tagCounts
                .filter((tag) => tag.count > 0) // 0건인 태그 제외
                .filter((tag) => !excludedTags.includes(tag.tag)); // 제외 태그 목록에 있는 태그 제외

              if (filteredTagCounts.length === 0) {
                return <div className="text-center py-8 text-gray-500">표시할 태그가 없습니다.</div>;
              }

              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {filteredTagCounts.map((tagCount, index) => {
                    // 순위 계산 - 단순하게 인덱스 기반
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
                        <div className={isFirst ? "text-base font-bold mb-0.5 text-green-600" : "text-base font-bold mb-0.5 text-blue-600"}>{tagCount.count}건</div>
                        <div className={isFirst ? "w-full rounded h-1 bg-green-200" : "w-full rounded h-1 bg-blue-200"}>
                          <div
                            className={isFirst ? "h-1 rounded transition-all duration-300 bg-green-600" : "h-1 rounded transition-all duration-300 bg-blue-400"}
                            style={{
                              width: `${(tagCount.count / Math.max(...filteredTagCounts.map((t) => t.count))) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* BarChart 컴포넌트 주석처리 */}
        {/* <BarChart data={tagCounts} /> */}
      </div>

      {/* 제외 태그 관리 모달 */}
      <ExcludedTagsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} excludedTags={excludedTags} onTagsUpdate={handleExcludedTagsUpdate} />
    </div>
  );
};

export default ChannelTalkCounter;
