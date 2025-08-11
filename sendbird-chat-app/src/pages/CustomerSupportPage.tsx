import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useSendbirdConnection } from "../hooks/useSendbirdConnection";
import { useSendbirdChannel } from "../hooks/useSendbirdChannel";
import { useSendbirdMessages } from "../hooks/useSendbirdMessages";

const APP_ID = import.meta.env.VITE_SENDBIRD_APP_ID;

export default function CustomerSupportPage() {
  const { channelId } = useParams();
  const [searchParams] = useSearchParams();
  const urlUserId = searchParams.get("user");
  const userType = searchParams.get("type"); // "customer" 또는 "agent"
  const navigate = useNavigate();
  const location = useLocation();

  // APP_ID 확인 및 에러 처리
  if (!APP_ID) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">설정 오류</h1>
          <p className="text-gray-700 mb-4">Sendbird APP_ID가 설정되지 않았습니다.</p>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-2">해결 방법:</h3>
            <ol className="text-sm text-yellow-700 space-y-1">
              <li>
                1. 프로젝트 루트에 <code>.env</code> 파일 생성
              </li>
              <li>
                2. <code>VITE_SENDBIRD_APP_ID=your_app_id_here</code> 추가
              </li>
              <li>3. Sendbird 대시보드에서 애플리케이션 활성화</li>
              <li>4. 개발 서버 재시작</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const [channel, setChannel] = useState<any>(null);
  const [isChannelReady, setIsChannelReady] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // 메시지 관련 훅
  const { messages, newMessage, setNewMessage, currentHandlerId, setupChannelHandler, sendMessage, handleKeyPress } = useSendbirdMessages({
    sb: null,
    user: null,
    channel,
    isChannelReady,
  });

  // 채널 관련 훅
  const { enterChannelByUrl, enterChannel } = useSendbirdChannel({
    sb: null,
    user: null,
    setConnectionError: () => {},
    setChannel,
    setIsChannelReady,
    setupChannelHandler,
  });

  // 연결 관련 훅
  const { isConnected, sb, user, isConnecting, connectionError, retryConnection } = useSendbirdConnection({
    channelId,
    urlUserId: urlUserId || undefined,
    enterChannelByUrl,
  });

  // 사용자가 준비되면 채널 입장 시도
  useEffect(() => {
    if (user && isConnected && channelId && !isChannelReady && sb) {
      console.log("=== 사용자 준비됨, 채널 입장 시도 ===");
      console.log("사용자:", user.userId);
      console.log("채널 ID:", channelId);
      console.log("사용자 타입:", userType);

      enterChannelByUrl(channelId, user);
    }
  }, [user, isConnected, channelId, isChannelReady, sb, enterChannelByUrl, userType]);

  // 상담방 닫기 함수
  const closeSupportChat = async () => {
    if (!channel || !user) {
      alert("채널이나 사용자 정보가 없습니다.");
      return;
    }

    setIsClosing(true);

    try {
      // 상담사만 채널을 닫을 수 있음
      if (userType === "agent") {
        // 채널 상태를 "closed"로 변경하는 메시지 전송
        const closeMessage = {
          message: "상담이 종료되었습니다.",
          data: JSON.stringify({ action: "close_support", timestamp: Date.now() }),
        };

        await sendMessage(user, closeMessage);

        // 채널에서 나가기
        if (channel.leave) {
          channel.leave((response: any, error: any) => {
            if (error) {
              console.error("채널 나가기 실패:", error);
            } else {
              console.log("채널 나가기 성공");
            }
          });
        }

        alert("상담이 종료되었습니다.");
        navigate("/support/list");
      } else {
        alert("고객은 상담방을 닫을 수 없습니다.");
      }
    } catch (error) {
      console.error("상담방 닫기 실패:", error);
      alert("상담방 닫기에 실패했습니다.");
    } finally {
      setIsClosing(false);
    }
  };

  // 상담방 나가기 함수 (고객용)
  const leaveSupportChat = async () => {
    if (!channel || !user) {
      alert("채널이나 사용자 정보가 없습니다.");
      return;
    }

    setIsClosing(true);

    try {
      // 채널에서 나가기
      if (channel.leave) {
        channel.leave((response: any, error: any) => {
          if (error) {
            console.error("채널 나가기 실패:", error);
          } else {
            console.log("채널 나가기 성공");
          }
        });
      }

      alert("상담방을 나갑니다.");
      navigate("/support/list");
    } catch (error) {
      console.error("상담방 나가기 실패:", error);
      alert("상담방 나가기에 실패했습니다.");
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-800">{userType === "agent" ? "상담사 대화방" : "고객 상담방"}</h1>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${userType === "agent" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
              {userType === "agent" ? "상담사" : "고객"}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500" : "bg-red-500"}`}></div>
            <span className="text-sm text-gray-600">{isConnected ? `연결됨 (${user?.userId})` : isConnecting ? "연결 중..." : "연결 실패"}</span>

            {/* 상담사는 상담방 닫기, 고객은 나가기 버튼 */}
            {userType === "agent" ? (
              <button
                onClick={closeSupportChat}
                disabled={isClosing || !isChannelReady}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-2 rounded text-sm font-medium"
              >
                {isClosing ? "종료 중..." : "상담 종료"}
              </button>
            ) : (
              <button
                onClick={leaveSupportChat}
                disabled={isClosing || !isChannelReady}
                className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-4 py-2 rounded text-sm font-medium"
              >
                {isClosing ? "나가는 중..." : "상담방 나가기"}
              </button>
            )}
          </div>
        </div>

        {/* 연결 에러 표시 */}
        {connectionError && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-red-700">
                <strong>연결 오류:</strong> {connectionError}
              </div>
              <button onClick={retryConnection} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs">
                재시도
              </button>
            </div>
          </div>
        )}

        {/* 상담방 정보 */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-700">
            <p>
              <strong>상담방 ID:</strong> {channelId}
            </p>
            <p>
              <strong>사용자:</strong> {user?.userId}
            </p>
            <p>
              <strong>역할:</strong> {userType === "agent" ? "상담사" : "고객"}
            </p>
          </div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg">상담을 시작해보세요!</p>
            <p className="text-sm text-gray-400 mt-2">실시간 상담이 가능합니다.</p>
            <p className="text-xs text-gray-400 mt-1">상담방: {channelId}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.messageId} className={`flex ${msg.sender?.userId === user?.userId ? "justify-end" : "justify-start"}`}>
              <div
                className={`rounded-lg px-4 py-2 max-w-xs lg:max-w-md ${
                  msg.sender?.userId === user?.userId ? "bg-blue-500 text-white" : "bg-white text-gray-800 border border-gray-200"
                }`}
              >
                <div className="text-sm font-medium mb-1">{msg.sender?.userId === user?.userId ? "나" : msg.sender?.nickname || msg.sender?.userId}</div>
                <div className="text-sm">{msg.message}</div>
                <div className="text-xs opacity-75 mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 메시지 입력 영역 */}
      <div className="bg-white border-t px-6 py-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isChannelReady ? "메시지를 입력하세요..." : "채널 준비 중..."}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!isConnected || !isChannelReady}
          />
          <button
            onClick={() => sendMessage(user)}
            disabled={!newMessage.trim() || !isConnected || !isChannelReady}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            전송
          </button>
        </div>
        {!isConnected && !isConnecting && <p className="text-sm text-red-500 mt-2">연결에 실패했습니다. 재시도 버튼을 클릭해주세요.</p>}
        {isConnecting && <p className="text-sm text-yellow-500 mt-2">연결 중... 잠시만 기다려주세요.</p>}
        {isConnected && !isChannelReady && <p className="text-sm text-blue-500 mt-2">상담방에 입장 중입니다... 잠시만 기다려주세요.</p>}
        {isConnected && isChannelReady && <p className="text-sm text-green-600 mt-2">✅ 실시간 상담이 가능합니다!</p>}
      </div>
    </div>
  );
}
