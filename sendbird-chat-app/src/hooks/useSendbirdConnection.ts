import { useState, useEffect, useCallback } from "react";
import SendBird from "sendbird";

const APP_ID = import.meta.env.VITE_SENDBIRD_APP_ID;

interface UseSendbirdConnectionProps {
  channelId?: string;
  urlUserId?: string;
}

/**
 * useSendbirdConnection
 * - SendBird v3 SDK 초기화 및 사용자 연결/재연결을 관리합니다.
 * - 연결 상태, 에러 메시지, 재시도 함수를 제공합니다.
 */
export const useSendbirdConnection = ({ channelId, urlUserId }: UseSendbirdConnectionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [sb, setSb] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string>("");

  /**
   * 연결 시도 함수
   * - 사용자 ID로 SendBird 연결을 시도하고, 실패 시 지수적 지연으로 재시도합니다.
   */
  const attemptConnection = useCallback(
    (sendbird: any, userId: string, retryCount = 0) => {
      try {
        console.log(`연결 시도 ${retryCount + 1}회...`);
        console.log("연결 시도 - SendBird v3 인스턴스:", !!sendbird);
        console.log("연결 시도 - 사용자 ID:", userId);
        console.log("연결 시도 - APP_ID:", APP_ID);

        if (sendbird.currentUser && sendbird.currentUser.userId) {
          console.log("이미 연결되어 있습니다.", sendbird.currentUser.userId);
          setUser(sendbird.currentUser);
          setIsConnected(true);
          setConnectionError("");
          setIsConnecting(false);
          return;
        }

        sendbird.connect(userId, (u: any, err: any) => {
          if (err) {
            console.error("SendBird v3 연결 실패:", err);
            const delay = Math.min((retryCount + 1) * 3000, 15000);
            setConnectionError(`연결 에러 발생. 재시도 중... (${retryCount + 1}회차)`);
            setTimeout(() => attemptConnection(sendbird, userId, retryCount + 1), delay);
            return;
          }
          console.log("✅ SendBird v3 연결 성공:", u?.userId);
          setUser(u);
          setIsConnected(true);
          setConnectionError("");
          setIsConnecting(false);
        });
      } catch (e) {
        console.error(e);
        setConnectionError("연결 실패");
        setIsConnecting(false);
      }
    },
    [channelId]
  );

  /**
   * 자동 재연결 함수
   * - 연결 이벤트 핸들러에서 호출되어 강제로 재연결을 시도합니다.
   */
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

  /**
   * 메인 연결 useEffect
   * - SDK 초기화, 최초 연결 시도, 연결 핸들러 등록/해제를 수행합니다.
   */
  useEffect(() => {
    console.log("SendBird 초기화 시작...");
    console.log("사용할 APP_ID:", APP_ID);
    console.log("URL 채널 ID:", channelId);
    console.log("URL 사용자 ID:", urlUserId);

    // 연결 중이어도 새로운 연결 시도 허용 (재연결 상황 고려)
    setIsConnecting(true);
    setConnectionError("");

    // SendBird v3 초기화
    const sendbird = new SendBird({ appId: APP_ID });
    setSb(sendbird);

    const userId = urlUserId || `user_${Date.now()}`;
    const connectionTimeout = setTimeout(() => {
      if (!isConnected) {
        setConnectionError("연결 시간이 초과되었습니다. 자동 재시도를 시작합니다.");
        setTimeout(() => autoReconnect(sendbird, userId), 2000);
      }
    }, 30000);

    attemptConnection(sendbird, userId);

    const connectionHandler = new sendbird.ConnectionHandler();
    connectionHandler.onReconnectStarted = () => setConnectionError("재연결 중입니다...");
    connectionHandler.onReconnectSucceeded = () => {
      setConnectionError("");
      if (sendbird.currentUser) setUser(sendbird.currentUser);
    };
    connectionHandler.onReconnectFailed = () => {
      setConnectionError("재연결 실패. 자동 재시도");
      setTimeout(() => autoReconnect(sendbird, userId), 3000);
    };
    sendbird.addConnectionHandler("connection_handler", connectionHandler);

    return () => {
      clearTimeout(connectionTimeout);
      try {
        sendbird.removeConnectionHandler("connection_handler");
        sendbird.disconnect();
      } catch {}
    };
  }, [channelId, urlUserId, attemptConnection, autoReconnect]);

  /** 연결 상태 변화 감지 */
  useEffect(() => {
    if (user && isConnected && channelId) {
      console.log("=== 연결 완료 ===", { userId: user.userId, channelId });
      setConnectionError("");
    }
  }, [user?.userId, isConnected, channelId]);

  /** 연결 상태 모니터링 (확장용 placeholder) */
  useEffect(() => {}, [sb]);

  /** 수동 재연결(페이지 리로드) 트리거 함수 */
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
