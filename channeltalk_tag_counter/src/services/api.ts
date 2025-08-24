// API 서비스 - DB에서 데이터를 가져오는 함수들
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Day.js 플러그인 설정
dayjs.extend(utc);
dayjs.extend(timezone);

export interface TagData {
  [key: string]: string;
}

export interface TagCount {
  tag: string;
  leftCount: number;
  rightCount: number;
  displayCount: number; // 화면에 표시할 값
}

export interface ExcludedTagInfo {
  tag: string;
  leftCount: number;
  rightCount: number;
}

export interface ApiResponse {
  success: boolean;
  data?: TagData;
  error?: string;
}

export interface TagCountResponse {
  success: boolean;
  data?: TagCount[];
  originalData?: any;
  error?: string;
}

export interface ExcludedTagsResponse {
  success: boolean;
  data?: string[];
  error?: string;
}

export interface ExcludedTagsWithValuesResponse {
  success: boolean;
  data?: ExcludedTagInfo[];
  error?: string;
}

// 실제 API 엔드포인트 URL (환경변수로 관리)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://elbserver.store";
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://dev-api.elbserver.store"; //test서버

// 오늘 날짜의 태그 데이터를 가져오는 함수
export const fetchTodayTagData = async (): Promise<ApiResponse> => {
  try {
    // Day.js를 사용한 한국 시간 기준 오늘 날짜 계산
    const today = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");

    console.log("📅 오늘 날짜 (한국 시간):", today);

    const url = `${API_BASE_URL}/channel_talk/tags/today?date=${today}`;
    console.log("🌐 fetchTodayTagData URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("📡 fetchTodayTagData 응답 상태:", response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📡 fetchTodayTagData 응답 데이터:", data);
    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error("❌ 태그 데이터 가져오기 실패:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
};

// TagCount 형식으로 데이터를 가져오는 함수
export const fetchTagCounts = async (): Promise<TagCountResponse> => {
  console.log("🔄 fetchTagCounts 함수 시작 - api.ts");
  try {
    console.log("📡 fetchTodayTagData 호출");
    const response = await fetchTodayTagData();
    console.log("📡 fetchTodayTagData 응답:", response);

    if (!response.success || !response.data) {
      throw new Error(response.error || "API에서 데이터를 가져오는데 실패했습니다.");
    }

    // TagData를 TagCount[] 형식으로 변환
    console.log("🔄 TagData를 TagCount[] 형식으로 변환 중...");
    const tagCounts: TagCount[] = Object.entries(response.data)
      .map(([tag, countStr]) => {
        const [leftCount, rightCount] = countStr.split("/").map((val) => (val === "error" ? 0 : parseInt(val) || 0));
        return {
          tag,
          leftCount,
          rightCount,
          displayCount: rightCount, // 기본값은 오른쪽 기준 (전체 기준)
        };
      })
      .sort((a, b) => b.displayCount - a.displayCount);

    console.log("✅ 변환 완료된 tagCounts:", tagCounts);
    return {
      success: true,
      data: tagCounts,
      originalData: response.data,
    };
  } catch (error) {
    console.error("❌ 태그 카운트 데이터 가져오기 실패:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
};

// 제외 태그 목록을 가져오는 함수
export const fetchExcludedTags = async (): Promise<ExcludedTagsResponse> => {
  try {
    const url = `${API_BASE_URL}/channel_talk/tags/excluded`;
    console.log("🌐 fetchExcludedTags URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("📡 fetchExcludedTags 응답 상태:", response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📡 fetchExcludedTags 응답 데이터:", data);
    return {
      success: true,
      data: data.excludedTags || [],
    };
  } catch (error) {
    console.error("❌ 제외 태그 목록 가져오기 실패:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
};

// 제외 태그 추가 함수
export const addExcludedTag = async (tag: string): Promise<ExcludedTagsResponse> => {
  try {
    const url = `${API_BASE_URL}/channel_talk/tags/excluded`;
    const requestBody = { tag };
    console.log("🌐 addExcludedTag URL:", url);
    console.log("📤 addExcludedTag 요청 데이터:", requestBody);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("📡 addExcludedTag 응답 상태:", response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📡 addExcludedTag 응답 데이터:", data);
    return {
      success: true,
      data: data.excludedTags || [],
    };
  } catch (error) {
    console.error("❌ 제외 태그 추가 실패:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
};

// 제외 태그 삭제 함수
export const removeExcludedTag = async (tag: string): Promise<ExcludedTagsResponse> => {
  try {
    const url = `${API_BASE_URL}/channel_talk/tags/excluded`;
    const requestBody = { tag };
    console.log("🌐 removeExcludedTag URL:", url);
    console.log("📤 removeExcludedTag 요청 데이터:", requestBody);

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("📡 removeExcludedTag 응답 상태:", response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📡 removeExcludedTag 응답 데이터:", data);
    return {
      success: true,
      data: data.excludedTags || [],
    };
  } catch (error) {
    console.error("❌ 제외 태그 삭제 실패:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
};

// 제외된 태그의 값을 포함한 정보를 가져오는 함수
export const fetchExcludedTagsWithValues = async (): Promise<ExcludedTagsWithValuesResponse> => {
  console.log("🔄 fetchExcludedTagsWithValues 함수 시작 - api.ts");
  try {
    // 먼저 제외 태그 목록을 가져옴
    console.log("📡 제외 태그 목록 가져오기 시작");
    const excludedTagsResponse = await fetchExcludedTags();
    console.log("📡 제외 태그 목록 응답:", excludedTagsResponse);

    if (!excludedTagsResponse.success || !excludedTagsResponse.data) {
      throw new Error(excludedTagsResponse.error || "제외 태그 목록을 가져오는데 실패했습니다.");
    }

    // 오늘의 태그 데이터를 가져옴
    console.log("📡 오늘의 태그 데이터 가져오기 시작");
    const todayTagDataResponse = await fetchTodayTagData();
    console.log("📡 오늘의 태그 데이터 응답:", todayTagDataResponse);

    if (!todayTagDataResponse.success || !todayTagDataResponse.data) {
      throw new Error(todayTagDataResponse.error || "오늘의 태그 데이터를 가져오는데 실패했습니다.");
    }

    // 제외된 태그들의 값을 포함한 정보 생성
    console.log("🔄 제외 태그 값 정보 생성 중...");
    const excludedTagsWithValues: ExcludedTagInfo[] = excludedTagsResponse.data.map((tag) => {
      const countStr = todayTagDataResponse.data![tag];
      const [leftCount, rightCount] = countStr ? countStr.split("/").map((val) => (val === "error" ? 0 : parseInt(val) || 0)) : [0, 0];
      return {
        tag,
        leftCount,
        rightCount,
      };
    });

    console.log("✅ 생성 완료된 excludedTagsWithValues:", excludedTagsWithValues);
    return {
      success: true,
      data: excludedTagsWithValues,
    };
  } catch (error) {
    console.error("❌ 제외 태그 값 정보 가져오기 실패:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
};

// 테스트용 더미 데이터 (실제 API가 없을 때 사용)
export const getMockTagData = (): TagData => {
  const mockData = {
    쓰레기집청소: Math.floor(Math.random() * 50 + 1).toString(),
    폐기물처리: Math.floor(Math.random() * 100 + 20).toString(),
    유품정리: Math.floor(Math.random() * 30 + 5).toString(),
    테스트: Math.random() > 0.8 ? "error" : Math.floor(Math.random() * 10 + 1).toString(),
    문의: Math.floor(Math.random() * 25 + 3).toString(),
    긴급: Math.floor(Math.random() * 15 + 1).toString(),
  };

  return mockData;
};

// 예약금 관련 타입 정의
export interface BankDeposit {
  amount: number;
  deposit_bank: string;
  depositor_name: string;
  reg_dt: string;
  account_number?: string; // 입금계좌번호 (선택적 필드)
}

export interface BankDepositsResponse {
  count: number;
  data: BankDeposit[];
}

export interface CollectResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// 날짜 형식 변환 함수 (YYYY-MM-DD → YYYYMMDD)
const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

// 첫 번째 API: 예약금 수집
export const collectBankDeposits = async (startDate: Date, endDate: Date): Promise<CollectResponse> => {
  try {
    const url = `${API_BASE_URL}/popbill/api/bank-deposits/collect`;

    console.log("🌐 collectBankDeposits URL:", url);

    // 날짜 순서 확인 및 수정 (시작일이 종료일보다 늦으면 안됨)
    const actualStartDate = startDate <= endDate ? startDate : endDate;
    const actualEndDate = startDate <= endDate ? endDate : startDate;

    const requestBody = {
      s_date: formatDateForAPI(actualStartDate),
      e_date: formatDateForAPI(actualEndDate),
    };
    console.log("📤 collectBankDeposits 요청 데이터:", requestBody);
    console.log("📤 collectBankDeposits 요청 본문:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("📡 collectBankDeposits 응답 상태:", response.status, response.statusText);
    console.log("📡 collectBankDeposits 응답 헤더:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      // 응답 본문을 읽어서 더 자세한 에러 정보 확인
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.text();
        console.log("📡 collectBankDeposits 에러 응답 본문:", errorData);
        errorMessage += ` - ${errorData}`;
      } catch (e) {
        console.log("📡 collectBankDeposits 에러 응답 본문 읽기 실패:", e);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log("📡 collectBankDeposits 응답 데이터:", data);

    return {
      success: true,
      message: data.message || "예약금 수집이 완료되었습니다.",
    };
  } catch (error) {
    console.error("❌ 예약금 수집 실패:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
};

// 두 번째 API: 예약금 데이터 조회
export const fetchBankDeposits = async (startDate: Date, endDate: Date): Promise<BankDepositsResponse> => {
  try {
    const url = `${API_BASE_URL}/popbill/api/bank-deposits`;

    console.log("🌐 fetchBankDeposits URL:", url);

    // 날짜 순서 확인 및 수정 (시작일이 종료일보다 늦으면 안됨)
    const actualStartDate = startDate <= endDate ? startDate : endDate;
    const actualEndDate = startDate <= endDate ? endDate : startDate;

    const requestBody = {
      s_date: formatDateForAPI(actualStartDate),
      e_date: formatDateForAPI(actualEndDate),
    };
    console.log("📤 fetchBankDeposits 요청 데이터:", requestBody);
    console.log("📤 fetchBankDeposits 요청 본문:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("📡 fetchBankDeposits 응답 상태:", response.status, response.statusText);
    console.log("📡 fetchBankDeposits 응답 헤더:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      // 응답 본문을 읽어서 더 자세한 에러 정보 확인
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.text();
        console.log("📡 fetchBankDeposits 에러 응답 본문:", errorData);
        errorMessage += ` - ${errorData}`;
      } catch (e) {
        console.log("📡 fetchBankDeposits 에러 응답 본문 읽기 실패:", e);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log("📡 fetchBankDeposits 응답 데이터:", data);

    return data;
  } catch (error) {
    console.error("❌ 예약금 데이터 조회 실패:", error);
    throw error;
  }
};
