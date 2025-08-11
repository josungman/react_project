import { useState, useCallback } from "react";
import { generateChatUrls } from "../utils/sendbirdUtils";

interface UseChatCreationProps {
  user: any;
  sb: any;
  enterChannelByUrl: (channelUrl: string, user: any) => void;
}

export const useChatCreation = ({ user, sb: _unusedSb, enterChannelByUrl }: UseChatCreationProps) => {
  const [chatUrls, setChatUrls] = useState<any>(null);
  const [showChatUrls, setShowChatUrls] = useState(false);
  const [currentChannelUrl, setCurrentChannelUrl] = useState<string>("");

  const createNewChat = useCallback(() => {
    const userId = user?.userId || `user_${Date.now()}`;
    const urls = generateChatUrls(userId);
    setChatUrls(urls);
    setShowChatUrls(true);

    // 첫 번째 채널로 입장
    setCurrentChannelUrl(urls.channelUrl);
    enterChannelByUrl(urls.channelUrl, user);
  }, [user, enterChannelByUrl]);

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
