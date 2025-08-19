import { useEffect, useRef, useState } from "react";
import SendBirdCall from "sendbird-calls";
import { decryptFromBase64, fromBase64UrlToString } from "../utils/crypto";

type UseCallsAndNotificationsParams = {
  appId?: string;
  sb: any;
  user: any;
  channel: any;
};

/**
 * useCallsAndNotifications
 * - Sendbird Calls 초기화/인증 및 수신/발신 통화 상태를 관리합니다.
 * - 통화 수락/종료, 원격 오디오 참조, 백그라운드 Biztalk 알림 트리거를 제공합니다.
 * - 채널 멤버의 Presence를 주기적으로 확인하여 부재중 상태 알림을 전송합니다.
 */
export function useCallsAndNotifications({ appId, sb, user, channel }: UseCallsAndNotificationsParams) {
  const [directCall, setDirectCall] = useState<any>(null);
  const [isCallUIOpen, setIsCallUIOpen] = useState(false);
  const [callStatus, setCallStatus] = useState<string>("idle");
  const [isIncoming, setIsIncoming] = useState(false);

  const callsInitializedRef = useRef(false);
  const callsReadyRef = useRef(false);
  const callEstablishedAtRef = useRef<number | null>(null);
  const callConnectedAtRef = useRef<number | null>(null);
  const callsListenerIdRef = useRef<string | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringingNotifyIntervalRef = useRef<number | null>(null);
  const callPresenceIntervalRef = useRef<number | null>(null);
  const peerIdRef = useRef<string | null>(null);

  /**
   * 통화 로그를 서버에 전송합니다.
   */
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
        appId: appId,
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

  /**
   * 특정 유저의 Presence(온라인/오프라인, 마지막 접속)를 조회합니다.
   */
  const queryPresence = (sdk: any, pid: string): Promise<{ online: boolean | null; lastSeenAt: number }> => {
    return new Promise((resolve) => {
      try {
        if (!pid || !sdk?.createApplicationUserListQuery) return resolve({ online: null, lastSeenAt: 0 });
        const q = sdk.createApplicationUserListQuery();
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
   * 채널 멤버 중 상대 유저 ID를 추론합니다.
   */
  const getPeerUserId = useRef<null | ((ch?: any) => string | null)>(null);
  if (!getPeerUserId.current) {
    getPeerUserId.current = (ch?: any) => {
      try {
        const urlUserId: string | null = user?.userId || null;
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
   * 상대 유저의 전화번호(암호화 토큰)를 복호화하여 가져옵니다.
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
   * 내(수신자)의 전화번호(암호화 토큰)를 복호화하여 가져옵니다.
   */
  const getSelfPhone = async (): Promise<string | null> => {
    try {
      const selfId = (sb as any)?.currentUser?.userId || user?.userId || null;
      if (!selfId || !selfId.startsWith("user_")) return null;
      const token = selfId.slice(5);
      const maybe = fromBase64UrlToString(token);
      if (!maybe) return null;
      if (maybe.includes(":")) {
        return await decryptFromBase64(maybe);
      }
      return maybe;
    } catch {
      return null;
    }
  };

  /**
   * 수신 벨 알림톡(Biztalk)을 주기적으로 전송하는 루프를 시작합니다. (포그라운드에서는 전송하지 않음)
   */
  const startRingingBiztalkLoop = () => {
    try {
      if (ringingNotifyIntervalRef.current) return;
      const sendOnce = () => {
        try {
          const foreground = document.visibilityState === "visible";
          if (!foreground) {
            (async () => {
              let phoneDecrypted: string | null = null;
              try {
                phoneDecrypted = (await getSelfPhone()) || null;
              } catch {}
              const TEST_PAYLOAD = {
                phnumber: phoneDecrypted || "",
                userid: "naver_test_user_001",
                servicedate: "백그라운드 전화 알림톡",
              } as any;
              fetch("https://elbserver.store/biztalk/sand_elbserver_naver", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(TEST_PAYLOAD),
              }).catch(() => {});
            })();
          }
        } catch {}
      };
      sendOnce();
      ringingNotifyIntervalRef.current = window.setInterval(sendOnce, 10000);
    } catch {}
  };

  /** 중복 전송 루프를 중지합니다. */
  const stopRingingBiztalkLoop = () => {
    try {
      if (ringingNotifyIntervalRef.current) {
        clearInterval(ringingNotifyIntervalRef.current);
        ringingNotifyIntervalRef.current = null;
      }
    } catch {}
  };

  /**
   * 발신 중 상대 Presence를 주기적으로 조회하여 오프라인이면 Biztalk 알림을 전송합니다.
   */
  const startCallPresenceCheckLoop = (peerId: string) => {
    try {
      if (!peerId || !sb) return;
      if (callPresenceIntervalRef.current) return;
      const sendOnce = async () => {
        try {
          const p = await queryPresence(sb, peerId);
          const offlineNow = p.online === false || (p.lastSeenAt > 0 && Date.now() - p.lastSeenAt > 60000);
          if (offlineNow) {
            let phoneDecrypted: string | null = null;
            try {
              phoneDecrypted = (await getPeerPhone.current?.(undefined, peerId)) || null;
            } catch {}
            const TEST_PAYLOAD = {
              phnumber: phoneDecrypted || "",
              userid: "상담중 부재중 전화",
              servicedate: "접속안함 전화 알림톡",
            } as any;
            fetch("https://elbserver.store/biztalk/sand_elbserver_naver", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(TEST_PAYLOAD),
            }).catch(() => {});
          }
        } catch {}
      };
      sendOnce();
      callPresenceIntervalRef.current = window.setInterval(sendOnce, 10000);
    } catch {}
  };

  /** Presence 확인 루프를 중지합니다. */
  const stopCallPresenceCheckLoop = () => {
    try {
      if (callPresenceIntervalRef.current) {
        clearInterval(callPresenceIntervalRef.current);
        callPresenceIntervalRef.current = null;
      }
    } catch {}
  };

  /** 자동 재생 제약 회피를 위해 오디오 컨텍스트/원격 오디오를 재생합니다. */
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
      await remoteAudioRef.current?.play?.();
    } catch {}
  };

  /** 통화 객체에 수명주기 리스너를 부착합니다. */
  const attachCallListeners = (c: any) => {
    try {
      c.onEstablished = () => {
        console.log("[CALL] onEstablished");
        callEstablishedAtRef.current = Date.now();
        setCallStatus("established");
        setIsCallUIOpen(true);
      };
      c.onConnected = () => {
        console.log("[CALL] onConnected");
        callConnectedAtRef.current = Date.now();
        setCallStatus("connected");
        stopRingingBiztalkLoop();
        stopCallPresenceCheckLoop();
        try {
          c.setRemoteMediaView?.(remoteAudioRef.current);
          remoteAudioRef.current?.play?.();
        } catch {}
      };
      c.onEnded = () => {
        try {
          console.log("[CALL] onEnded", { endResult: (c as any)?.endResult });
        } catch {}
        setCallStatus("ended");
        setIsCallUIOpen(false);
        setDirectCall(null);
        setIsIncoming(false);
        stopRingingBiztalkLoop();
        stopCallPresenceCheckLoop();
        sendCallLog(c);
      };
    } catch {}
  };

  /** 음성 통화를 발신합니다. */
  const startVoiceCall = async () => {
    try {
      if (!channel || !user?.userId) return;
      // Calls 준비가 안 되어 있으면 즉시 준비 시도
      if (!callsReadyRef.current) {
        try {
          if (!callsInitializedRef.current && appId) {
            try {
              (SendBirdCall as any).init?.(appId);
            } catch {}
            callsInitializedRef.current = true;
          }
          await (SendBirdCall as any).authenticate?.({ userId: user.userId, accessToken: (user as any)?.accessToken });
          await (SendBirdCall as any).connectWebSocket?.();
          callsReadyRef.current = true;
          console.log("[CALL] prepared calls in startVoiceCall");
        } catch (e) {
          console.warn("[CALL] prepare calls in startVoiceCall failed", e);
        }
      }
      const members = (channel.members || []) as any[];
      const calleeId = members.find((m) => m.userId !== user.userId)?.userId;
      if (!calleeId) return;
      try {
        const peerId = peerIdRef.current || calleeId;
        console.log("[CALL] startVoiceCall", { calleeId, peerId });
        if (peerId && sb) {
          try {
            const p = await queryPresence(sb, peerId);
            const offlineNow = p.online === false || (p.lastSeenAt > 0 && Date.now() - p.lastSeenAt > 60000);
            if (offlineNow) {
              let phoneDecrypted: string | null = null;
              try {
                phoneDecrypted = (await getPeerPhone.current?.(undefined, peerId)) || null;
              } catch {}
              const TEST_PAYLOAD = {
                phnumber: phoneDecrypted || "",
                userid: "상담중 부재중 전화",
                servicedate: "접속안함 전화 알림톡",
              } as any;
              fetch("https://elbserver.store/biztalk/sand_elbserver_naver", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(TEST_PAYLOAD),
              }).catch(() => {});
            }
          } catch {}
          startCallPresenceCheckLoop(peerId);
        }
      } catch {}
      setIsIncoming(false);
      setCallStatus("dialing");
      console.log("[CALL] set status dialing");
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
      console.log("[CALL] dial result", { hasCall: !!newCall });
      if (newCall) {
        setDirectCall(newCall);
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

  /** 수신 통화를 수락합니다. */
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

  /** 통화를 종료합니다. */
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

  /** 상대가 오프라인 상태일 때 알림을 전송합니다. */
  const notifyPeerOfflineIfNeeded = async () => {
    try {
      const peerId = peerIdRef.current || getPeerUserId.current?.() || null;
      if (peerId && sb) {
        const p = await queryPresence(sb, peerId);
        const offlineNow = p.online === false || (p.lastSeenAt > 0 && Date.now() - p.lastSeenAt > 60000);
        if (offlineNow) {
          let phoneDecrypted: string | null = null;
          try {
            phoneDecrypted = (await getPeerPhone.current?.(undefined, peerId)) || null;
          } catch {}
          const TEST_PAYLOAD = {
            phnumber: phoneDecrypted || "",
            userid: "naver_test_user_001",
            servicedate: "접속안함 채팅 알림톡",
          } as any;
          fetch("https://elbserver.store/biztalk/sand_elbserver_naver", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(TEST_PAYLOAD),
          }).catch(() => {});
        }
      }
    } catch {}
  };

  /** 채널 멤버에서 상대 유저 ID를 캐싱합니다. */
  useEffect(() => {
    if (!channel || !user?.userId) return;
    try {
      const members = (channel.members || []) as any[];
      const pid = members.find((m) => m?.userId && m.userId !== user.userId)?.userId || null;
      peerIdRef.current = pid;
    } catch {}
  }, [channel?.url, user?.userId]);

  /** Sendbird Calls 초기화/인증 및 수신 콜(onRinging) 리스너를 등록합니다. */
  useEffect(() => {
    const setupCalls = async () => {
      try {
        if (!appId || !user?.userId) return;
        if (!callsInitializedRef.current) {
          try {
            (SendBirdCall as any).init?.(appId);
          } catch {}
          callsInitializedRef.current = true;
        }
        try {
          await (SendBirdCall as any).authenticate?.({ userId: user.userId, accessToken: (user as any)?.accessToken });
          await (SendBirdCall as any).connectWebSocket?.();
          callsReadyRef.current = true;
        } catch (e) {
          callsReadyRef.current = false;
          console.warn("Calls authenticate/connect 실패", e);
        }

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
                const foreground = document.visibilityState === "visible";
                if (!foreground) {
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
        callsReadyRef.current = false;
      } catch {}
    };
  }, [user?.userId, appId]);

  return {
    directCall,
    isCallUIOpen,
    callStatus,
    isIncoming,
    localAudioRef,
    remoteAudioRef,
    startVoiceCall,
    acceptCall,
    endCall,
    notifyPeerOfflineIfNeeded,
    getSelfPhone,
  };
}
