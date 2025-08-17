import { useState, useCallback } from "react";
import { generateChatUrls } from "../utils/sendbirdUtils";

interface UseChatCreationProps {
  user: any;
  sb: any;
  enterChannelByUrl: (channelUrl: string, user: any) => void;
}

/**
 * useChatCreation
 * - 테스트용 채팅 URL을 생성하고, 즉시 첫 채널에 입장합니다.
 * - 복사/표시 상태를 포함한 생성 UI 상태를 제공합니다.
 */
export const useChatCreation = ({ user, sb: _unusedSb, enterChannelByUrl }: UseChatCreationProps) => {
  const [chatUrls, setChatUrls] = useState<any>(null);
  const [showChatUrls, setShowChatUrls] = useState(false);
  const [currentChannelUrl, setCurrentChannelUrl] = useState<string>("");

  /** 새로운 테스트 채팅을 생성하고 첫 번째 URL로 입장합니다. */
  const createNewChat = useCallback(() => {
    const userId = user?.userId || `user_${Date.now()}`;
    const urls = generateChatUrls(userId);
    setChatUrls(urls);
    setShowChatUrls(true);

    // 첫 번째 채널로 입장
    setCurrentChannelUrl(urls.channelUrl);
    enterChannelByUrl(urls.channelUrl, user);
  }, [user, enterChannelByUrl]);

  /** 텍스트를 클립보드에 복사하는 헬퍼 */
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("URL이 클립보드에 복사되었습니다!");
    });
  }, []);

  return {
    chatUrls,
    showChatUrls,
    currentChannelUrl,
    createNewChat,
    copyToClipboard,
  };
};
