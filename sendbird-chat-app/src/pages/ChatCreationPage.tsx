import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { generateChatUrls } from "../utils/sendbirdUtils";
import SendBird from "sendbird";

// 환경변수에서 APP_ID 가져오기
const APP_ID = import.meta.env.VITE_SENDBIRD_APP_ID;

export default function ChatCreationPage() {
  const navigate = useNavigate();
  const [chatUrls, setChatUrls] = useState<any>(null);
  const [showChatUrls, setShowChatUrls] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<string>("");

  // APP_ID 확인
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

  // Sendbird 채널 생성 및 사용자 연결 함수
  const createChannelAndConnectUsers = useCallback(async (user1Id: string, user2Id: string, channelUrl: string) => {
    setIsCreating(true);
    setCreationError("");

    try {
      // Sendbird 초기화
      const sb = new SendBird({ appId: APP_ID });

      // 첫 번째 사용자 연결
      console.log("첫 번째 사용자 연결 중:", user1Id);
      await new Promise((resolve, reject) => {
        sb.connect(user1Id, (user: any, error: any) => {
          if (error) {
            console.error("첫 번째 사용자 연결 실패:", error);
            reject(error);
            return;
          }
          console.log("첫 번째 사용자 연결 성공:", user);
          resolve(user);
        });
      });

      // 두 번째 사용자도 먼저 연결 (실패 시 최소 정보로 대체)
      console.log("두 번째 사용자 연결 중:", user2Id);
      const user2 = await new Promise((resolve) => {
        const sb2 = new SendBird({ appId: APP_ID });
        sb2.connect(user2Id, (user: any, error: any) => {
          if (error) {
            console.error("두 번째 사용자 연결 실패:", error);
            // 실패 시에도 user2는 최소 식별 정보로 채워서 null/undefined 방지
            resolve({ userId: user2Id, connectionStatus: "unknown" });
            return;
          }
          console.log("두 번째 사용자 연결 성공:", user);
          resolve(user);
        });
      });

      // 채널 생성 (두 사용자 모두 연결된 후)
      console.log("채널 생성 중:", channelUrl);
      const channel = await new Promise((resolve, reject) => {
        const params = new sb.GroupChannelParams();
        params.channelUrl = channelUrl;
        params.name = `채팅방 ${user1Id} & ${user2Id}`;
        params.addUserIds([user1Id, user2Id]);
        params.isDistinct = true;

        sb.GroupChannel.createChannel(params, (channel: any, error: any) => {
          if (error) {
            console.error("채널 생성 실패:", error);
            reject(error);
            return;
          }
          console.log("채널 생성 성공:", channel);
          console.log("=== ChatCreationPage 채널 상세 정보 ===");
          console.log("채널 URL:", channel.url);
          console.log("채널 이름:", channel.name);
          console.log("채널 타입:", channel.channelType);
          console.log("채널 생성자:", channel.creator?.userId);
          console.log("채널 초대자:", channel.inviter?.userId);
          console.log("총 멤버 수:", channel.memberCount);
          console.log("참여 멤버 수:", channel.joinedMemberCount);
          console.log(
            "채널 멤버 목록:",
            channel.members?.map((m: any) => m.userId)
          );
          console.log(
            "채널 멤버 상세:",
            channel.members?.map((m: any) => ({
              userId: m.userId,
              nickname: m.nickname,
              profileUrl: m.profileUrl,
              connectionStatus: m.connectionStatus,
            }))
          );
          console.log("=== ChatCreationPage 채널 정보 끝 ===");
          resolve(channel);
        });
      });

      // 두 사용자가 모두 연결되었으므로 채널 생성 완료
      console.log("두 사용자 모두 연결 완료!");
      console.log("user1 연결 상태:", user1Id);
      console.log("user2 연결 상태:", (user2 as any)?.connectionStatus || "unknown");

      // 생성된 채널을 로컬 스토리지에 저장
      const channelInfo = {
        id: channelUrl,
        channelUrl,
        user1Id,
        user2Id,
        createdAt: new Date().toISOString(),
        status: "active",
        type: "chat",
      };

      // 기존 채널 목록 불러오기
      const existingChannels = JSON.parse(localStorage.getItem("chatChannels") || "[]");
      const updatedChannels = [...existingChannels, channelInfo];
      localStorage.setItem("chatChannels", JSON.stringify(updatedChannels));

      console.log("채널 생성 및 사용자 연결 완료!");
      return channel;
    } catch (error: any) {
      console.error("채널 생성 중 오류:", error);

      // Sendbird 애플리케이션 비활성화 에러 처리
      if (error.message && error.message.includes("disabled")) {
        setCreationError("Sendbird 애플리케이션이 비활성화되어 있습니다. 대시보드에서 활성화해주세요.");
      } else {
        setCreationError(`채널 생성 실패: ${error.message}`);
      }
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const createNewChat = useCallback(async () => {
    try {
      // 먼저 generateChatUrls 함수를 사용하여 사용자 ID와 URL 생성
      const urls = generateChatUrls(`user_${Date.now()}`);

      // 생성된 사용자 ID를 사용하여 채널 생성
      const user1Id = urls.user1Id;
      const user2Id = urls.user2Id;
      const channelUrl = urls.channelUrl;

      console.log("생성된 사용자 ID:", { user1Id, user2Id, channelUrl });

      // 실제 채널 생성 및 사용자 연결
      await createChannelAndConnectUsers(user1Id, user2Id, channelUrl);

      setChatUrls(urls);
      setShowChatUrls(true);
    } catch (error) {
      console.error("새 채팅 생성 실패:", error);
    }
  }, [createChannelAndConnectUsers]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("URL이 클립보드에 복사되었습니다!");
    });
  }, []);

  const joinChat = useCallback(
    (url: string) => {
      // 풀 경로에서 상대 경로만 추출
      const relativePath = url.replace(window.location.origin, "");
      console.log("원본 URL:", url);
      console.log("상대 경로:", relativePath);
      navigate(relativePath);
    },
    [navigate]
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">채팅 생성</h1>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">채팅 생성</h2>
          <p className="text-gray-600 mb-6">새로운 1대1 채팅 채널을 생성합니다.</p>

          {/* 생성 상태 표시 */}
          {isCreating && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-sm text-blue-700">채널 생성 중... 잠시만 기다려주세요.</span>
              </div>
            </div>
          )}

          {/* 에러 메시지 표시 */}
          {creationError && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-sm text-red-700">
                <strong>생성 오류:</strong> {creationError}
              </div>
            </div>
          )}

          {/* 버튼 그리드 */}
          <div className="flex justify-center">
            <button
              onClick={createNewChat}
              disabled={isCreating}
              className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white px-8 py-6 rounded-lg font-medium transition-colors text-center"
            >
              <div className="text-xl font-semibold">새 채팅 URL 생성</div>
              <div className="text-sm opacity-90 mt-1">URL통한 1대1 채팅</div>
            </button>
          </div>
        </div>

        {/* 생성된 URL 표시 */}
        {showChatUrls && chatUrls && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">생성된 채팅 URL</h3>
              <button
                onClick={() => copyToClipboard(`${chatUrls.url1}\n${chatUrls.url2}`)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                두 URL 모두 복사
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-blue-800">사용자 1 (첫 번째 참가자)</div>
                  <div className="flex space-x-2">
                    <button onClick={() => copyToClipboard(chatUrls.url1)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">
                      복사
                    </button>
                    <button onClick={() => joinChat(chatUrls.url1)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs">
                      참가
                    </button>
                  </div>
                </div>
                <div className="text-sm font-mono text-blue-600 break-all bg-white p-2 rounded border">{chatUrls.url1}</div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-green-800">사용자 2 (두 번째 참가자)</div>
                  <div className="flex space-x-2">
                    <button onClick={() => copyToClipboard(chatUrls.url2)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs">
                      복사
                    </button>
                    <button onClick={() => joinChat(chatUrls.url2)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">
                      참가
                    </button>
                  </div>
                </div>
                <div className="text-sm font-mono text-green-600 break-all bg-white p-2 rounded border">{chatUrls.url2}</div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">사용 방법</h4>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• 각 URL을 다른 브라우저나 시크릿 모드에서 열어서 1대1 채팅을 테스트하세요.</li>
                <li>• "복사" 버튼을 클릭하여 URL을 클립보드에 복사할 수 있습니다.</li>
                <li>• "참가" 버튼을 클릭하여 해당 채팅에 바로 참가할 수 있습니다.</li>
                <li>• 채널 ID: {chatUrls.channelUrl}</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
