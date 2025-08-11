import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useSendbirdConnection } from "../hooks/useSendbirdConnection";
import { useSendbirdChannel } from "../hooks/useSendbirdChannel";
// 통화 관련 훅/컴포넌트 제거
import { SendBirdProvider, Channel } from "@sendbird/uikit-react";
import Avatar from "@sendbird/uikit-react/ui/Avatar";
import MessageContent from "@sendbird/uikit-react/ui/MessageContent";
import { MessageMenu } from "@sendbird/uikit-react/ui/MessageMenu";
import "@sendbird/uikit-react/dist/index.css";

const APP_ID = import.meta.env.VITE_SENDBIRD_APP_ID;

export default function SendbirdChat() {
  const { channelId } = useParams();
  const [searchParams] = useSearchParams();
  const urlUserId = searchParams.get("user");

  const [channel, setChannel] = useState<any>(null);
  const [isChannelReady, setIsChannelReady] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
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

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <div className="bg-white shadow-sm border-b px-3 py-2 md:px-6 md:py-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-2xl font-bold text-gray-800">1대1 채팅 (GroupChannel)</h1>
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
            <div className="relative flex h-[calc(100vh-120px)]">
              <div className="flex-1 min-h-0 overflow-hidden">
                <Channel
                  channelUrl={(channel?.url as string) || (channelId as string)}
                  key={(channel?.url as string) || (channelId as string)}
                  isTypingIndicatorEnabled={true}
                  isMessageReceiptStatusEnabled={true}
                  isReactionEnabled={true}
                  renderChannelHeader={() => null}
                  renderMessageContent={(contentProps: any) => (
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
                  )}
                />
              </div>
              {isInfoOpen && <ChannelInfoSheet channel={channel} onClose={() => setIsInfoOpen(false)} />}
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
      <div className="w-full max-w-sm h-full bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar height={40} width={40} src={channel?.coverUrl} />
            <div className="min-w-0">
              <div className="font-semibold truncate">{channel?.name || channel?.url}</div>
              <div className="text-xs text-gray-500 truncate">{channel?.url}</div>
            </div>
          </div>
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            닫기
          </button>
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
