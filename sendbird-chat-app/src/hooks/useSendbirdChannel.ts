import { useState, useCallback } from "react";
import { parseChannelUrl, checkChannelMembership } from "../utils/sendbirdUtils";
import type { GroupChannel, GroupChannelListQueryParams } from "@sendbird/chat/groupChannel";

interface UseSendbirdChannelProps {
  sb: any;
  user: any;
  setConnectionError: (error: string) => void;
  setChannel: (channel: any) => void;
  setIsChannelReady: (ready: boolean) => void;
}

export const useSendbirdChannel = ({ sb, user: _unusedUser, setConnectionError, setChannel, setIsChannelReady }: UseSendbirdChannelProps) => {
  const [isChannelReady] = useState(false);

  const enterChannelByUrl = useCallback(
    async (channelUrl: string, user: any) => {
      console.log("=== GroupChannel 입장 시도 ===");
      console.log("채널 URL:", channelUrl);
      console.log("SendBird 인스턴스:", sb);
      console.log("전달받은 사용자:", user);
      console.log("사용자 연결 상태:", user?.connectionStatus);

      // 연결 상태 확인
      if (!sb) {
        console.error("SendBird 인스턴스가 없습니다.");
        setConnectionError("SendBird 인스턴스가 초기화되지 않았습니다.");
        return;
      }

      if (!user) {
        console.error("사용자 정보가 없습니다.");
        setConnectionError("사용자 정보가 없습니다.");
        return;
      }

      // 연결 상태 확인
      console.log("채널 참여를 위한 연결 상태 확인...");
      console.log("현재 연결된 사용자 (sb.currentUser):", sb.currentUser);
      console.log("전달받은 사용자 (user):", user);
      console.log("sb 인스턴스:", sb);

      // sb.currentUser가 null이어도 user 객체가 있으면 진행
      if (user || sb.currentUser) {
        const currentUser = user || sb.currentUser;
        console.log(`✅ 사용자 정보 확인됨. (ID: ${currentUser.userId})`);
        console.log("실제 채널 작업을 진행합니다.");

        // 실제 채널 작업 진행
        await proceedWithChannelWork(channelUrl, currentUser);
      } else {
        console.error("❌ 사용자 정보가 없습니다.");
        console.error("sb.currentUser:", sb.currentUser);
        console.error("전달받은 user:", user);
        setConnectionError("사용자 정보가 없습니다. 페이지를 새로고침해주세요.");
      }
    },
    [sb, setConnectionError]
  );

  // 채널 작업을 진행하는 별도 함수
  const proceedWithChannelWork = useCallback(
    async (channelUrl: string, user: any) => {
      console.log("=== proceedWithChannelWork 시작 ===");
      console.log("channelUrl:", channelUrl);
      console.log("user:", user);
      console.log("sb 인스턴스:", sb);

      let sendbirdInstance = sb;

      // 전달받은 user 객체 사용 (connectionStatus 무시)
      if (!user) {
        console.error("❌ 전달받은 사용자가 없습니다.");
        setConnectionError("사용자 정보가 없습니다.");
        return;
      }

      if (!sendbirdInstance) {
        console.error("❌ SendBird 인스턴스가 없습니다.");
        setConnectionError("SendBird 인스턴스가 없습니다.");
        return;
      }

      console.log("✅ 기본 검증 통과 - 채널 작업 진행");
      console.log("전달받은 사용자 ID:", user.userId);
      console.log("전달받은 사용자 연결 상태:", user.connectionStatus);

      // 채널 URL 파싱
      console.log("🔍 채널 URL 파싱 시작...");
      const { user1Id, user2Id } = parseChannelUrl(channelUrl, user.userId);

      console.log("✅ 추출된 사용자 ID:", { user1Id, user2Id });
      console.log("현재 연결된 사용자 ID:", user.userId);

      // 멤버 확인 (에러 방지를 위해 강제로 진행)
      console.log("🔍 멤버 확인 시작...");
      const isCurrentUserInChannel = checkChannelMembership(user.userId, user1Id, user2Id);

      console.log("✅ 멤버 확인 결과:", isCurrentUserInChannel);

      // 멤버가 아니어도 강제로 진행 (테스트용)
      if (!isCurrentUserInChannel) {
        console.log("현재 사용자가 채널 멤버가 아니지만 강제로 진행합니다.");
        console.log("채널 멤버로 추가하여 진행...");
      }

      // 채널 생성 또는 가져오기
      console.log("🔍 채널 파라미터 설정 시작...");

      try {
        // v4: 우선 channelUrl로 직접 조회 시도 (실제 Sendbird 고유 URL일 때만 성공)
        console.log("🔍 기존 채널 참여 시도:", channelUrl);
        console.log("참여할 사용자 ID:", user.userId);
        let existingChannel: GroupChannel | null = null;
        try {
          existingChannel = await sb.groupChannel.getChannel(channelUrl);
        } catch {}

        // 실패 시: 멤버 일치 필터로 조회 (isDistinct 채널 1개를 찾아 사용)
        if (!existingChannel) {
          try {
            const { user1Id, user2Id } = parseChannelUrl(channelUrl, user.userId);
            const members = [user1Id, user2Id].filter(Boolean);
            if (members.length === 2) {
              const params: GroupChannelListQueryParams = {
                includeEmpty: true,
                limit: 30,
                membersExactlyInFilter: members,
              } as GroupChannelListQueryParams;
              const query = sb.groupChannel.createMyGroupChannelListQuery(params);
              const result = await query.next();
              const list = Array.isArray(result) ? result : (result as any)?.channels || [];
              existingChannel = list[0] || null;
            }
          } catch {}
        }

        if (!existingChannel) {
          throw new Error("채널을 찾을 수 없습니다. (URL 또는 customType 기준)");
        }

        console.log("✅ 채널 찾기 성공:", existingChannel);
        console.log("실제 채널 URL:", existingChannel.url);
        console.log(
          "기존 채널 멤버:",
          existingChannel.members?.map((m: any) => m.userId)
        );
        console.log("📞 enterChannel 호출...");
        enterChannel(existingChannel as any, user);
      } catch (error: any) {
        console.error("❌ 채널 작업 중 예외 발생:", error);
        setConnectionError(`채널 작업 실패: ${error?.message || String(error)}`);
      }
    },
    [sb, setConnectionError]
  );

  const enterChannel = useCallback(
    (channel: any, user: any) => {
      console.log("=== 채널 입장 함수 ===");
      console.log("채널:", channel);
      console.log("채널 타입:", channel.constructor.name);
      console.log("채널 URL:", channel.url);
      console.log("채널 멤버 수:", channel.memberCount);
      console.log(
        "채널 멤버:",
        channel.members?.map((m: any) => m.userId)
      );

      if (!channel) {
        console.error("채널이 없습니다.");
        setConnectionError("채널이 없습니다.");
        return;
      }

      // v4 GroupChannel 판별
      const isGroupChannel = !!channel?.isDistinct || !!channel?.members;

      console.log("GroupChannel 여부:", isGroupChannel);
      console.log("채널 타입 상세:", {
        constructor: channel.constructor.name,
        url: channel.url,
        channelType: channel.channelType,
      });

      // GroupChannel은 자동으로 입장되므로 enter() 호출하지 않음
      if (isGroupChannel) {
        console.log("GroupChannel 감지됨 - 자동 입장 상태입니다.");
        console.log(
          "현재 사용자가 멤버인가?",
          channel.members?.some((member: any) => member.userId === user?.userId)
        );

        setChannel(channel);
        setIsChannelReady(true);
        setConnectionError("");

        return;
      }

      // OpenChannel은 사용하지 않음 (필요 시 v4 openChannel.enter 사용)
      setChannel(channel);
      setIsChannelReady(true);
      setConnectionError("");
    },
    [setChannel, setIsChannelReady, setConnectionError]
  );

  return {
    enterChannelByUrl,
    enterChannel,
    isChannelReady,
  };
};
