import { useEffect } from "react";

/**
 * useMessageBackgroundNotify
 * - 현재 채널로 수신된 메시지를 감지하고, 브라우저가 백그라운드 상태일 때 Biztalk 알림을 전송합니다.
 */
export function useMessageBackgroundNotify({ sb, user, channel, channelId, getSelfPhone }: any) {
  useEffect(() => {
    if (!sb || !user) return;
    const handlerId = `group-handler-${user.userId}-${Date.now()}`;
    const HandlerCtor = (sb as any).ChannelHandler || (sb as any).GroupChannelHandler || (sb as any)?.groupChannel?.GroupChannelHandler;
    if (!HandlerCtor) {
      console.warn("[SB][handler] no HandlerCtor available on v3 sdk");
      return;
    }
    const handler = new HandlerCtor();

    handler.onMessageReceived = (ch: any, _msg: any) => {
      const curUrl = (channel?.url as string) || (channelId as string);
      if (!curUrl || ch?.url !== curUrl) return;

      const foreground = document.visibilityState === "visible";
      console.log("[SB][recv] msg", { curUrl, ch: ch?.url, foreground });
      if (!foreground) {
        (async () => {
          let phoneDecrypted: string | null = null;
          try {
            phoneDecrypted = (await getSelfPhone()) || null;
          } catch {}
          const TEST_PAYLOAD = {
            phnumber: phoneDecrypted || "",
            userid: "채팅 부재 알림톡",
            servicedate: "백그라운드 채팅 알림톡",
          } as any;
          console.log("[SB][recv] send bg", TEST_PAYLOAD);
          fetch("https://elbserver.store/biztalk/sand_elbserver_naver", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(TEST_PAYLOAD),
          }).catch(() => {});
        })();
      }
    };

    if ((sb as any)?.addChannelHandler) {
      (sb as any).addChannelHandler(handlerId, handler);
      console.log("[SB][handler] addChannelHandler", handlerId);
    } else if ((sb as any)?.groupChannel?.addGroupChannelHandler) {
      (sb as any).groupChannel.addGroupChannelHandler(handlerId, handler);
      console.log("[SB][handler] addGroupChannelHandler", handlerId);
    }

    return () => {
      try {
        if ((sb as any)?.removeChannelHandler) {
          (sb as any).removeChannelHandler(handlerId);
          console.log("[SB][handler] removeChannelHandler", handlerId);
        } else if ((sb as any)?.groupChannel?.removeGroupChannelHandler) {
          (sb as any).groupChannel.removeGroupChannelHandler(handlerId);
          console.log("[SB][handler] removeGroupChannelHandler", handlerId);
        }
      } catch {}
    };
  }, [sb, user?.userId, channel?.url, channelId, getSelfPhone]);
}
