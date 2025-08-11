import { useState, useEffect, useCallback } from "react";
import SendBird from "sendbird";

const APP_ID = import.meta.env.VITE_SENDBIRD_APP_ID;

interface UseSendbirdConnectionProps {
  channelId?: string;
  urlUserId?: string;
}

export const useSendbirdConnection = ({ channelId, urlUserId }: UseSendbirdConnectionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [sb, setSb] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string>("");

  // 연결 시도 함수
  const attemptConnection = useCallback(
    (sendbird: any, userId: string, retryCount = 0) => {
      console.log(`연결 시도 ${retryCount + 1}회...`);
      console.log("연결 시도 - SendBird 인스턴스:", sendbird);
      console.log("연결 시도 - 사용자 ID:", userId);
      console.log("연결 시도 - APP_ID:", APP_ID);

      // 이미 연결되어 있으면 재연결하지 않음
      if (sendbird.currentUser && sendbird.currentUser.connectionStatus === "open") {
        console.log("이미 연결되어 있습니다. 재연결하지 않습니다.");
        console.log("기존 연결 사용자:", sendbird.currentUser.userId);
        setUser(sendbird.currentUser);
        setIsConnected(true);
        setConnectionError("");
        setIsConnecting(false);
        return;
      }

      sendbird.connect(userId, (user: any, error: any) => {
        if (error) {
          console.error("SendBird 연결 실패:", error);
          console.error("에러 상세:", error.message, error.code);

          // 모든 연결 관련 에러에 대해 재시도 (무제한)
          const retryableErrors = [800101, 800102, 800103, 800104, 800105, 800106, 800107, 800108, 800109, 800110];
          if (retryableErrors.includes(error.code)) {
            const delay = Math.min((retryCount + 1) * 3000, 15000); // 최대 15초까지 증가
            console.log(`연결 에러 (${error.code}) 발생. ${delay / 1000}초 후 재시도합니다... (${retryCount + 1}회차)`);
            setConnectionError(`연결 에러 발생. 재시도 중... (${retryCount + 1}회차)`);
            setTimeout(() => {
              // 연결 상태와 관계없이 재시도
              attemptConnection(sendbird, userId, retryCount + 1);
            }, delay);
          } else {
            setConnectionError(`연결 실패: ${error.message} (코드: ${error.code})`);
            setIsConnecting(false);
          }
          return;
        }

        console.log("✅ SendBird 연결 성공:", user);
        console.log("연결된 사용자 상태:", user.connectionStatus);
        setUser(user); // 상태 저장용
        setIsConnected(true);
        setConnectionError("");
        setIsConnecting(false);

        // 연결 성공 시 채널 입장은 외부에서 처리
        console.log("연결 성공 - 채널 입장은 외부에서 처리");
        console.log("사용자 연결 상태 확인:", {
          userId: user.userId,
          connectionStatus: user.connectionStatus,
          isConnected: true,
        });

        // 연결 후 상태가 'nonavailable'이면 간단한 대기
        if (user.connectionStatus === "nonavailable") {
          console.log("연결 성공했지만 상태가 'nonavailable'입니다. 3초 대기합니다.");

          // 단순한 3초 대기 후 상태 확인
          setTimeout(() => {
            if (sendbird.currentUser) {
              console.log("3초 후 연결 상태:", sendbird.currentUser.connectionStatus);
              setUser(sendbird.currentUser);

              if (sendbird.currentUser.connectionStatus === "open") {
                console.log("✅ 연결 상태가 'open'으로 변경되었습니다!");
              } else {
                console.log("연결 상태가 여전히 불안정합니다. 그대로 진행합니다.");
                // 상태와 관계없이 사용자 정보는 업데이트
              }
            }
          }, 3000);
        }
      });
    },
    [channelId]
  );

  // 자동 재연결 함수
  const autoReconnect = useCallback(
    (sendbird: any, userId: string) => {
      console.log("자동 재연결 시도...");
      // 연결 중이어도 재시도 허용 (강제 재연결)
      setIsConnecting(true);
      setConnectionError("자동 재연결 중...");
      attemptConnection(sendbird, userId, 0);
    },
    [attemptConnection]
  );

  // 메인 연결 useEffect
  useEffect(() => {
    console.log("SendBird 초기화 시작...");
    console.log("사용할 APP_ID:", APP_ID);
    console.log("URL 채널 ID:", channelId);
    console.log("URL 사용자 ID:", urlUserId);

    // 연결 중이어도 새로운 연결 시도 허용 (재연결 상황 고려)
    setIsConnecting(true);
    setConnectionError("");

    // SendBird 초기화
    const sendbird = new SendBird({ appId: APP_ID });
    console.log("SendBird 인스턴스 생성:", sendbird);
    console.log("APP_ID 확인:", APP_ID);
    console.log("SendBird 인스턴스 타입:", typeof sendbird);
    console.log("SendBird 인스턴스 속성:", Object.keys(sendbird));
    setSb(sendbird);

    // URL에서 사용자 ID를 가져오거나 기본값 사용
    const userId = urlUserId || `user_${Date.now()}`;
    console.log("연결 시도 중... 사용자 ID:", userId);

    // 연결 타임아웃 설정 (더 긴 시간)
    const connectionTimeout = setTimeout(() => {
      if (!isConnected) {
        console.error("연결 타임아웃");
        setConnectionError("연결 시간이 초과되었습니다. 자동 재시도를 시작합니다.");
        // 타임아웃 시에도 자동 재시도
        setTimeout(() => {
          autoReconnect(sendbird, userId);
        }, 2000);
      }
    }, 30000); // 30초로 증가

    // 첫 번째 연결 시도
    attemptConnection(sendbird, userId);

    // 연결 상태 변화 감지 핸들러 추가
    const connectionHandler = new sendbird.ConnectionHandler();

    connectionHandler.onReconnectStarted = () => {
      console.log("=== 재연결 시작됨 ===");
      setConnectionError("재연결 중입니다...");
    };

    connectionHandler.onReconnectSucceeded = () => {
      console.log("=== 재연결 성공됨 ===");
      setConnectionError("");
      // 재연결 후 사용자 상태 확인
      if (sendbird.currentUser) {
        console.log("재연결 후 사용자 상태:", sendbird.currentUser.connectionStatus);
        setUser(sendbird.currentUser);

        // 재연결 후에도 nonavailable이면 추가 확인
        if (sendbird.currentUser.connectionStatus === "nonavailable") {
          console.log("재연결 후에도 'nonavailable' 상태입니다. 추가 확인을 시작합니다.");
          setTimeout(() => {
            if (sendbird.currentUser) {
              console.log("재연결 후 2초 확인:", sendbird.currentUser.connectionStatus);
              setUser(sendbird.currentUser);
            }
          }, 2000);
        }
      }
    };

    connectionHandler.onReconnectFailed = () => {
      console.log("=== 재연결 실패됨 ===");
      setConnectionError("재연결에 실패했습니다. 자동 재시도를 시작합니다.");
      setTimeout(() => {
        autoReconnect(sendbird, userId);
      }, 3000);
    };

    // 연결 핸들러 등록
    sendbird.addConnectionHandler("connection_handler", connectionHandler);

    return () => {
      clearTimeout(connectionTimeout);
      if (sendbird) {
        console.log("컴포넌트 언마운트: SendBird 연결 해제");
        sendbird.removeConnectionHandler("connection_handler");
        sendbird.disconnect();
      }
    };
  }, [channelId, urlUserId, attemptConnection, autoReconnect]);

  // 연결 상태 변화 감지
  useEffect(() => {
    if (user && user.connectionStatus === "open" && isConnected && channelId) {
      console.log("=== 연결 상태가 'open'으로 변경됨 ===");
      console.log("사용자:", user.userId);
      console.log("연결 상태:", user.connectionStatus);
      console.log("채널 ID:", channelId);

      setConnectionError(""); // 에러 메시지 클리어
      // 채널 입장은 외부에서 처리
    } else if (user && user.connectionStatus === "nonavailable") {
      console.log("연결 상태가 'nonavailable'입니다. 대기 중...");
      console.log("사용자 ID:", user.userId);
      console.log("연결 상태:", user.connectionStatus);
    } else if (user && user.connectionStatus) {
      console.log("연결 상태 변화 감지:", user.connectionStatus);
      console.log("사용자 ID:", user.userId);
    }
  }, [user?.connectionStatus, isConnected, channelId]);

  // 연결 상태 모니터링 (더 적극적)
  useEffect(() => {
    if (user && user.connectionStatus === "nonavailable" && sb) {
      console.log("연결 상태 모니터링 시작...");

      // 3초 후 상태 확인 (더 빠른 응답)
      const statusCheckTimer = setTimeout(() => {
        if (sb.currentUser) {
          console.log("3초 후 연결 상태 확인:", sb.currentUser.connectionStatus);
          setUser(sb.currentUser);

          if (sb.currentUser.connectionStatus === "open") {
            console.log("✅ 연결 상태가 'open'으로 변경되었습니다!");
            setConnectionError("");
          } else {
            console.log("연결 상태가 여전히 불안정합니다. 즉시 자동 재연결을 시도합니다.");
            // nonavailable 상태가 지속되면 즉시 자동 재연결 시도
            const userId = urlUserId || `user_${Date.now()}`;
            autoReconnect(sb, userId);
          }
        }
      }, 3000);

      return () => {
        clearTimeout(statusCheckTimer);
      };
    }
  }, [user?.connectionStatus, sb, autoReconnect, urlUserId]);

  const retryConnection = useCallback(() => {
    setConnectionError("");
    setIsConnected(false);
    setUser(null);
    // useEffect가 다시 실행되도록 강제로 상태 변경
    window.location.reload();
  }, []);

  return {
    isConnected,
    sb,
    user,
    isConnecting,
    connectionError,
    retryConnection,
  };
};
