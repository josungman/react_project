import { useEffect, useState } from "react";
import Avatar from "@sendbird/uikit-react/ui/Avatar";

/**
 * ChannelInfoSheet
 * - 현재 채널의 기본 정보를 표시하고, 알림 on/off를 토글할 수 있는 사이드 시트입니다.
 */
export default function ChannelInfoSheet({ channel, onClose }: { channel: any; onClose: () => void }) {
  const members = (channel?.members || []) as any[];
  const [description, setDescription] = useState<string>("");

  // 채팅방 메타데이터/데이터에서 설명을 로드
  useEffect(() => {
    let active = true;
    const fromData = () => {
      try {
        const raw = channel?.data;
        if (typeof raw === "string" && raw.trim()) {
          const parsed = JSON.parse(raw);
          const desc = typeof parsed?.description === "string" ? parsed.description : "";
          if (active && desc) setDescription(desc);
        }
      } catch {}
    };

    const fromMetadata = async () => {
      try {
        if (typeof channel?.getAllMetaData === "function") {
          channel.getAllMetaData((meta: Record<string, string> | undefined, err: any) => {
            if (!active || err || !meta) return fromData();
            const desc = typeof meta.description === "string" ? meta.description : "";
            if (desc) setDescription(desc);
            else fromData();
          });
          return;
        }
        if (typeof channel?.getMetaData === "function") {
          channel.getMetaData(["description"], (meta: Record<string, string> | undefined, err: any) => {
            if (!active || err || !meta) return fromData();
            const desc = typeof meta.description === "string" ? meta.description : "";
            if (desc) setDescription(desc);
            else fromData();
          });
          return;
        }
        fromData();
      } catch {
        fromData();
      }
    };

    fromMetadata();
    return () => {
      active = false;
    };
  }, [channel?.url]);

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
              <div className="font-semibold truncate">채팅방</div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-500 mb-1">설명</div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap break-words min-h-[1.25rem]">{description || "등록된 설명이 없습니다."}</div>
          </div>
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
