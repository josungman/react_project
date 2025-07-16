import { useState, useEffect } from "react";

interface UseCountdownProps {
  initialTime: number; // 초기 시간 (초)
  onComplete?: () => void; // 카운트다운 완료 시 콜백
}

export const useCountdown = ({ initialTime, onComplete }: UseCountdownProps) => {
  const [countdown, setCountdown] = useState(initialTime);

  // 카운트다운 리셋 함수
  const resetCountdown = () => {
    setCountdown(initialTime);
  };

  // 카운트다운 타이머 (1초마다)
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onComplete?.(); // 완료 콜백 호출
          return initialTime; // 초기값으로 리셋
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [initialTime, onComplete]);

  return {
    countdown,
    resetCountdown,
    progress: ((initialTime - countdown) / initialTime) * 100, // 진행률 (0-100)
  };
};
