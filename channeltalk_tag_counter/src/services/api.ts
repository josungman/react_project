// API 서비스 - DB에서 데이터를 가져오는 함수들

export interface TagData {
  [key: string]: string;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface ExcludedTagInfo {
  tag: string;
  count: number;
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
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://elbserver.store/channel_talk";

// 오늘 날짜의 태그 데이터를 가져오는 함수
export const fetchTodayTagData = async (): Promise<ApiResponse> => {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD 형식

    const response = await fetch(`${API_BASE_URL}/tags/today?date=${today}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error("태그 데이터 가져오기 실패:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
};

// TagCount 형식으로 데이터를 가져오는 함수
export const fetchTagCounts = async (): Promise<TagCountResponse> => {
  try {
    const response = await fetchTodayTagData();

    if (!response.success || !response.data) {
      throw new Error(response.error || "API에서 데이터를 가져오는데 실패했습니다.");
    }

    // TagData를 TagCount[] 형식으로 변환
    const tagCounts: TagCount[] = Object.entries(response.data)
      .map(([tag, count]) => ({
        tag,
        count: count === "error" ? 0 : parseInt(count) || 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      success: true,
      data: tagCounts,
      originalData: response.data,
    };
  } catch (error) {
    console.error("태그 카운트 데이터 가져오기 실패:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
};

// 제외 태그 목록을 가져오는 함수
export const fetchExcludedTags = async (): Promise<ExcludedTagsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/tags/excluded`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data.excludedTags || [],
    };
  } catch (error) {
    console.error("제외 태그 목록 가져오기 실패:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
};

// 제외 태그 추가 함수
export const addExcludedTag = async (tag: string): Promise<ExcludedTagsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/tags/excluded`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tag }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data.excludedTags || [],
    };
  } catch (error) {
    console.error("제외 태그 추가 실패:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
};

// 제외 태그 삭제 함수
export const removeExcludedTag = async (tag: string): Promise<ExcludedTagsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/tags/excluded`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tag }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data.excludedTags || [],
    };
  } catch (error) {
    console.error("제외 태그 삭제 실패:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
};

// 제외된 태그의 값을 포함한 정보를 가져오는 함수
export const fetchExcludedTagsWithValues = async (): Promise<ExcludedTagsWithValuesResponse> => {
  try {
    // 먼저 제외 태그 목록을 가져옴
    const excludedTagsResponse = await fetchExcludedTags();
    if (!excludedTagsResponse.success || !excludedTagsResponse.data) {
      throw new Error(excludedTagsResponse.error || "제외 태그 목록을 가져오는데 실패했습니다.");
    }

    // 오늘의 태그 데이터를 가져옴
    const todayTagDataResponse = await fetchTodayTagData();
    if (!todayTagDataResponse.success || !todayTagDataResponse.data) {
      throw new Error(todayTagDataResponse.error || "오늘의 태그 데이터를 가져오는데 실패했습니다.");
    }

    // 제외된 태그들의 값을 포함한 정보 생성
    const excludedTagsWithValues: ExcludedTagInfo[] = excludedTagsResponse.data.map((tag) => ({
      tag,
      count: todayTagDataResponse.data![tag] === "error" ? 0 : parseInt(todayTagDataResponse.data![tag]) || 0,
    }));

    return {
      success: true,
      data: excludedTagsWithValues,
    };
  } catch (error) {
    console.error("제외 태그 값 정보 가져오기 실패:", error);
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
