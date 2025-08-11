import { useState, useCallback } from "react";

interface UseSendbirdMessagesProps {
  sb: any;
  user: any;
  channel: any;
  isChannelReady: boolean;
}

export const useSendbirdMessages = ({ sb, user, channel, isChannelReady }: UseSendbirdMessagesProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentHandlerId, setCurrentHandlerId] = useState<string>("");
  const [readReceipts, setReadReceipts] = useState<{ [key: string]: any[] }>({});

  // 메시지 읽음 상태 업데이트 함수
  const updateMessageReadStatus = useCallback((messageId: string, readReceipt: any) => {
    setReadReceipts((prev) => ({
      ...prev,
      [messageId]: [...(prev[messageId] || []), readReceipt],
    }));
  }, []);

  // 메시지 읽음 처리 함수
  const markMessageAsRead = useCallback(
    (messageId: string) => {
      if (channel && user) {
        channel.markAsRead(messageId, (response: any, error: any) => {
          if (error) {
            console.error("메시지 읽음 처리 실패:", error);
          } else {
            console.log("메시지 읽음 처리 성공:", messageId);
          }
        });
      }
    },
    [channel, user]
  );

  const setupChannelHandler = useCallback(
    (channel: any, user: any) => {
      console.log("=== 채널 핸들러 설정 ===");
      console.log("채널 URL:", channel.url);
      console.log("SendBird 인스턴스:", sb);
      console.log("현재 사용자:", user);

      // 기존 핸들러 제거 (중복 방지)
      if (currentHandlerId) {
        console.log("기존 핸들러 제거:", currentHandlerId);
        sb.removeChannelHandler(currentHandlerId);
      }

      // 실시간 메시지 수신 핸들러
      const handler = new sb.ChannelHandler();

      // 메시지 수신 이벤트 - 더 강력한 디버깅
      handler.onReconnectStarted = () => {
        console.log("재연결 시작");
      };

      handler.onReconnectSucceeded = () => {
        console.log("재연결 성공");
      };

      handler.onReconnectFailed = () => {
        console.log("재연결 실패");
      };

      // 메시지 읽음 이벤트
      handler.onReadReceiptUpdated = (channel: any) => {
        console.log("=== 메시지 읽음 상태 업데이트 ===");
        console.log("채널 URL:", channel.url);

        // 채널의 모든 메시지에 대해 읽음 상태 확인
        if (channel.lastMessage) {
          console.log("마지막 메시지 읽음 상태 업데이트:", channel.lastMessage.messageId);
          // 읽음 상태를 업데이트
          updateMessageReadStatus(channel.lastMessage.messageId, {
            userId: user?.userId,
            timestamp: new Date().toISOString(),
          });
        }
      };

      // 메시지 전송 성공 시 읽음 처리
      handler.onMessageReceived = (channel: any, msg: any) => {
        console.log("=== 메시지 수신 이벤트 ===");
        console.log("채널 URL:", channel.url);
        console.log("메시지 내용:", msg.message);
        console.log("발신자 ID:", msg.sender?.userId);
        console.log("현재 사용자 ID:", user?.userId);
        console.log("메시지 ID:", msg.messageId);
        console.log("메시지 타입:", msg.isUserMessage() ? "사용자 메시지" : msg.isFileMessage?.() ? "파일 메시지" : "시스템 메시지");
        console.log("파일 메시지 여부:", msg.isFileMessage?.() || false);

        // 파일 메시지인 경우 추가 정보 로깅
        if (msg.isFileMessage?.()) {
          console.log("=== 파일 메시지 상세 정보 ===");
          console.log("파일명:", msg.name);
          console.log("파일 크기:", msg.size);
          console.log("MIME 타입:", msg.mimeType);
          console.log("파일 URL:", msg.url);
          console.log("썸네일:", msg.thumbnails);
          console.log("파일 메시지 전체 구조:", msg);
        }

        console.log("메시지 전체 구조:", msg);

        // 모든 메시지를 즉시 추가 (디버깅용)
        setMessages((prev) => {
          const isDuplicate = prev.some((existingMsg) => existingMsg.messageId === msg.messageId);
          if (isDuplicate) {
            console.log("중복 메시지 무시:", msg.messageId);
            return prev;
          }
          console.log("새 메시지 추가:", msg.message || msg.name || "파일 메시지");

          // 파일 메시지인 경우 즉시 추가 (정렬 없이)
          if (msg.isFileMessage?.()) {
            console.log("파일 메시지 즉시 추가:", msg.name);
            return [...prev, msg];
          }

          // 일반 메시지는 시간순으로 정렬
          const newMessages = [...prev, msg].sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return timeA - timeB;
          });
          return newMessages;
        });

        // 내가 보낸 메시지가 아닌 경우 읽음 처리
        if (msg.sender?.userId !== user?.userId) {
          console.log("받은 메시지 읽음 처리:", msg.messageId);
          // 채널의 markAsRead 메서드를 사용하여 읽음 처리
          if (channel && typeof channel.markAsRead === "function") {
            channel.markAsRead((response: any, error: any) => {
              if (error) {
                console.error("메시지 읽음 처리 실패:", error);
              } else {
                console.log("메시지 읽음 처리 성공:", msg.messageId);
              }
            });
          }
        }
      };

      // 채널 입장 이벤트
      handler.onUserEntered = (channel: any, user: any) => {
        console.log("사용자 입장:", user.userId);
      };

      // 채널 퇴장 이벤트
      handler.onUserExited = (channel: any, user: any) => {
        console.log("사용자 퇴장:", user.userId);
      };

      // 핸들러 등록
      sb.addChannelHandler(currentHandlerId, handler);
      console.log("핸들러 등록 완료:", currentHandlerId);
      setCurrentHandlerId(currentHandlerId); // 핸들러 ID 저장

      // 과거 메시지 불러오기
      const query = channel.createPreviousMessageListQuery();
      query.load(20, true, (msgs: any[], error: any) => {
        if (!error && msgs) {
          console.log("과거 메시지 로드:", msgs.length);
          // 사용자 메시지와 파일 메시지 모두 포함
          const allMessages = msgs.filter((msg: any) => msg.isUserMessage() || msg.isFileMessage?.());
          console.log("필터링된 메시지:", allMessages.length);
          console.log("메시지 타입별:", {
            userMessages: allMessages.filter((msg: any) => msg.isUserMessage()).length,
            fileMessages: allMessages.filter((msg: any) => msg.isFileMessage?.()).length,
          });
          // 시간순으로 정렬 (최신 메시지가 맨 아래)
          const sortedMessages = allMessages.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return timeA - timeB;
          });
          setMessages(sortedMessages);
        } else if (error) {
          console.error("과거 메시지 로드 실패:", error);
        }
      });
    },
    [sb, currentHandlerId]
  );

  const sendMessage = useCallback(
    (user: any) => {
      if (!newMessage.trim() || !channel || !isChannelReady) {
        console.log("메시지 전송 조건 확인:", {
          hasMessage: !!newMessage.trim(),
          hasChannel: !!channel,
          isChannelReady,
        });
        return;
      }

      const messageText = newMessage.trim();
      console.log("=== 메시지 전송 시작 ===");
      console.log("전송할 메시지:", messageText);
      console.log("채널 URL:", channel.url);
      console.log("전달받은 사용자 ID:", user?.userId);

      // 입력 필드 즉시 비우기 (UX 개선)
      setNewMessage("");

      // 채널 객체에 sendUserMessage 메서드가 있는지 확인
      if (typeof channel.sendUserMessage !== "function") {
        console.error("❌ 채널 객체에 sendUserMessage 메서드가 없습니다.");
        console.error("채널 객체:", channel);
        console.error("사용 가능한 메서드:", Object.getOwnPropertyNames(channel));
        return;
      }

      channel.sendUserMessage(messageText, (msg: any, error: any) => {
        console.log("=== 메시지 전송 콜백 ===");
        if (!error && msg.isUserMessage()) {
          console.log("메시지 전송 성공:", msg.message);
          console.log("생성된 메시지 ID:", msg.messageId);
          console.log("발신자 ID:", msg.sender?.userId);

          // 전송 성공한 메시지는 이미 핸들러에서 추가되므로 중복 방지
          setMessages((prev) => {
            const isDuplicate = prev.some((existingMsg) => existingMsg.messageId === msg.messageId);
            if (isDuplicate) {
              console.log("전송된 메시지가 이미 있음:", msg.messageId);
              return prev;
            }
            console.log("전송된 메시지 추가:", msg.message);
            // 시간순으로 정렬 (최신 메시지가 맨 아래)
            const newMessages = [...prev, msg].sort((a, b) => {
              const timeA = new Date(a.createdAt).getTime();
              const timeB = new Date(b.createdAt).getTime();
              return timeA - timeB;
            });
            return newMessages;
          });
        } else {
          console.error("메시지 전송 실패:", error);
          console.error("에러 상세:", error?.message, error?.code);
          // 전송 실패 시 입력 필드에 다시 넣기
          setNewMessage(messageText);
          alert("메시지 전송에 실패했습니다. 다시 시도해주세요.");
        }
      });
    },
    [newMessage, channel, isChannelReady]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(user);
      }
    },
    [sendMessage, user]
  );

  return {
    messages,
    newMessage,
    setNewMessage,
    currentHandlerId,
    setupChannelHandler,
    sendMessage,
    handleKeyPress,
    setMessages,
    readReceipts,
    updateMessageReadStatus,
    markMessageAsRead,
  };
};
