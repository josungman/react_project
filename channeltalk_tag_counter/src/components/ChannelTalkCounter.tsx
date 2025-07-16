import React, { useState, useEffect, useCallback } from "react";
import NavigationHeader from "@/components/common/NavigationHeader";
import { fetchTagCounts } from "../services/api";
import { formatTime } from "../utils/timeUtils";
import BarChart from "./BarChart";

interface TagCount {
  tag: string;
  count: number;
}

// 시간 설정 상수
const TIME_CONFIG = {
  COUNTDOWN_INITIAL: 10, //초
  PROGRESS_UPDATE_INTERVAL: 1000, // 1초
  ANIMATION_DURATION: 1000,
};

const ChannelTalkCounter: React.FC = () => {
  const [tagCounts, setTagCounts] = useState<TagCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [countdown, setCountdown] = useState<number>(TIME_CONFIG.COUNTDOWN_INITIAL);

  // 데이터 가져오기 함수
  const fetchData = useCallback(async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <NavigationHeader title="채널톡 태그 카운터 / 대시보드" />

      <div className="max-w-6xl mx-auto mt-8">
        {/* 컨트롤 패널 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{formatTime.dateOnly(new Date())} 전체 통계</h2>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm w-full">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="font-medium text-blue-800">총 태그 수</div>
              <div className="text-2xl font-bold text-blue-600">{tagCounts.length}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="font-medium text-green-800">총 카운트</div>
              <div className="text-2xl font-bold text-green-600">{tagCounts.reduce((sum, tag) => sum + tag.count, 0)}</div>
            </div>
          </div>
        </div>

        {/* 태그 통계 카드 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">태그 통계</h2>

          {tagCounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">아직 태그가 없습니다. 테스트 메시지를 추가해보세요!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tagCounts.map((tagCount, index) => {
                const isFirst = index === 0;
                return (
                  <div
                    key={tagCount.tag}
                    className={`p-4 rounded-lg border transition-all duration-300 ${
                      isFirst ? "bg-gradient-to-r from-red-50 to-pink-50 border-red-200" : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">{tagCount.tag}</span>
                      <span className={`text-sm ${isFirst ? "text-red-500" : "text-gray-500"}`}>#{index + 1}</span>
                    </div>
                    <div className={`text-3xl font-bold mb-2 ${isFirst ? "text-red-600" : "text-blue-600"}`}>{tagCount.count}</div>
                    <div className={`w-full rounded-full h-2 ${isFirst ? "bg-red-200" : "bg-blue-200"}`}>
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${isFirst ? "bg-red-600" : "bg-blue-600"}`}
                        style={{
                          width: `${(tagCount.count / Math.max(...tagCounts.map((t) => t.count))) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BarChart 컴포넌트 */}
        <BarChart data={tagCounts} />
      </div>
    </div>
  );
};

export default ChannelTalkCounter;
