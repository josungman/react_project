import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useSendbirdConnection } from "../hooks/useSendbirdConnection";
import { useSendbirdChannel } from "../hooks/useSendbirdChannel";
import { SendBirdProvider, Channel } from "@sendbird/uikit-react";
import ChannelInfoSheet from "../components/chat/ChannelInfoSheet";
import CallOverlay from "../components/chat/CallOverlay";
import { useCallsAndNotifications } from "../hooks/useCallsAndNotifications";
import { useMessageBackgroundNotify } from "../hooks/useMessageBackgroundNotify";
import MessageContent from "@sendbird/uikit-react/ui/MessageContent";
import { MessageMenu } from "@sendbird/uikit-react/ui/MessageMenu";
import "@sendbird/uikit-react/dist/index.css";
import { decryptFromBase64, fromBase64UrlToString } from "../utils/crypto";

/**
 * SendbirdChat 페이지
 * - 연결/채널 진입 훅을 통해 UIKit `Channel`을 렌더링합니다.
 * - 통화 훅을 사용하여 통화 UI를 제어하고, 백그라운드 메시지 알림 훅을 활성화합니다.
 */
const APP_ID = import.meta.env.VITE_SENDBIRD_APP_ID;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function SendbirdChat() {
  const { channelId } = useParams();
  const [searchParams] = useSearchParams();
  const urlUserId = searchParams.get("user");
  const [channel, setChannel] = useState<any>(null);
  const [isChannelReady, setIsChannelReady] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // 채널 내 상대 사용자 식별을 위한 참조 (peerId 캐싱)
  const peerIdRef = useRef<string | null>(null);

  /**
   * 특정 사용자(pid)의 Presence(온라인/오프라인, 마지막 접속 시간)를 조회
   */
  const queryPresence = (sb: any, pid: string): Promise<{ online: boolean | null; lastSeenAt: number }> => {
    return new Promise((resolve) => {
      try {
        if (!pid || !sb?.createApplicationUserListQuery) return resolve({ online: null, lastSeenAt: 0 });
        const q = sb.createApplicationUserListQuery();
        q.userIdsFilter = [pid];
        q.limit = 1;
        q.next((users: any[], error: any) => {
          if (error || !users || users.length === 0) return resolve({ online: null, lastSeenAt: 0 });
          const u = users[0] || {};
          const status = typeof u.connectionStatus === "string" ? u.connectionStatus.toLowerCase() : "";
          const online = status ? status === "online" : null;
          const lastSeenAt = typeof u.lastSeenAt === "number" ? u.lastSeenAt : 0;
          resolve({ online, lastSeenAt });
        });
      } catch {
        resolve({ online: null, lastSeenAt: 0 });
      }
    });
  };

  /**
   * Helper: 채널 멤버에서 상대 사용자 ID를 추론하여 반환
   */
  const getPeerUserId = useRef<null | ((ch?: any) => string | null)>(null);
  if (!getPeerUserId.current) {
    getPeerUserId.current = (ch?: any) => {
      try {
        if (ch?.members && urlUserId) {
          const m = (ch.members || []).find((mm: any) => mm?.userId && mm.userId !== urlUserId);
          return m?.userId || null;
        }
        if (peerIdRef.current) return peerIdRef.current;
        if (channel?.members && urlUserId) {
          const m = (channel.members || []).find((mm: any) => mm?.userId && mm.userId !== urlUserId);
          return m?.userId || null;
        }
      } catch {}
      return null;
    };
  }

  /**
   * Helper: 상대 사용자 전화번호 토큰을 복호화하여 반환
   */
  const getPeerPhone = useRef<null | ((ch?: any, fallbackPeerId?: string) => Promise<string | null>)>(null);
  if (!getPeerPhone.current) {
    getPeerPhone.current = async (ch?: any, fallbackPeerId?: string) => {
      const pid = fallbackPeerId || getPeerUserId.current?.(ch) || null;
      if (!pid) return null;
      try {
        if (!pid.startsWith("user_")) return null;
        const token = pid.slice(5);
        const maybe = fromBase64UrlToString(token);
        if (!maybe) return null;
        if (maybe.includes(":")) {
          const dec = await decryptFromBase64(maybe);
          return dec;
        }
        return maybe;
      } catch {
        return null;
      }
    };
  }

  /**
   * Sendbird 연결 훅: SDK 초기화/사용자 연결 상태/에러/재시도 제공
   */
  const {
    isConnected,
    sb,
    user,
    isConnecting: _isConnecting,
    connectionError,
    retryConnection,
  } = useSendbirdConnection({
    channelId,
    urlUserId: urlUserId || undefined,
  });

  /**
   * 통화/알림 훅: Calls 초기화, 통화 상태/제어, 원격 오디오 ref, 내 전화번호 복호화 제공
   */
  const { isCallUIOpen, callStatus, isIncoming, localAudioRef, remoteAudioRef, startVoiceCall, acceptCall, endCall, getSelfPhone } = useCallsAndNotifications({
    appId: APP_ID,
    sb,
    user,
    channel,
  });

  // 메시지 수신 시, 탭이 백그라운드인 경우 Biztalk 알림 전송
  useMessageBackgroundNotify({ sb, user, channel, channelId, getSelfPhone });

  /**
   * 채널 훅: 채널 URL로 GroupChannel 조회/선택 후 상태 반영
   */
  const { enterChannelByUrl } = useSendbirdChannel({
    sb,
    user,
    setConnectionError: (error: string) => {
      console.error("채널 에러:", error);
    },
    setChannel,
    setIsChannelReady,
  });

  // 사용자/연결 준비 완료 시 채널 입장 시도
  useEffect(() => {
    if (user && isConnected && channelId && !isChannelReady && sb) {
      enterChannelByUrl(channelId, user);
    }
  }, [user, isConnected, channelId, isChannelReady, sb, enterChannelByUrl]);

  // 현재 채널 멤버 기준으로 상대 사용자 ID를 캐싱
  useEffect(() => {
    if (!channel || !user?.userId) return;
    try {
      const members = (channel.members || []) as any[];
      const pid = members.find((m) => m?.userId && m.userId !== user.userId)?.userId || null;
      peerIdRef.current = pid;
    } catch {}
  }, [channel?.url, user?.userId]);

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      <div className="bg-white shadow-sm border-b px-3 py-2 md:px-6 md:py-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-2xl font-bold text-gray-800">1대1 채팅</h1>

            <button
              type="button"
              onClick={startVoiceCall}
              className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700"
              title="음성 통화"
              aria-label="voice-call"
            >
              📞
            </button>
            <button
              type="button"
              onClick={() => setIsInfoOpen(true)}
              className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700"
              title="채널 정보"
              aria-label="channel-info"
            >
              i
            </button>
          </div>
        </div>
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
      </div>

      <div className="flex-1 min-h-0">
        {APP_ID && isConnected && isChannelReady && sb && user?.userId && (channel?.url || channelId) ? (
          <SendBirdProvider appId={APP_ID as string} sdkInstance={sb as any} userId={user.userId} accessToken={(user as any)?.accessToken || undefined} key={user.userId}>
            <div className="relative flex h-full min-w-0">
              <div className="flex-1 min-h-0 min-w-0">
                <Channel
                  channelUrl={(channel?.url as string) || (channelId as string)}
                  key={`${(channel?.url as string) || (channelId as string)}-stable`}
                  isTypingIndicatorEnabled={true}
                  isMessageReceiptStatusEnabled={true}
                  isReactionEnabled={true}
                  onBeforeSendUserMessage={(text: any) => {
                    const messageText = typeof text === "string" ? text : String(text ?? "");
                    try {
                      const peerId = peerIdRef.current || "";
                      if (peerId && sb) {
                        (async () => {
                          try {
                            const p = await queryPresence(sb, peerId);
                            const offlineNow = p.online === false || (p.lastSeenAt > 0 && Date.now() - p.lastSeenAt > 60000);
                            if (offlineNow) {
                              let phoneDecrypted: string | null = null;
                              try {
                                phoneDecrypted = (await getPeerPhone.current?.(undefined, peerId)) || null;
                              } catch {}
                              const origin = typeof window !== "undefined" ? window.location.origin : "";
                              const channelKey = (channelId as string) || (channel?.url as string) || "";
                              const peerLink = origin && channelKey ? `${origin}/chat/${channelKey}?user=${peerId}` : "";
                              const PAYLOAD = {
                                send_number: phoneDecrypted,
                                conn_status: "채팅 접속 안함 상태",
                                re_message: messageText,
                                link: peerLink,
                              } as any;
                              fetch(`${BACKEND_URL}/biztalkchating/missed_message`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(PAYLOAD),
                              }).catch(() => {});
                            }
                          } catch {}
                        })();
                      }
                    } catch {}
                    return { message: messageText } as any;
                  }}
                  renderChannelHeader={() => null}
                  renderMessageContent={(contentProps: any) => {
                    const m: any = contentProps?.message;
                    if (m?.customType === "call_recording") {
                      let audioUrl: string | undefined;
                      try {
                        const data = m?.data && JSON.parse(m.data);
                        audioUrl = data?.audioUrl;
                      } catch {}
                      if (audioUrl) {
                        return (
                          <div className="max-w-xs md:max-w-sm lg:max-w-md p-2 rounded border bg-gray-50">
                            <div className="text-sm text-gray-600 mb-1">통화 녹음</div>
                            <audio controls src={audioUrl} className="w-full" />
                          </div>
                        );
                      }
                    }
                    return (
                      <MessageContent
                        {...contentProps}
                        renderMessageMenu={(menuProps: any) => (
                          <MessageMenu
                            {...menuProps}
                            renderMenuItems={(itemsProps: any) => {
                              const { CopyMenuItem, ReplyMenuItem } = itemsProps.items || {};
                              return (
                                <>
                                  {CopyMenuItem && <CopyMenuItem />}
                                  {ReplyMenuItem && <ReplyMenuItem />}
                                </>
                              );
                            }}
                          />
                        )}
                      />
                    );
                  }}
                />
              </div>
              {isInfoOpen && <ChannelInfoSheet channel={channel} onClose={() => setIsInfoOpen(false)} />}
              {isCallUIOpen && (
                <CallOverlay isIncoming={isIncoming} status={callStatus} onAccept={acceptCall} onEnd={endCall} localRef={localAudioRef} remoteRef={remoteAudioRef} />
              )}
            </div>
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
