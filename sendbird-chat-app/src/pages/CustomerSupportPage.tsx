import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useSendbirdConnection } from "../hooks/useSendbirdConnection";
import { useSendbirdChannel } from "../hooks/useSendbirdChannel";
import { SendBirdProvider, Channel } from "@sendbird/uikit-react";
import "@sendbird/uikit-react/dist/index.css";

const APP_ID = import.meta.env.VITE_SENDBIRD_APP_ID;

export default function CustomerSupportPage() {
  const { channelId } = useParams();
  const [searchParams] = useSearchParams();
  const urlUserId = searchParams.get("user");
  const userType = searchParams.get("type"); // "customer" 또는 "agent"
  const navigate = useNavigate();

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

  // 채널 관련 훅
  const { enterChannelByUrl } = useSendbirdChannel({
    sb: null,
    user: null,
    setConnectionError: () => {},
    setChannel,
    setIsChannelReady,
  });

  // 연결 관련 훅
  const { isConnected, sb, user, isConnecting, connectionError, retryConnection } = useSendbirdConnection({
    channelId,
    urlUserId: urlUserId || undefined,
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
        // 간단히 종료 안내 메시지 전송 후 나가기
        await new Promise((resolve) => {
          if (channel?.sendUserMessage) {
            channel.sendUserMessage("상담이 종료되었습니다.", () => resolve(null));
          } else {
            resolve(null);
          }
        });

        if (channel?.leave) {
          channel.leave((_: any, __: any) => {});
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
        channel.leave((_: any, error: any) => {
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

      {/* UIKit 메시지 영역 */}
      <div className="flex-1 min-h-0">
        {APP_ID && isConnected && isChannelReady && (channel?.url || channelId) ? (
          <SendBirdProvider appId={APP_ID as string} sdkInstance={(sb as any) || null} userId={user!.userId} key={user!.userId}>
            <Channel
              channelUrl={(channel?.url as string) || (channelId as string)}
              key={(channel?.url as string) || (channelId as string)}
              isTypingIndicatorEnabled
              isMessageReceiptStatusEnabled
              isReactionEnabled
            />
          </SendBirdProvider>
        ) : (
          <div className="p-6 text-center text-gray-500">
            {(!APP_ID && "APP_ID가 설정되지 않았습니다.") ||
              (!isConnected && "연결 중 또는 실패") ||
              (!isChannelReady && channelId && "채널 준비 중...") ||
              (!channelId && "채널 ID가 없습니다.")}
          </div>
        )}
      </div>
    </div>
  );
}
