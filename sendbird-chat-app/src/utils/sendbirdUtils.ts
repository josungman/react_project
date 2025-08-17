// SendBird 관련 유틸리티 함수들

// 1대1 채팅 채널 URL 생성 함수
/** 두 사용자 ID로 항상 동일한 1:1 채널 URL을 생성합니다. */
export const createOneToOneChannelUrl = (user1Id: string, user2Id: string) => {
  // 더 간단하고 확실한 방법으로 채널 ID 생성
  // 두 사용자 ID를 정렬하여 항상 같은 채널 ID 생성
  const sortedIds = [user1Id, user2Id].sort();
  return `group_chat_${sortedIds[0]}_${sortedIds[1]}`;
};

// 채팅 URL 생성 함수
/** 테스트용 간단한 사용자 ID로 채팅 URL 세트를 생성합니다. */
export const generateChatUrls = (_unusedUserId: string) => {
  const timestamp = Date.now();
  // 더 간단한 사용자 ID 생성
  const user1Id = `user1_${timestamp}`;
  const user2Id = `user2_${timestamp + 1}`;

  // 같은 채널 ID 생성
  const channelUrl = createOneToOneChannelUrl(user1Id, user2Id);

  // 현재 도메인과 포트를 가져와서 풀 경로 생성
  const currentOrigin = window.location.origin;
  console.log("현재 origin:", currentOrigin);
  console.log("window.location:", window.location);
  console.log("생성될 URL1:", `${currentOrigin}/chat/${channelUrl}?user=${user1Id}`);
  console.log("생성될 URL2:", `${currentOrigin}/chat/${channelUrl}?user=${user2Id}`);

  return {
    user1Id,
    user2Id,
    channelUrl,
    // 풀 경로로 URL 생성
    url1: `${currentOrigin}/chat/${channelUrl}?user=${user1Id}`,
    url2: `${currentOrigin}/chat/${channelUrl}?user=${user2Id}`,
  };
};

// URL에서 채널 ID 추출 함수
// 사용되지 않는 보조/테스트 함수들은 제거했습니다.

// 채널 URL 파싱 함수
/**
 * 채널 URL에서 예상되는 사용자 ID 두 개를 추출합니다.
 * - 지원하지 않는 형식은 강제로 현재 사용자와 임시 사용자로 매핑합니다.
 */
export const parseChannelUrl = (channelUrl: string, currentUserId: string) => {
  console.log("채널 URL:", channelUrl);

  let user1Id: string | undefined;
  let user2Id: string | undefined;

  // 형식: group_chat_user_<ID1>_user_<ID2>  (ID는 base64url 가능 → '_' 포함될 수 있음)
  if (channelUrl.startsWith("group_chat_")) {
    try {
      let rest = channelUrl.slice("group_chat_".length); // user_<ID1>_user_<ID2>
      if (rest.startsWith("user_")) rest = rest.slice(5); // <ID1>_user_<ID2>
      const sep = "_user_";
      const idx = rest.indexOf(sep);
      if (idx > 0) {
        user1Id = "user_" + rest.slice(0, idx);
        user2Id = "user_" + rest.slice(idx + sep.length);
        console.log("정규 채널 URL 형식 감지:", { user1Id, user2Id });
      }
    } catch {}
  } else if (channelUrl.startsWith("manual_")) {
    // 형식: manual_group_777 (고정 테스트용)
    user1Id = currentUserId; // 현재 사용자의 실제 ID를 사용
    user2Id = `test_user2_${Date.now()}`;
    console.log("고정 테스트 채널입니다. 현재 사용자 ID 사용:", { user1Id, user2Id });
  } else if (channelUrl === "general_chat") {
    // 기본 채널인 경우
    user1Id = currentUserId;
    user2Id = `general_user_${Date.now()}`;
    console.log("기본 채널입니다. 현재 사용자 ID 사용:", { user1Id, user2Id });
  } else {
    // 지원하지 않는 형식이지만 강제로 처리
    console.log("지원하지 않는 채널 URL 형식이지만 강제로 처리합니다:", channelUrl);
    user1Id = currentUserId;
    user2Id = `fallback_user_${Date.now()}`;
    console.log("강제 처리 결과:", { user1Id, user2Id });
  }

  return { user1Id: user1Id as string, user2Id: user2Id as string };
};

// 멤버 확인 함수
/** 현재 사용자가 추출된 멤버 둘 중 하나인지 확인합니다. */
export const checkChannelMembership = (currentUserId: string, user1Id: string, user2Id: string) => {
  const isCurrentUserInChannel = currentUserId === user1Id || currentUserId === user2Id;
  console.log("현재 사용자가 채널 멤버인가?", isCurrentUserInChannel);
  console.log("비교 결과:", {
    currentUser: currentUserId,
    user1Id,
    user2Id,
    matchesUser1: currentUserId === user1Id,
    matchesUser2: currentUserId === user2Id,
  });

  return isCurrentUserInChannel;
};
