import { useState } from "react";
import Avatar from "@sendbird/uikit-react/ui/Avatar";

/**
 * ChannelInfoSheet
 * - 현재 채널의 기본 정보를 표시하고, 알림 on/off를 토글할 수 있는 사이드 시트입니다.
 */
export default function ChannelInfoSheet({ channel, onClose }: { channel: any; onClose: () => void }) {
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
