import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useSendbirdConnection } from "../hooks/useSendbirdConnection";
import { useSendbirdChannel } from "../hooks/useSendbirdChannel";
import { useSendbirdMessages } from "../hooks/useSendbirdMessages";
import { useSendbirdCalls } from "../hooks/useSendbirdCalls";
import { CallInterface } from "../components/CallInterface";

const APP_ID = import.meta.env.VITE_SENDBIRD_APP_ID;

// 디버깅용: APP_ID 확인
console.log("APP_ID:", APP_ID);
console.log("환경변수:", import.meta.env.VITE_SENDBIRD_APP_ID);
console.log("환경변수 존재 여부:", !!import.meta.env.VITE_SENDBIRD_APP_ID);
console.log("전체 import.meta.env:", import.meta.env);

export default function SendbirdChat() {
  const { channelId } = useParams();
  const [searchParams] = useSearchParams();
  const urlUserId = searchParams.get("user");

  const [channel, setChannel] = useState<any>(null);
  const [isChannelReady, setIsChannelReady] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [presenceOnline, setPresenceOnline] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 최종 표시 상태: presenceOnline가 true면 초록, 아니면 in-room(state===joined 또는 멤버 목록 포함)로 보조
  const isOtherActive = useMemo(() => {
    if (!otherUser) return false;
    if (presenceOnline === true) return true;
    const inRoom = (otherUser as any)?.state === "joined" || channel?.members?.some((m: any) => m.userId === otherUser.userId);
    return inRoom;
  }, [presenceOnline, otherUser, channel]);

  // 상대방이 채널 멤버로 남아있는지 여부 (채널 기준) - 현재 색상 판정에는 사용하지 않음

  // 연결 관련 훅 (먼저 선언)
  const { isConnected, sb, user, isConnecting, connectionError, retryConnection } = useSendbirdConnection({
    channelId,
    urlUserId: urlUserId || undefined,
  });

  // 메시지 관련 훅
  const { messages, newMessage, setNewMessage, setupChannelHandler, sendMessage, handleKeyPress, setMessages } = useSendbirdMessages({
    sb, // 연결 훅에서 가져온 SendBird 인스턴스
    user, // 연결 훅에서 가져온 사용자
    channel,
    isChannelReady,
  });

  // 채널 관련 훅
  const { enterChannelByUrl } = useSendbirdChannel({
    sb, // 연결 훅에서 가져온 SendBird 인스턴스
    user, // 연결 훅에서 가져온 사용자
    setConnectionError: (error: string) => {
      // 연결 에러 처리
      console.error("채널 에러:", error);
    },
    setChannel,
    setIsChannelReady,
    setupChannelHandler,
  });

  // 통화 관련 훅
  const { isCallActive, callType, isRecording, callDuration, startVoiceCall, endCall, startRecording, stopRecording } = useSendbirdCalls({
    sb,
    user,
    channel,
    onMessageSent: () => {
      // 녹음 파일 업로드 후 메시지 목록 새로고침
      console.log("녹음 파일 업로드 완료, 메시지 목록 새로고침");
      if (channel && isChannelReady) {
        // 과거 메시지를 다시 로드하여 최신 메시지 포함
        const query = channel.createPreviousMessageListQuery();
        query.load(50, true, (msgs: any[], error: any) => {
          if (!error && msgs) {
            console.log("메시지 목록 새로고침:", msgs.length);
            const allMessages = msgs.filter((msg: any) => msg.isUserMessage() || msg.isFileMessage?.());
            const sortedMessages = allMessages.sort((a, b) => {
              const timeA = new Date(a.createdAt).getTime();
              const timeB = new Date(b.createdAt).getTime();
              return timeA - timeB;
            });
            setMessages(sortedMessages);
          }
        });
      }
    },
  });

  // 사용자가 준비되면 채널 입장 시도 (연결 상태 확인)
  useEffect(() => {
    console.log("=== 채널 입장 조건 확인 ===");
    console.log("사용자 존재:", !!user);
    console.log("연결 상태:", isConnected);
    console.log("채널 ID 존재:", !!channelId);
    console.log("채널 준비 상태:", !isChannelReady);
    console.log("SendBird 인스턴스 존재:", !!sb);
    console.log("사용자 연결 상태:", user?.connectionStatus);

    if (user && isConnected && channelId && !isChannelReady && sb) {
      console.log("=== 사용자 준비됨, 채널 입장 시도 ===");
      console.log("사용자:", user.userId);
      console.log("채널 ID:", channelId);
      console.log("SendBird 인스턴스:", sb);
      console.log("사용자 연결 상태:", user.connectionStatus);
      console.log("연결 상태 확인:", {
        isConnected,
        userExists: !!user,
        channelIdExists: !!channelId,
        channelNotReady: !isChannelReady,
        sbExists: !!sb,
      });

      // 연결 상태와 관계없이 진행
      console.log(`연결 상태: ${user.connectionStatus} - 채널 입장을 시도합니다.`);
      enterChannelByUrl(channelId, user);
    } else {
      console.log("채널 입장 조건 미충족:", {
        userExists: !!user,
        isConnected,
        channelIdExists: !!channelId,
        channelNotReady: !isChannelReady,
        sbExists: !!sb,
      });
    }
  }, [user, isConnected, channelId, isChannelReady, sb, enterChannelByUrl]);

  // 메시지가 변경될 때마다 자동으로 맨 아래로 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 채널이 준비되면 상대방 정보 업데이트
  useEffect(() => {
    if (channel && isChannelReady && user) {
      const otherMember = channel.members?.find((member: any) => member.userId !== user.userId);
      if (otherMember) {
        console.log("상대방 정보 업데이트:", otherMember);
        console.log("[OtherUser] initial pick", {
          userId: otherMember.userId,
          state: otherMember.state,
          connectionStatus: otherMember.connectionStatus,
          isOnline: (otherMember as any).isOnline,
        });
        setOtherUser(otherMember);
      }
    }
  }, [channel, isChannelReady, user]);

  // 주기적으로 상대방 연결 상태 확인 (refetch 채널; 5초)
  useEffect(() => {
    if (!sb || !channel?.url || !user?.userId) return;

    const tick = () => {
      console.log("[Polling] 채널 멤버 최신화");
      sb.GroupChannel.getChannel(channel.url, (fresh: any, err: any) => {
        if (err) {
          console.error("[Polling] getChannel 실패:", err);
          return;
        }
        const updated = fresh.members?.find((m: any) => m.userId !== user.userId);
        if (updated) {
          setOtherUser((prev: any) => {
            if (!prev) return updated;
            if (prev.connectionStatus !== updated.connectionStatus || (prev as any).state !== (updated as any).state || (prev as any).lastSeenAt !== (updated as any).lastSeenAt) {
              console.log("[Polling] 상대방 변경 감지", {
                prev: {
                  connectionStatus: prev.connectionStatus,
                  state: (prev as any).state,
                  lastSeenAt: (prev as any).lastSeenAt,
                },
                next: {
                  connectionStatus: updated.connectionStatus,
                  state: (updated as any).state,
                  lastSeenAt: (updated as any).lastSeenAt,
                },
              });
            }
            return updated;
          });
        }
      });
    };

    const interval = setInterval(tick, 5000);
    tick(); // 즉시 1회
    return () => clearInterval(interval);
  }, [sb, channel?.url, user?.userId]);

  // 상대방 Presence 주기 확인 (3초 간격, 사용자 목록 API 사용)
  useEffect(() => {
    if (!sb || !otherUser?.userId) return;

    const fetchPresence = () => {
      try {
        console.log("[Presence] poll start", {
          at: new Date().toISOString(),
          userId: otherUser.userId,
          prevPresenceOnline: presenceOnline,
        });
        const query = sb.createApplicationUserListQuery({
          userIdsFilter: [otherUser.userId],
          limit: 1,
          includePresence: true,
        } as any);
        // v4 SDK는 load가 아닌 next를 사용
        query.next((users: any[], error: any) => {
          if (error) {
            console.error("상대방 Presence 조회 실패:", error);
            return;
          }
          if (users && users.length > 0) {
            const u = users[0];
            console.log("[Presence] result", {
              at: new Date().toISOString(),
              queriedUserId: otherUser.userId,
              isOnline: u.isOnline,
              connectionStatus: u.connectionStatus,
            });
            const online = u.isOnline === true || u.connectionStatus === "online";
            console.log("[Presence] decision", { at: new Date().toISOString(), online });
            setPresenceOnline(online);
          } else {
            // 사용자가 더 이상 조회되지 않으면 오프라인으로 처리
            setPresenceOnline(false);
          }
        });
      } catch (e) {
        console.error("Presence 쿼리 생성 실패:", e);
      }
    };

    console.log("[Presence] schedule polling (3s)", { userId: otherUser.userId });
    fetchPresence();
    const interval = setInterval(fetchPresence, 3000);
    return () => clearInterval(interval);
  }, [sb, otherUser?.userId]);

  // 렌더 직전 배지 판단 값 로깅
  useEffect(() => {
    console.log("[RenderBadge] inputs", {
      at: new Date().toISOString(),
      presenceOnline,
      otherConn: otherUser?.connectionStatus,
      otherIsOnline: otherUser?.isOnline,
      otherState: (otherUser as any)?.state,
      inRoom: channel?.members?.some((m: any) => m.userId === otherUser?.userId) || false,
      isOtherActive,
    });
  }, [presenceOnline, otherUser?.connectionStatus, otherUser?.isOnline, channel, isOtherActive]);

  // 채널 멤버 상태 변화 감지 (전역 핸들러 사용)
  useEffect(() => {
    if (!sb || !channel || !user) return;

    const handlerId = `member_status_handler_${channel.url}`;
    const handler = new sb.ChannelHandler();

    // 사용자 리스트가 변경되면 최신 멤버 정보를 반영
    handler.onUserListUpdated = (updatedChannel: any) => {
      if (updatedChannel.url !== channel.url) return;
      console.log("onUserListUpdated: 멤버 목록 변경 감지");
      updatedChannel.refresh((freshChannel: any, error: any) => {
        if (!error && freshChannel) {
          console.log(
            "[Channel] members snapshot",
            freshChannel.members?.map((m: any) => ({
              userId: m.userId,
              state: m.state,
              connectionStatus: m.connectionStatus,
              isOnline: (m as any).isOnline,
            }))
          );
          const member = freshChannel.members?.find((m: any) => m.userId !== user.userId);
          if (member) {
            console.log("[OtherUser] refreshed pick", {
              userId: member.userId,
              state: member.state,
              connectionStatus: member.connectionStatus,
              isOnline: (member as any).isOnline,
            });
            setOtherUser(member);
          } else {
            // 상대방이 멤버 목록에서 제거됨 → 나간 상태로 처리
            setOtherUser((prev: any) => (prev ? { ...prev, connectionStatus: "nonavailable" } : null));
          }
        }
      });
    };

    // 상대방이 방을 나감
    handler.onUserExited = (updatedChannel: any, exitedUser: any) => {
      if (updatedChannel.url !== channel.url) return;
      if (exitedUser.userId !== user.userId) {
        console.log("상대방 퇴장 감지:", exitedUser.userId);
        // 채널 최신화 후 멤버 목록 기준으로 상태 갱신
        updatedChannel.refresh((fresh: any, error: any) => {
          if (!error && fresh) {
            const member = fresh.members?.find((m: any) => m.userId !== user.userId);
            if (member) {
              setOtherUser(member);
            } else {
              setOtherUser((prev: any) => ({ ...(prev || exitedUser), connectionStatus: "nonavailable", state: "left" }));
            }
            // 렌더 강제 갱신
            setChannel((c: any) => ({ ...(c || fresh), members: fresh.members }));
          } else {
            setOtherUser((prev: any) => ({ ...(prev || exitedUser), connectionStatus: "nonavailable", state: "left" }));
          }
        });
      }
    };

    handler.onUserLeft = (updatedChannel: any, leftUser: any) => {
      if (updatedChannel.url !== channel.url) return;
      if (leftUser.userId !== user.userId) {
        console.log("상대방 나감 감지:", leftUser.userId);
        updatedChannel.refresh((fresh: any, error: any) => {
          if (!error && fresh) {
            const member = fresh.members?.find((m: any) => m.userId !== user.userId);
            if (member) {
              setOtherUser(member);
            } else {
              setOtherUser((prev: any) => ({ ...(prev || leftUser), connectionStatus: "nonavailable", state: "left" }));
            }
            setChannel((c: any) => ({ ...(c || fresh), members: fresh.members }));
          } else {
            setOtherUser((prev: any) => ({ ...(prev || leftUser), connectionStatus: "nonavailable", state: "left" }));
          }
        });
      }
    };

    // 상대방이 입장/재입장
    handler.onUserEntered = (updatedChannel: any, enteredUser: any) => {
      if (updatedChannel.url !== channel.url) return;
      if (enteredUser.userId !== user.userId) {
        console.log("상대방 입장 감지:", enteredUser.userId);
        setOtherUser(enteredUser);
      }
    };

    handler.onUserJoined = (updatedChannel: any, joinedUser: any) => {
      if (updatedChannel.url !== channel.url) return;
      if (joinedUser.userId !== user.userId) {
        console.log("상대방 합류 감지:", joinedUser.userId);
        updatedChannel.refresh((fresh: any, error: any) => {
          if (!error && fresh) {
            const member = fresh.members?.find((m: any) => m.userId !== user.userId);
            if (member) setOtherUser(member);
            setChannel((c: any) => ({ ...(c || fresh), members: fresh.members }));
          } else {
            setOtherUser(joinedUser);
          }
        });
      }
    };

    sb.addChannelHandler(handlerId, handler);

    return () => {
      sb.removeChannelHandler(handlerId);
    };
  }, [sb, channel, user]);

  // 파일 업로드 함수
  const handleFileUpload = async (file: File) => {
    if (!channel || !user) {
      alert("채널에 입장하지 않았습니다.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 파일 크기 제한 (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert("파일 크기는 10MB를 초과할 수 없습니다.");
        return;
      }

      // 파일 타입 확인
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "application/zip",
      ];

      if (!allowedTypes.includes(file.type)) {
        alert("지원하지 않는 파일 형식입니다.");
        return;
      }

      console.log("파일 업로드 시작:", file.name, file.size, file.type);

      // SendBird 파일 업로드
      const fileMessage = await new Promise((resolve, reject) => {
        const params = new sb.FileMessageParams();
        params.file = file;
        params.fileName = file.name;
        params.fileSize = file.size;
        params.mimeType = file.type;

        // 업로드 진행률 콜백
        params.uploadHandler = (request: any) => {
          request.onprogress = (event: any) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(progress);
              console.log("업로드 진행률:", progress + "%");
            }
          };
        };

        channel.sendFileMessage(params, (message: any, error: any) => {
          if (error) {
            console.error("파일 업로드 실패:", error);
            reject(error);
            return;
          }
          console.log("파일 업로드 성공:", message);
          resolve(message);
        });
      });

      console.log("파일 메시지 전송 완료:", fileMessage);
      console.log("파일 메시지 상세 정보:", {
        messageId: (fileMessage as any).messageId,
        messageType: (fileMessage as any).messageType,
        payload: (fileMessage as any).payload,
        url: (fileMessage as any).payload?.url,
        name: (fileMessage as any).payload?.name,
        size: (fileMessage as any).payload?.size,
        mimeType: (fileMessage as any).payload?.mimeType,
      });

      // 파일 메시지를 즉시 메시지 목록에 추가
      setMessages((prev) => {
        const isDuplicate = prev.some((existingMsg) => existingMsg.messageId === (fileMessage as any).messageId);
        if (isDuplicate) {
          console.log("파일 메시지가 이미 있음:", (fileMessage as any).messageId);
          return prev;
        }
        console.log("파일 메시지 즉시 추가:", (fileMessage as any).name);
        return [...prev, fileMessage];
      });

      alert("파일이 성공적으로 업로드되었습니다!");

      // 파일 메시지가 실제 SendBird 서버에 저장되었으므로
      // 이벤트 핸들러를 통해 자동으로 메시지 목록에 추가됨
      console.log("파일 업로드 완료 - 서버에 저장됨");
      console.log("파일 메시지 ID:", (fileMessage as any).messageId);
      console.log("파일 메시지 구조:", fileMessage);
    } catch (error: any) {
      console.error("파일 업로드 중 오류:", error);
      alert(`파일 업로드 실패: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 파일 업로드 버튼 클릭 핸들러
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b px-3 py-2 md:px-6 md:py-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-y-2">
          <h1 className="text-lg md:text-2xl font-bold text-gray-800">1대1 채팅 (GroupChannel)</h1>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500" : "bg-red-500"}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? `연결됨 (${user?.userId})` : isConnecting ? "연결 중..." : `연결 실패 (APP_ID: ${APP_ID ? "설정됨" : "없음"})`}
            </span>
          </div>
        </div>

        {/* 연결 에러 표시 */}
        {connectionError && (
          <div className="mt-6 p-3 bg-red-50 rounded-lg border border-red-200">
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

        {/* 연결 상태 정보 */}
        <div className="mt-3 md:mt-6 p-1.5 md:p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between text-[10px] md:text-sm flex-wrap gap-y-1 md:gap-y-2">
            <div className="flex items-center space-x-1.5 md:space-x-4 min-w-0">
              <span className="hidden md:inline text-blue-800 font-medium">연결 상태:</span>
              <div className="flex items-center space-x-1.5 md:space-x-2 min-w-0">
                <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500" : "bg-red-500"}`}></div>
                <span className="text-gray-700 truncate max-w-[8rem] md:max-w-none">나: {user?.userId || "연결 중..."}</span>
              </div>
              {otherUser && (
                <div className="flex items-center space-x-1.5 md:space-x-2 min-w-0">
                  <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isOtherActive ? "bg-green-500" : "bg-gray-400"}`}></div>
                  <span className="text-gray-700 truncate max-w-[8rem] md:max-w-none">상대방: {otherUser?.userId || "확인 중..."}</span>
                </div>
              )}
            </div>
            <span className="hidden md:block text-xs text-gray-500">채널: {channelId || "없음"}</span>
          </div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-3 pt-2 md:p-6 md:pt-6 space-y-3 md:space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg">메시지를 보내서 대화를 시작해보세요!</p>
            <p className="text-sm text-gray-400 mt-2">실제 SendBird 서버와 연결되어 있습니다.</p>
            <p className="text-xs text-gray-400 mt-1">현재 채널: {channelId || "없음"}</p>

            {/* URL로 접속하지 않았을 때만 채팅 생성 안내 */}
            {!channelId && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">새로운 채팅을 시작하려면 URL을 통해 접속하거나 채팅 생성 페이지를 이용하세요.</p>
                <p className="text-xs text-blue-600 mt-1">채팅 생성 페이지: /chat/create</p>
              </div>
            )}

            {/* URL로 접속했지만 채널이 준비되지 않았을 때 */}
            {channelId && !isChannelReady && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">채널에 입장 중입니다...</p>
                <p className="text-xs text-blue-600 mt-1">잠시만 기다려주세요.</p>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender?.userId === user?.userId;
            const profileUrl = msg.sender?.profileUrl;
            return (
              <div key={msg.messageId} className={`flex items-end ${isMine ? "justify-end" : "justify-start"}`}>
                {/* 상대방 아바타 */}
                {!isMine &&
                  (profileUrl ? (
                    <img src={profileUrl} alt={msg.sender?.nickname || msg.sender?.userId || "avatar"} className="w-8 h-8 rounded-full mr-2 object-cover border border-gray-200" />
                  ) : (
                    <div className="w-8 h-8 rounded-full mr-2 bg-gray-300 flex items-center justify-center text-xs text-gray-700 border border-gray-200">
                      {(msg.sender?.nickname || msg.sender?.userId || "?").toString().slice(0, 1).toUpperCase()}
                    </div>
                  ))}
                <div
                  className={`rounded-2xl px-3 py-2 md:px-4 md:py-2 max-w-[80%] md:max-w-md break-words ${
                    isMine ? "bg-blue-500 text-white" : "bg-white text-gray-800 border border-gray-200"
                  }`}
                >
                  <div className="text-sm font-medium mb-1">{isMine ? "나" : msg.sender?.nickname || msg.sender?.userId}</div>

                  {/* 파일 메시지 렌더링 */}
                  {msg.messageType === "file" || msg.isFileMessage?.() || msg.type === "file" || msg.name ? (
                    <div className="mb-2">
                      {msg.mimeType?.startsWith("image/") || msg.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        // 이미지 파일
                        <div className="mb-2">
                          <img
                            src={msg.url || msg.plainUrl || msg.thumbnails?.[0]?.url || msg.payload?.url}
                            alt={msg.name || "이미지"}
                            className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(msg.url || msg.plainUrl || msg.thumbnails?.[0]?.url || msg.payload?.url, "_blank")}
                          />
                          <div className="text-xs opacity-75 mt-1">{msg.name}</div>
                        </div>
                      ) : msg.mimeType?.startsWith("audio/") || msg.name?.match(/\.(webm|mp3|wav|ogg|m4a)$/i) ? (
                        // 오디오 파일
                        <div className="mb-2">
                          <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
                            <div className="text-2xl">🎵</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{msg.name || msg.payload?.name || "오디오 파일"}</div>
                              <div className="text-xs opacity-75">
                                {msg.size || msg.payload?.size ? `${((msg.size || msg.payload?.size) / 1024).toFixed(1)} KB` : "크기 정보 없음"}
                              </div>
                            </div>
                          </div>
                          <audio controls className="w-full mt-2" src={msg.url || msg.plainUrl || msg.payload?.url}>
                            <source src={msg.url || msg.plainUrl || msg.payload?.url} type={msg.mimeType || "audio/webm"} />
                            브라우저가 오디오 재생을 지원하지 않습니다.
                          </audio>
                        </div>
                      ) : (
                        // 일반 파일
                        <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
                          <div className="text-2xl">📎</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{msg.name || msg.payload?.name || "파일"}</div>
                            <div className="text-xs opacity-75">
                              {msg.size || msg.payload?.size ? `${((msg.size || msg.payload?.size) / 1024 / 1024).toFixed(2)} MB` : "크기 정보 없음"}
                            </div>
                          </div>
                          <button
                            onClick={() => window.open(msg.url || msg.plainUrl || msg.payload?.url, "_blank")}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                          >
                            다운로드
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    // 일반 텍스트 메시지
                    <div className="text-sm">{msg.message}</div>
                  )}

                  <div className={`text-xs opacity-75 mt-1 ${isMine ? "text-right" : "text-left"}`}>
                    {new Date(msg.createdAt).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })}
                  </div>
                </div>
                {/* 읽지 않음 뱃지 제거 요청에 따라 표시하지 않음 */}
              </div>
            );
          })
        )}
        {/* 스크롤 타겟 */}
        <div ref={messagesEndRef} />
      </div>

      {/* 통화 인터페이스 */}
      <CallInterface
        isCallActive={isCallActive}
        callType={callType}
        callDuration={callDuration}
        isRecording={isRecording}
        onStartVoiceCall={startVoiceCall}
        onEndCall={endCall}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
      />

      {/* 메시지 입력 영역 */}
      <div className="bg-white border-t px-3 py-2 md:px-6 md:py-4 flex-shrink-0 mb-3 md:mb-0">
        {/* 파일 업로드 진행률 표시 */}
        {isUploading && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm text-blue-700">파일 업로드 중... {uploadProgress}%</span>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        )}

        <div className="flex space-x-2 md:space-x-4">
          {/* 파일 업로드 버튼 */}
          <button
            onClick={handleUploadClick}
            disabled={!isConnected || !isChannelReady || isUploading}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
            title="파일 업로드 (이미지, PDF, 문서 등)"
          >
            <span className="text-sm">📎 파일</span>
          </button>

          {/* 숨겨진 파일 입력 */}
          <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt,.zip" className="hidden" />

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isChannelReady ? "메시지를 입력하세요..." : "채널 준비 중..."}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 md:px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
            disabled={!isConnected || !isChannelReady}
          />
          <button
            onClick={() => sendMessage(user)}
            disabled={!newMessage.trim() || !isConnected || !isChannelReady}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium px-4 py-2 md:px-6 rounded-lg transition-colors"
          >
            전송
          </button>
        </div>
        {!isConnected && !isConnecting && <p className="text-sm text-red-500 mt-2">SendBird 연결에 실패했습니다. 재시도 버튼을 클릭해주세요.</p>}
        {isConnecting && <p className="text-sm text-yellow-500 mt-2">SendBird 연결 중... 잠시만 기다려주세요.</p>}
        {isConnected && !isChannelReady && <p className="text-sm text-blue-500 mt-2">채널에 입장 중입니다... 잠시만 기다려주세요.</p>}
        {isConnected && isChannelReady && (
          <div className="mt-2 space-y-1">
            {/* <p className="text-sm text-green-600">✅ SendBird 서버에 연결되었습니다. 실시간 채팅이 가능합니다! (채널: {channelId})</p> */}
            <p className="text-xs text-gray-500">💡 파일 버튼을 클릭하여 이미지, PDF, 문서 등을 업로드할 수 있습니다. (최대 10MB)</p>
          </div>
        )}
      </div>
    </div>
  );
}
