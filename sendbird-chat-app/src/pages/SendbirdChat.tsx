import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useSendbirdConnection } from "../hooks/useSendbirdConnection";
import { useSendbirdChannel } from "../hooks/useSendbirdChannel";
// 통화 관련 훅/컴포넌트 제거
import { SendBirdProvider, Channel } from "@sendbird/uikit-react";
import Avatar from "@sendbird/uikit-react/ui/Avatar";
import MessageContent from "@sendbird/uikit-react/ui/MessageContent";
import { MessageMenu } from "@sendbird/uikit-react/ui/MessageMenu";
import "@sendbird/uikit-react/dist/index.css";
//import "../uikit-overrides.css";
import SendBirdCall from "sendbird-calls";

const APP_ID = import.meta.env.VITE_SENDBIRD_APP_ID;

export default function SendbirdChat() {
  const { channelId } = useParams();
  const [searchParams] = useSearchParams();
  const urlUserId = searchParams.get("user");

  const [channel, setChannel] = useState<any>(null);
  const [isChannelReady, setIsChannelReady] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isForeground, setIsForeground] = useState<boolean>(typeof document !== "undefined" ? !document.hidden : true);
  // Calls 상태
  const [directCall, setDirectCall] = useState<any>(null);
  const [isCallUIOpen, setIsCallUIOpen] = useState(false);
  const [callStatus, setCallStatus] = useState<string>("idle");
  const [isIncoming, setIsIncoming] = useState(false);
  const callsInitializedRef = useRef(false);
  const callEstablishedAtRef = useRef<number | null>(null);
  const callConnectedAtRef = useRef<number | null>(null);
  const blurTimerRef = useRef<number | null>(null);

  const sendCallLog = async (c: any, endReason?: string) => {
    try {
      const endedAt = Date.now();
      const establishedAt = callEstablishedAtRef.current;
      const connectedAt = callConnectedAtRef.current;
      const durationSec = connectedAt ? Math.max(0, Math.round((endedAt - connectedAt) / 1000)) : 0;
      const payload = {
        callId: c?.callId,
        caller: c?.caller?.userId,
        callee: c?.callee?.userId,
        appId: APP_ID,
        isVideoCall: !!c?.isVideoCall,
        endResult: endReason || c?.endResult || null,
        establishedAt: establishedAt || null,
        connectedAt: connectedAt || null,
        endedAt,
        durationSec,
        channelUrl: channel?.url || null,
      };
      await fetch("/api/call-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn("통화 로그 전송 실패", e);
    } finally {
      callEstablishedAtRef.current = null;
      callConnectedAtRef.current = null;
    }
  };
  const callsListenerIdRef = useRef<string | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const resumeAudioAutoplay = async () => {
    try {
      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctx && !audioContextRef.current) {
        audioContextRef.current = new Ctx();
      }
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }
    } catch {}
    try {
      if (localAudioRef.current) {
        localAudioRef.current.muted = true;
        localAudioRef.current.volume = 0;
      }
    } catch {}
    try {
      await remoteAudioRef.current?.play?.();
    } catch {}
  };
  // 사용자 연결 상태 표시 제거에 따라 상대 사용자/프레즌스 상태는 보관하지 않음

  // 사용자 연결 상태 표시는 UIKit으로 대체

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

  // UIKit이 메시지 리스트/입력을 담당하므로 별도 메시지 훅 제거

  const { enterChannelByUrl } = useSendbirdChannel({
    sb,
    user,
    setConnectionError: (error: string) => {
      console.error("채널 에러:", error);
    },
    setChannel,
    setIsChannelReady,
  });

  // 통화 관련 훅 제거

  useEffect(() => {
    if (user && isConnected && channelId && !isChannelReady && sb) {
      enterChannelByUrl(channelId, user);
    }
  }, [user, isConnected, channelId, isChannelReady, sb, enterChannelByUrl]);

  // Calls 초기화/인증 및 수신 콜 핸들링
  useEffect(() => {
    const setupCalls = async () => {
      try {
        if (!APP_ID || !user?.userId) return;
        if (!callsInitializedRef.current) {
          // 동일 앱 ID로 초기화
          try {
            (SendBirdCall as any).init?.(APP_ID);
          } catch {}
          callsInitializedRef.current = true;
        }
        // 인증 (웹은 accessToken 없어도 기본 동작 가능하지만 있으면 전달)
        try {
          await (SendBirdCall as any).authenticate?.({ userId: user.userId, accessToken: (user as any)?.accessToken });
          await (SendBirdCall as any).connectWebSocket?.();
        } catch (e) {
          console.warn("Calls authenticate/connect 실패", e);
        }

        // 수신 콜 리스너 등록 (SDK 권장 방식)
        try {
          if (callsListenerIdRef.current) {
            (SendBirdCall as any).removeListener?.(callsListenerIdRef.current);
          }
          const id = `listener_${Date.now()}`;
          (SendBirdCall as any).addListener?.(id, {
            onRinging: (incoming: any) => {
              setIsIncoming(true);
              setDirectCall(incoming);
              setIsCallUIOpen(true);
              setCallStatus("ringing");
              attachCallListeners(incoming);
            },
          });
          callsListenerIdRef.current = id;
        } catch {}
      } catch (e) {
        console.error("Calls 초기화 오류", e);
      }
    };
    setupCalls();
    return () => {
      try {
        if (callsListenerIdRef.current) {
          (SendBirdCall as any).removeListener?.(callsListenerIdRef.current);
          callsListenerIdRef.current = null;
        }
      } catch {}
    };
  }, [user?.userId]);

  // 포그라운드/백그라운드 감지 → 읽음/배달 표시 UI 제어
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (blurTimerRef.current) {
          clearTimeout(blurTimerRef.current);
          blurTimerRef.current = null;
        }
        setIsForeground(false);
      } else {
        setIsForeground(true);
      }
    };

    const onFocus = () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      setIsForeground(true);
    };

    const onBlur = () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
      }
      // 파일 선택 등 일시적인 blur는 무시하기 위해 지연 후 적용
      blurTimerRef.current = window.setTimeout(() => {
        setIsForeground(false);
        blurTimerRef.current = null;
      }, 1500);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    // 초기 계산
    onVisibilityChange();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };
  }, []);

  const attachCallListeners = (c: any) => {
    try {
      c.onEstablished = () => {
        callEstablishedAtRef.current = Date.now();
        setCallStatus("established");
      };
      c.onConnected = () => {
        callConnectedAtRef.current = Date.now();
        setCallStatus("connected");
        try {
          // 보호적 재연결과 재생
          c.setRemoteMediaView?.(remoteAudioRef.current);
          remoteAudioRef.current?.play?.();
        } catch {}
      };
      c.onEnded = () => {
        setCallStatus("ended");
        setIsCallUIOpen(false);
        setDirectCall(null);
        setIsIncoming(false);
        sendCallLog(c);
      };
    } catch {}
  };

  const startVoiceCall = async () => {
    try {
      if (!channel || !user?.userId) return;
      const members = (channel.members || []) as any[];
      const calleeId = members.find((m) => m.userId !== user.userId)?.userId;
      if (!calleeId) return;
      setIsIncoming(false);
      setCallStatus("dialing");
      await resumeAudioAutoplay();
      try {
        await navigator.mediaDevices?.getUserMedia?.({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          } as MediaTrackConstraints,
        });
      } catch {}
      const newCall = await (SendBirdCall as any).dial?.({
        userId: calleeId,
        isVideoCall: false,
        callOption: {
          audioEnabled: true,
          videoEnabled: false,
          remoteMediaView: remoteAudioRef.current,
        },
      });
      if (newCall) {
        setDirectCall(newCall);
        setIsCallUIOpen(true);
        attachCallListeners(newCall);
        try {
          newCall.setRemoteMediaView?.(remoteAudioRef.current);
        } catch {}
      }
    } catch (e) {
      console.error("dial 실패", e);
      setCallStatus("error");
    }
  };

  const acceptCall = () => {
    try {
      resumeAudioAutoplay();
      directCall?.accept?.({
        callOption: {
          audioEnabled: true,
          videoEnabled: false,
          remoteMediaView: remoteAudioRef.current,
        },
      });
      setCallStatus("connected");
    } catch {}
  };
  const endCall = () => {
    try {
      directCall?.end?.();
    } catch {
    } finally {
      setIsCallUIOpen(false);
      setDirectCall(null);
      setIsIncoming(false);
      if (directCall) {
        sendCallLog(directCall, "local_end");
      }
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      <div className="bg-white shadow-sm border-b px-3 py-2 md:px-6 md:py-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-2xl font-bold text-gray-800">1대1 채팅 (GroupChannel)</h1>

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
        {/* 기존 사용자 연결 상태 블록 제거 (UIKit 구성원 목록으로 대체) */}
      </div>

      <div className="flex-1 min-h-0">
        {APP_ID && isConnected && isChannelReady && sb && user?.userId && (channel?.url || channelId) ? (
          <SendBirdProvider appId={APP_ID as string} sdkInstance={sb as any} userId={user.userId} accessToken={(user as any)?.accessToken || undefined} key={user.userId}>
            <div className="relative flex h-[calc(100vh-120px)] min-w-0">
              <div className="flex-1 min-h-0 min-w-0">
                <Channel
                  channelUrl={(channel?.url as string) || (channelId as string)}
                  key={`${(channel?.url as string) || (channelId as string)}-stable`}
                  isTypingIndicatorEnabled={isForeground}
                  isMessageReceiptStatusEnabled={isForeground}
                  isReactionEnabled={true}
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

      {/* 통화 UI 제거 */}
    </div>
  );
}

function ChannelInfoSheet({ channel, onClose }: { channel: any; onClose: () => void }) {
  const members = (channel?.members || []) as any[];
  const [notify, setNotify] = useState<boolean>(!!channel?.myPushTriggerOption && channel.myPushTriggerOption !== "off");

  const toggleNotify = async () => {
    try {
      const next = notify ? "off" : "all";
      if (typeof channel?.setMyPushTriggerOption === "function") {
        channel.setMyPushTriggerOption(next, (_: any, err: any) => {
          if (!err) setNotify(!notify);
        });
      } else {
        setNotify(!notify);
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex justify-end" onClick={onClose}>
      <div className="relative w-full max-w-sm h-full bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button
          aria-label="close-info"
          title="닫기"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center shadow"
        >
          ✕
        </button>
        <div className="p-4 pt-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar height={40} width={40} src={channel?.coverUrl} />
            <div className="min-w-0">
              <div className="font-semibold truncate">{channel?.name || channel?.url}</div>
              <div className="text-xs text-gray-500 truncate">{channel?.url}</div>
            </div>
          </div>
        </div>

        <div className="p-4 border-b">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={notify} onChange={toggleNotify} /> 알림 On/Off
          </label>
        </div>

        <div className="p-4">
          <div className="text-xs font-semibold text-gray-500 mb-2">멤버</div>
          <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center gap-3">
                <Avatar height={28} width={28} src={m.profileUrl} />
                <div className="min-w-0 text-sm truncate">{m.nickname || m.userId}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CallOverlay({
  isIncoming,
  status,
  onAccept,
  onEnd,
  localRef,
  remoteRef,
}: {
  isIncoming: boolean;
  status: string;
  onAccept: () => void;
  onEnd: () => void;
  localRef: any;
  remoteRef: any;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white shadow-xl rounded-lg p-4 w-80">
        <div className="text-sm text-gray-500 mb-2">{isIncoming ? "수신 통화" : "발신 통화"}</div>
        <div className="text-lg font-semibold mb-4">상태: {status}</div>
        {/* 오디오 요소는 화면에 보이지 않도록 hidden 처리 */}
        <audio ref={localRef} hidden autoPlay />
        <audio ref={remoteRef} hidden autoPlay />
        <div className="flex gap-2 justify-end">
          {isIncoming && (
            <button onClick={onAccept} className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700">
              수락
            </button>
          )}
          <button onClick={onEnd} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">
            종료
          </button>
        </div>
      </div>
    </div>
  );
}
