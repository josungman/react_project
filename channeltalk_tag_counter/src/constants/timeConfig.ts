// 시간 관련 설정 상수
export const TIME_CONFIG = {
  // API 호출 간격 (밀리초)
  API_INTERVAL: 10000, // 10초

  // 카운트다운 초기값 (초)
  COUNTDOWN_INITIAL: 10 as number, // 타입 명시

  // 프로그레스바 업데이트 간격 (밀리초)
  PROGRESS_UPDATE_INTERVAL: 1000, // 1초

  // 애니메이션 지속시간 (밀리초)
  ANIMATION_DURATION: 1000,
} as const;

// 시간 포맷팅 함수들
export const formatTime = {
  // 년도를 2자리로 변환
  year: (date: Date) => date.getFullYear().toString().slice(-2),

  // 월을 2자리로 변환
  month: (date: Date) => (date.getMonth() + 1).toString().padStart(2, "0"),

  // 일을 2자리로 변환
  day: (date: Date) => date.getDate().toString().padStart(2, "0"),

  // 시간을 문자열로 변환
  time: (date: Date) => date.toLocaleTimeString(),

  // 전체 날짜 시간 포맷
  fullDateTime: (date: Date) => `${formatTime.year(date)}. ${formatTime.month(date)}. ${formatTime.day(date)}. ${formatTime.time(date)}`,
};
