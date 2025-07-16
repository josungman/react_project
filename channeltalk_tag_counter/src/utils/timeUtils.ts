// 시간 포맷팅 유틸리티 함수들

export const formatTime = {
  // 전체 날짜와 시간 (YYYY-MM-DD HH:mm:ss)
  fullDateTime: (date: Date): string => {
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  },

  // 시간만 (HH:mm:ss)
  timeOnly: (date: Date): string => {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  },

  // 날짜만 (YY-MM-DD)
  dateOnly: (date: Date): string => {
    return date.toLocaleDateString("ko-KR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    });
  },

  // 상대적 시간 (예: "3분 전", "1시간 전")
  relative: (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

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
