import { useState, useEffect, useCallback } from "react";
import SendbirdChat, { ConnectionHandler } from "@sendbird/chat";
import { GroupChannelModule } from "@sendbird/chat/groupChannel";

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
    async (sendbird: any, userId: string, retryCount = 0) => {
      try {
        console.log(`연결 시도 ${retryCount + 1}회...`);
        console.log("연결 시도 - SendbirdChat 인스턴스:", sendbird);
        console.log("연결 시도 - 사용자 ID:", userId);
        console.log("연결 시도 - APP_ID:", APP_ID);

        // 이미 연결되어 있으면 재연결하지 않음
        if (sendbird.currentUser && sendbird.connectionState === "OPEN") {
          console.log("이미 연결되어 있습니다. 재연결하지 않습니다.");
          console.log("기존 연결 사용자:", sendbird.currentUser.userId);
          setUser(sendbird.currentUser);
          setIsConnected(true);
          setConnectionError("");
          setIsConnecting(false);
          return;
        }

        const u = await sendbird.connect(userId);
        console.log("✅ Sendbird v4 연결 성공:", u);
        setUser(u);
        setIsConnected(true);
        setConnectionError("");
        setIsConnecting(false);
      } catch (error: any) {
        console.error("Sendbird v4 연결 실패:", error);
        const delay = Math.min((retryCount + 1) * 3000, 15000);
        setConnectionError(`연결 에러 발생. 재시도 중... (${retryCount + 1}회차)`);
        setTimeout(() => {
          attemptConnection(sendbird, userId, retryCount + 1);
        }, delay);
      }
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

    let isUnmounted = false;
    // Sendbird v4 초기화
    const init = async () => {
      const sendbird = await SendbirdChat.init({ appId: APP_ID, modules: [new GroupChannelModule()] });
      if (isUnmounted) return;
      console.log("Sendbird v4 인스턴스 생성:", sendbird);
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
      }, 30000);

      // 첫 번째 연결 시도
      attemptConnection(sendbird, userId);

      // 연결 상태 변화 감지 핸들러 추가 (v4)
      const handlerId = "connection_handler";
      const connectionHandler = new ConnectionHandler();

      connectionHandler.onReconnectStarted = () => {
        console.log("=== 재연결 시작됨 ===");
        setConnectionError("재연결 중입니다...");
      };

      connectionHandler.onReconnectSucceeded = () => {
        console.log("=== 재연결 성공됨 ===");
        setConnectionError("");
        if (sendbird.currentUser) {
          setUser(sendbird.currentUser);
        }
      };

      connectionHandler.onReconnectFailed = () => {
        console.log("=== 재연결 실패됨 ===");
        setConnectionError("재연결에 실패했습니다. 자동 재시도를 시작합니다.");
        setTimeout(() => {
          autoReconnect(sendbird, userId);
        }, 3000);
      };

      sendbird.addConnectionHandler(handlerId, connectionHandler);

      return () => {
        clearTimeout(connectionTimeout);
        if (sendbird) {
          console.log("컴포넌트 언마운트: Sendbird v4 연결 해제");
          sendbird.removeConnectionHandler(handlerId);
          sendbird.disconnect();
        }
      };
    };

    init();

    return () => {
      isUnmounted = true;
    };
  }, [channelId, urlUserId, attemptConnection, autoReconnect]);

  // 연결 상태 변화 감지
  useEffect(() => {
    if (user && isConnected && channelId) {
      console.log("=== 연결 완료 ===", { userId: user.userId, channelId });
      setConnectionError("");
    }
  }, [user?.userId, isConnected, channelId]);

  // 연결 상태 모니터링 (더 적극적)
  useEffect(() => {
    // v4에서는 연결 상태 문자열이 달라졌으므로 심화 모니터링은 생략
  }, [sb]);

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
