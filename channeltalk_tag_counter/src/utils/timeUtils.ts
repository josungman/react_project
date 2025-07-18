// 시간 포맷팅 유틸리티 함수들
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Day.js 플러그인 설정
dayjs.extend(utc);
dayjs.extend(timezone);

export const formatTime = {
  // 전체 날짜와 시간 (YYYY-MM-DD HH:mm:ss) - 한국 시간대 기준
  fullDateTime: (date: Date): string => {
    return dayjs(date).tz("Asia/Seoul").format("YYYY-MM-DD HH:mm:ss");
  },

  // 시간만 (HH:mm:ss) - 한국 시간대 기준
  timeOnly: (date: Date): string => {
    return dayjs(date).tz("Asia/Seoul").format("HH:mm:ss");
  },

  // 날짜만 (YY-MM-DD) - 한국 시간대 기준
  dateOnly: (date: Date): string => {
    return dayjs(date).tz("Asia/Seoul").format("YY-MM-DD");
  },

  // 상대적 시간 (예: "3분 전", "1시간 전") - 한국 시간대 기준
  relative: (date: Date): string => {
    const now = dayjs().tz("Asia/Seoul");
    const targetDate = dayjs(date).tz("Asia/Seoul");
    const diffInSeconds = now.diff(targetDate, "second");

    if (diffInSeconds < 60) {
      return `${diffInSeconds}초 전`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}분 전`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}시간 전`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}일 전`;
    }
  },
};
