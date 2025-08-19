import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SendbirdChat from "@sendbird/chat";
import { GroupChannelModule } from "@sendbird/chat/groupChannel";
import type { GroupChannelListQueryParams } from "@sendbird/chat/groupChannel";

// 환경변수에서 APP_ID 가져오기
const APP_ID = import.meta.env.VITE_SENDBIRD_APP_ID;

interface ChatChannel {
  id: string;
  channelUrl: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
  status: "active" | "closed";
  type: "chat";
  lastMessage?: string;
  lastMessageTime?: string;
  memberCount?: number;
  joinedMemberCount?: number;
}

export default function SupportListPage() {
  const navigate = useNavigate();
  const [chatChannels, setChatChannels] = useState<ChatChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

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

  // 채팅 채널 목록 불러오기
  const loadChatChannels = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const sb = await SendbirdChat.init({ appId: APP_ID as string, modules: [new GroupChannelModule()] });

      const adminUserId = "admin_user_" + Date.now();
      await sb.connect(adminUserId);

      const params: GroupChannelListQueryParams = { includeEmpty: true, limit: 100 };
      const query = sb.groupChannel.createMyGroupChannelListQuery(params);
      const channelList = await query.next();

      const list = Array.isArray(channelList) ? channelList : (channelList as any)?.channels || [];

      const convertedChannels = list.map((channel: any) => {
        return {
          id: channel.url,
          channelUrl: channel.url,
          user1Id: (channel.members?.[0]?.userId as string) || "unknown_user1",
          user2Id: (channel.members?.[1]?.userId as string) || "unknown_user2",
          createdAt: new Date(channel.createdAt).toISOString(),
          status: channel.isFrozen ? "closed" : "active",
          type: "chat",
          lastMessage: channel.lastMessage?.message || "",
          lastMessageTime: channel.lastMessage ? new Date(channel.lastMessage.createdAt).toISOString() : undefined,
          memberCount: channel.memberCount,
          joinedMemberCount: channel.joinedMemberCount,
        } as ChatChannel;
      });

      const channels = convertedChannels as ChatChannel[];

      const allChannels = channels;

      console.log("전체 채널 목록:", allChannels);
      setChatChannels(allChannels);

      // 로컬 스토리지에 백업 저장
      localStorage.setItem("chatChannels", JSON.stringify(allChannels));
    } catch (error: any) {
      console.error("채팅 채널 목록 불러오기 실패:", error);

      // SDK 조회 실패 시 로컬 스토리지에서 불러오기
      try {
        const savedChannels = localStorage.getItem("chatChannels");
        if (savedChannels) {
          const channels = JSON.parse(savedChannels);
          setChatChannels(channels);
        } else {
          setChatChannels([]);
        }
      } catch (localError) {
        console.error("로컬 스토리지 조회 실패:", localError);
        setError("채팅 채널 목록을 불러오는데 실패했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 컴포넌트 마운트 시 채팅 채널 목록 불러오기
  useEffect(() => {
    loadChatChannels();
  }, [loadChatChannels]);

  // 채팅 채널 입장 함수
  const joinChatChannel = useCallback(
    (channel: ChatChannel, userType: "user1" | "user2") => {
      const userId = userType === "user1" ? channel.user1Id : channel.user2Id;
      const url = `/chat/${channel.channelUrl}?user=${userId}`;
      navigate(url);
    },
    [navigate]
  );

  // 채팅 채널 삭제 함수
  const deleteChatChannel = useCallback(
    (channelId: string) => {
      if (window.confirm("이 채팅 채널을 삭제하시겠습니까?")) {
        const updatedChannels = chatChannels.filter((channel) => channel.id !== channelId);
        setChatChannels(updatedChannels);
        localStorage.setItem("chatChannels", JSON.stringify(updatedChannels));
      }
    },
    [chatChannels]
  );

  // 채팅 채널 상태 변경 함수
  const updateChannelStatus = useCallback(
    (channelId: string, status: "active" | "closed") => {
      const updatedChannels = chatChannels.map((channel) => (channel.id === channelId ? { ...channel, status } : channel));
      setChatChannels(updatedChannels);
      localStorage.setItem("chatChannels", JSON.stringify(updatedChannels));
    },
    [chatChannels]
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">채팅 채널 관리</h1>
          <div className="flex space-x-2">
            <button onClick={loadChatChannels} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">
              새로고침
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-6xl mx-auto p-6">
        {/* 에러 메시지 표시 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-sm text-red-700">
              <strong>오류:</strong> {error}
            </div>
          </div>
        )}

        {/* 채팅 채널 목록 */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">채팅 채널 목록</h2>
            <p className="text-sm text-gray-600 mt-1">총 {chatChannels.length}개의 채팅 채널이 있습니다.</p>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">채팅 채널 목록을 불러오는 중...</p>
            </div>
          ) : chatChannels.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-lg">생성된 채팅 채널이 없습니다.</p>
              <p className="text-sm mt-2">채팅 생성 페이지에서 새 채널을 만들어보세요.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {chatChannels.map((channel) => (
                <div key={channel.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">채팅 채널 {channel.channelUrl}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${channel.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {channel.status === "active" ? "활성" : "종료"}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-gray-600">
                        <p>
                          <strong>고객:</strong> {channel.user1Id}
                        </p>
                        <p>
                          <strong>작업자:</strong> {channel.user2Id}
                        </p>
                        <p>
                          <strong>생성일:</strong> {new Date(channel.createdAt).toLocaleString()}
                        </p>
                        {channel.memberCount && (
                          <p>
                            <strong>멤버 수:</strong> {channel.memberCount}명 (참여: {channel.joinedMemberCount}명)
                          </p>
                        )}
                        {channel.lastMessage && (
                          <p>
                            <strong>마지막 메시지:</strong> {channel.lastMessage}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* 고객 입장 버튼 */}
                      <button onClick={() => joinChatChannel(channel, "user1")} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium">
                        고객 입장
                      </button>

                      {/* 작업자 입장 버튼 */}
                      <button onClick={() => joinChatChannel(channel, "user2")} className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm font-medium">
                        작업자 입장
                      </button>

                      {/* 상태 변경 버튼 */}
                      <button
                        onClick={() => updateChannelStatus(channel.id, channel.status === "active" ? "closed" : "active")}
                        className={`px-3 py-2 rounded text-sm font-medium ${
                          channel.status === "active" ? "bg-red-500 hover:bg-red-600 text-white" : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
                      >
                        {channel.status === "active" ? "종료" : "재개"}
                      </button>

                      {/* 삭제 버튼 */}
                      <button onClick={() => deleteChatChannel(channel.id)} className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium">
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 사용 방법 안내 */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">사용 방법</h4>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>
              • <strong>고객 입장:</strong> 첫 번째 참가자로 채팅 채널에 입장합니다.
            </li>
            <li>
              • <strong>작업자 입장:</strong> 두 번째 참가자로 채팅 채널에 입장합니다.
            </li>
            <li>
              • <strong>종료/재개:</strong> 채팅 채널 상태를 변경합니다.
            </li>
            <li>
              • <strong>삭제:</strong> 채팅 채널을 목록에서 제거합니다.
            </li>
            <li>• 각 채팅 채널은 별도 브라우저에서 테스트할 수 있습니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
