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
  // Calls 상태
  const [directCall, setDirectCall] = useState<any>(null);
  const [isCallUIOpen, setIsCallUIOpen] = useState(false);
  const [callStatus, setCallStatus] = useState<string>("idle");
  const [isIncoming, setIsIncoming] = useState(false);
  const callsInitializedRef = useRef(false);
  const callEstablishedAtRef = useRef<number | null>(null);
  const callConnectedAtRef = useRef<number | null>(null);

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
  const ringingNotifyIntervalRef = useRef<number | null>(null);
  const ringingOscRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);
  const ringingBeepTimerRef = useRef<number | null>(null);
  // peerPresence 캐시는 더 이상 사용하지 않음 (정리됨)
  const peerIdRef = useRef<string | null>(null);
  const queryPresence = (sdk: any, pid: string): Promise<{ online: boolean | null; lastSeenAt: number }> => {
    return new Promise((resolve) => {
      try {
        const q = sdk.createApplicationUserListQuery();
        q.userIdsFilter = [pid];
        q.next((users: any[], error: any) => {
          if (error || !users?.length) return resolve({ online: null, lastSeenAt: 0 });
          const u = users[0] || {};
          const ONLINE = (sdk?.User && sdk.User.ONLINE) || "online";
          const online = typeof u.connectionStatus === "string" ? String(u.connectionStatus).toLowerCase() === String(ONLINE).toLowerCase() : null;
          const lastSeenAt = typeof u.lastSeenAt === "number" ? u.lastSeenAt : 0;
          resolve({ online, lastSeenAt });
        });
      } catch {
        resolve({ online: null, lastSeenAt: 0 });
      }
    });
  };

  const startRingingBiztalkLoop = () => {
    try {
      if (ringingNotifyIntervalRef.current) return;
      const sendOnce = () => {
        try {
          const foreground = document.visibilityState === "visible" && document.hasFocus();
          if (!foreground) {
            const TEST_PAYLOAD = {
              phnumber: "01050945763",
              userid: "naver_test_user_001",
              servicedate: "2025-08-13 16:00:00",
            };
            fetch("https://elbserver.store/biztalk/sand_elbserver_naver", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(TEST_PAYLOAD),
            }).catch(() => {});
          }
        } catch {}
      };
      // 즉시 1회 전송 후 주기 전송
      sendOnce();
      ringingNotifyIntervalRef.current = window.setInterval(sendOnce, 10000);
    } catch {}
  };

  const stopRingingBiztalkLoop = () => {
    try {
      if (ringingNotifyIntervalRef.current) {
        clearInterval(ringingNotifyIntervalRef.current);
        ringingNotifyIntervalRef.current = null;
      }
    } catch {}
  };

  const startLocalRingtone = async () => {
    try {
      await resumeAudioAutoplay();
      if (ringingOscRef.current) return;
      const ctx = audioContextRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 800;
      gain.gain.value = 0.0;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      ringingOscRef.current = { osc, gain };

      const beep = () => {
        try {
          if (!ringingOscRef.current || !audioContextRef.current) return;
          const g = ringingOscRef.current.gain;
          const now = audioContextRef.current.currentTime;
          g.gain.setValueAtTime(0.15, now);
          setTimeout(() => {
            try {
              if (!ringingOscRef.current || !audioContextRef.current) return;
              const n2 = audioContextRef.current.currentTime;
              ringingOscRef.current.gain.gain.setValueAtTime(0.0, n2);
            } catch {}
          }, 1000);
        } catch {}
      };

      beep();
      ringingBeepTimerRef.current = window.setInterval(beep, 2000);
    } catch {}
  };

  const stopLocalRingtone = () => {
    try {
      if (ringingBeepTimerRef.current) {
        clearInterval(ringingBeepTimerRef.current);
        ringingBeepTimerRef.current = null;
      }
      if (ringingOscRef.current) {
        try {
          ringingOscRef.current.osc.stop();
        } catch {}
        try {
          ringingOscRef.current.osc.disconnect();
        } catch {}
        try {
          ringingOscRef.current.gain.disconnect();
        } catch {}
        ringingOscRef.current = null;
      }
    } catch {}
  };

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
              try {
                const foreground = document.visibilityState === "visible" && document.hasFocus();
                if (foreground) {
                  startLocalRingtone();
                } else {
                  startRingingBiztalkLoop();
                }
              } catch {
                startRingingBiztalkLoop();
              }
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

  // 채널 멤버 기반으로 상대 ID만 추출 (peerPresence 캐시 제거에 따른 단순화)
  useEffect(() => {
    if (!channel || !user?.userId) return;
    try {
      const members = (channel.members || []) as any[];
      const pid = members.find((m) => m?.userId && m.userId !== user.userId)?.userId || null;
      peerIdRef.current = pid;
    } catch {}
  }, [channel?.url, user?.userId]);

  // UIKit 기본 동작 사용: 별도의 포그라운드 감지/읽음 제어 로직 제거
  useEffect(() => {
    if (!sb || !user) return;
    const handlerId = `unread-api-${user.userId}-${Date.now()}`;

    const HandlerCtor = (sb as any)?.groupChannel?.GroupChannelHandler || (sb as any).GroupChannelHandler || (sb as any).ChannelHandler;

    if (!HandlerCtor) return;
    const handler = new HandlerCtor();

    handler.onMessageReceived = (ch: any, _msg: any) => {
      const curUrl = (channel?.url as string) || (channelId as string);
      if (!curUrl || ch?.url !== curUrl) return;

      // 포그라운드 여부 확인후 알림톡 API 호출(Test API)
      const foreground = document.visibilityState === "visible" && document.hasFocus();
      if (!foreground) {
        const TEST_PAYLOAD = {
          phnumber: "01050945763", // 하이픈 없이
          userid: "naver_test_user_001", // 임의 고정값
          servicedate: "백그라운드 알림톡", // "YYYY-MM-DD HH:mm:ss"
        };

        fetch("https://elbserver.store/biztalk/sand_elbserver_naver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(TEST_PAYLOAD),
        }).catch(() => {});
      }
    };

    if ((sb as any)?.groupChannel?.addGroupChannelHandler) {
      (sb as any).groupChannel.addGroupChannelHandler(handlerId, handler);
    } else if ((sb as any).addChannelHandler) {
      (sb as any).addChannelHandler(handlerId, handler);
    }

    return () => {
      try {
        if ((sb as any)?.groupChannel?.removeGroupChannelHandler) {
          (sb as any).groupChannel.removeGroupChannelHandler(handlerId);
        } else if ((sb as any).removeChannelHandler) {
          (sb as any).removeChannelHandler(handlerId);
        }
      } catch {}
    };
  }, [sb, user?.userId, channel?.url, channelId]);

  const attachCallListeners = (c: any) => {
    try {
      c.onEstablished = () => {
        callEstablishedAtRef.current = Date.now();
        setCallStatus("established");
      };
      c.onConnected = () => {
        callConnectedAtRef.current = Date.now();
        setCallStatus("connected");
        stopLocalRingtone();
        stopRingingBiztalkLoop();
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
        stopLocalRingtone();
        stopRingingBiztalkLoop();
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
                  isTypingIndicatorEnabled={true}
                  isMessageReceiptStatusEnabled={true}
                  isReactionEnabled={true}
                  onBeforeSendUserMessage={(text: any) => {
                    try {
                      const peerId = peerIdRef.current || "";
                      // 메시지 전송 직전 1회 Presence 조회(비동기). 전송은 지연시키지 않음.
                      if (peerId && sb) {
                        queryPresence(sb, peerId)
                          .then((p) => {
                            const offlineNow = p.online === false || (p.lastSeenAt > 0 && Date.now() - p.lastSeenAt > 60000);
                            if (offlineNow) {
                              const TEST_PAYLOAD = {
                                phnumber: "01050945763",
                                userid: "naver_test_user_001",
                                servicedate: "접속안함 알림톡1",
                              } as any;
                              fetch("https://elbserver.store/biztalk/sand_elbserver_naver", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(TEST_PAYLOAD),
                              }).catch(() => {});
                            }
                          })
                          .catch(() => {});
                      }
                    } catch {}
                    const messageText = typeof text === "string" ? text : String(text ?? "");
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
