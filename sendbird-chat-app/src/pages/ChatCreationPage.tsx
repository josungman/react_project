import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SendbirdChat from "@sendbird/chat";
import { GroupChannelModule } from "@sendbird/chat/groupChannel";
import type { GroupChannelCreateParams } from "@sendbird/chat/groupChannel";
import { encryptToBase64, toBase64Url } from "../utils/crypto";

// 환경변수에서 APP_ID 가져오기
const APP_ID = import.meta.env.VITE_SENDBIRD_APP_ID;

export default function ChatCreationPage() {
  const navigate = useNavigate();
  const [chatUrls, setChatUrls] = useState<any>(null);
  const [showChatUrls, setShowChatUrls] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<string>("");
  const [phone1, setPhone1] = useState<string>("");
  const [phone2, setPhone2] = useState<string>("");

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

  // Sendbird 채널 생성 및 사용자 연결 함수 (v4)
  const createChannelAndConnectUsers = useCallback(async (user1Id: string, user2Id: string, channelUrl: string) => {
    setIsCreating(true);
    setCreationError("");

    let sb: any = null;
    let sb2: any = null;
    try {
      // Sendbird v4 초기화 및 각 사용자 연결
      sb = await SendbirdChat.init({ appId: APP_ID as string, modules: [new GroupChannelModule()] });
      await sb.connect(user1Id);

      sb2 = await SendbirdChat.init({ appId: APP_ID as string, modules: [new GroupChannelModule()] });
      await sb2.connect(user2Id);

      // 채널 생성 (두 사용자 모두 연결된 후) v4
      console.log("채널 생성 중:", channelUrl);
      const params: GroupChannelCreateParams = {
        name: `채팅방 ${user1Id} & ${user2Id}`,
        invitedUserIds: [user1Id, user2Id],
        isDistinct: true,
        // customType은 길이 제한(<=128)이 있어 긴 식별자 저장에 부적합하므로 생략
      };
      const channel = await sb.groupChannel.createChannel(params);
      console.log("채널 생성 성공:", channel);
      console.log("=== ChatCreationPage 채널 상세 정보 ===");
      console.log("채널 URL:", channel.url);
      console.log("채널 이름:", channel.name);
      console.log("총 멤버 수:", channel.memberCount);
      console.log(
        "채널 멤버 목록:",
        channel.members?.map((m: any) => m.userId)
      );
      console.log("=== ChatCreationPage 채널 정보 끝 ===");

      // 두 사용자가 모두 연결되었으므로 채널 생성 완료
      console.log("두 사용자 모두 연결 완료!");
      console.log("user1:", user1Id);
      console.log("user2:", user2Id);

      // 생성된 채널을 로컬 스토리지에 저장
      const channelInfo = {
        id: channelUrl,
        channelUrl,
        actualUrl: (channel as any)?.url,
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
      try {
        await sb?.disconnect?.();
      } catch {}
      try {
        await (sb2 as any)?.disconnect?.();
      } catch {}
      setIsCreating(false);
    }
  }, []);

  const sanitizePhone = useCallback((p: string) => p.replace(/\D/g, ""), []);

  const deriveUserIdFromPhone = useCallback(
    async (rawPhone: string) => {
      const digits = sanitizePhone(rawPhone);
      // 휴대폰 번호를 AES-GCM으로 암호화하고 base64url 토큰으로 변환
      const encrypted = await encryptToBase64(digits); // "iv:ct" (base64)
      const token = toBase64Url(encrypted); // base64url
      return `user_${token}`;
    },
    [sanitizePhone]
  );

  const createNewChat = useCallback(async () => {
    try {
      setCreationError("");
      const p1 = sanitizePhone(phone1);
      const p2 = sanitizePhone(phone2);
      if (!p1 || !p2) {
        setCreationError("두 사용자 모두의 휴대폰 번호를 입력하세요.");
        return;
      }
      if (p1.length < 7 || p2.length < 7) {
        setCreationError("휴대폰 번호 형식이 올바르지 않습니다.");
        return;
      }

      // 휴대폰 번호에서 유저 ID 파생 (비가역적 해시)
      const user1Id = await deriveUserIdFromPhone(p1);
      const user2Id = await deriveUserIdFromPhone(p2);
      const sorted = [user1Id, user2Id].sort();
      const channelUrl = `group_chat_${sorted[0]}_${sorted[1]}`; // customType로 저장됨

      console.log("파생 사용자 ID:", { user1Id, user2Id, channelUrl });

      // 실제 채널 생성 및 사용자 연결
      await createChannelAndConnectUsers(user1Id, user2Id, channelUrl);

      const currentOrigin = window.location.origin;
      const urls = {
        user1Id,
        user2Id,
        channelUrl,
        url1: `${currentOrigin}/chat/${channelUrl}?user=${user1Id}`,
        url2: `${currentOrigin}/chat/${channelUrl}?user=${user2Id}`,
      };
      setChatUrls(urls);
      setShowChatUrls(true);
    } catch (error) {
      console.error("새 채팅 생성 실패:", error);
    }
  }, [phone1, phone2, sanitizePhone, deriveUserIdFromPhone, createChannelAndConnectUsers]);

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
          <p className="text-gray-600 mb-6">두 사용자의 휴대폰 번호를 입력하면 암호화된 ID로 채팅 URL을 생성합니다.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-700 mb-1">사용자 1 휴대폰 번호</label>
              <input value={phone1} onChange={(e) => setPhone1(e.target.value)} placeholder="010-1234-5678" className="w-full border rounded px-3 py-2 text-sm" inputMode="tel" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">사용자 2 휴대폰 번호</label>
              <input value={phone2} onChange={(e) => setPhone2(e.target.value)} placeholder="010-9876-5432" className="w-full border rounded px-3 py-2 text-sm" inputMode="tel" />
            </div>
          </div>

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
