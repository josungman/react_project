import React, { useState, useEffect, useMemo, useCallback } from "react";
import { addExcludedTag, removeExcludedTag, fetchExcludedTagsWithValues } from "../services/api";
import type { ExcludedTagInfo } from "../services/api";
import toast from "react-hot-toast";

interface ExcludedTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTagsUpdate: (tags: string[]) => void;
}

const ExcludedTagsModal: React.FC<ExcludedTagsModalProps> = ({ isOpen, onClose, onTagsUpdate }) => {
  const [newTag, setNewTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [excludedTagsWithValues, setExcludedTagsWithValues] = useState<ExcludedTagInfo[]>([]);
  const [isLoadingValues, setIsLoadingValues] = useState(false);

  // 검색어에 따라 태그 필터링
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) {
      return excludedTagsWithValues;
    }
    return excludedTagsWithValues.filter((tagInfo) => tagInfo.tag.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [excludedTagsWithValues, searchQuery]);

  // 제외된 태그의 값 정보 가져오기
  const fetchExcludedTagsData = useCallback(async () => {
    console.log("🔄 제외 태그 데이터 가져오기 시작 - ExcludedTagsModal.tsx의 fetchExcludedTagsData 함수");
    setIsLoadingValues(true);
    try {
      console.log("📡 API 호출 시작 - fetchExcludedTagsWithValues()");
      const response = await fetchExcludedTagsWithValues();
      console.log("📡 제외 태그 API 응답 받음:", response);

      if (response.success && response.data) {
        console.log("✅ 제외 태그 데이터 설정 완료:", response.data);
        setExcludedTagsWithValues(response.data);
      } else {
        console.error("❌ 제외 태그 값 정보 가져오기 실패:", response.error);
      }
    } catch (err) {
      console.error("❌ 제외 태그 값 정보 가져오기 실패:", err);
    } finally {
      setIsLoadingValues(false);
    }
  }, []);

  // 모달 외부 클릭 시 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // 모달이 처음 열릴 때만 입력 필드 초기화 및 데이터 로드
  useEffect(() => {
    if (isOpen) {
      setNewTag("");
      setSearchQuery("");
      setInputKey((prev) => prev + 1);
      fetchExcludedTagsData();
    }
  }, [isOpen, fetchExcludedTagsData]);

  // 제외 태그 추가
  const handleAddTag = async () => {
    if (!newTag.trim()) return;

    setIsLoading(true);

    try {
      const response = await addExcludedTag(newTag.trim());
      if (response.success && response.data) {
        onTagsUpdate(response.data);
        setNewTag("");
        toast.success("태그가 성공적으로 추가되었습니다.");
        // 태그 추가 후 값 정보 다시 로드
        fetchExcludedTagsData();
      } else {
        toast.error(`태그 추가에 실패했습니다.${response.error ? `\n${response.error}` : ""}`);
      }
    } catch (err) {
      toast.error(`태그 추가 중 오류가 발생했습니다.\n${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 제외 태그 삭제
  const handleRemoveTag = async (tag: string) => {
    setIsLoading(true);

    try {
      const response = await removeExcludedTag(tag);
      if (response.success && response.data) {
        onTagsUpdate(response.data);
        toast.success("태그가 성공적으로 삭제되었습니다.");
        // 태그 삭제 후 값 정보 다시 로드
        fetchExcludedTagsData();
      } else {
        toast.error(`태그 삭제에 실패했습니다.${response.error ? `\n${response.error}` : ""}`);
      }
    } catch (err) {
      toast.error(`태그 삭제 중 오류가 발생했습니다.\n${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Enter 키로 태그 추가
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleAddTag();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">제외 태그 관리</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 고정된 상단 영역 - 태그 추가 */}
        <div className="p-6 border-b bg-gray-50 flex-shrink-0">
          <div className="flex gap-2">
            <input
              key={inputKey}
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="제외 태그 이름을 입력하세요"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "추가 중..." : "추가"}
            </button>
          </div>
        </div>

        {/* 고정된 검색 영역 */}
        <div className="p-6 border-b bg-gray-50 flex-shrink-0">
          <h3 className="text-lg font-medium text-gray-800 mb-3">
            현재 제외 태그 ({excludedTagsWithValues.length}개)
            {searchQuery && <span className="text-sm text-gray-500 ml-2">(검색 결과: {filteredTags.length}개)</span>}
          </h3>

          {/* 검색 입력창 */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="태그 검색..."
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 스크롤 가능한 내용 영역 - 고정 높이 */}
        <div className="p-6 overflow-y-auto flex-1" style={{ minHeight: "200px" }}>
          {isLoadingValues ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>태그 정보를 불러오는 중...</p>
            </div>
          ) : excludedTagsWithValues.length === 0 ? (
            <div className="text-center py-8 text-gray-500">제외된 태그가 없습니다.</div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>검색 결과가 없습니다.</p>
              <p className="text-sm text-gray-400 mt-1">다른 검색어를 입력해보세요.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTags.map((tagInfo) => (
                <div key={tagInfo.tag} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-800 font-medium">{tagInfo.tag}</span>
                    <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      {tagInfo.leftCount}/{tagInfo.rightCount}건
                    </span>
                  </div>
                  <button onClick={() => handleRemoveTag(tagInfo.tag)} disabled={isLoading} className="text-red-600 hover:text-red-800 disabled:text-gray-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end p-6 border-t bg-gray-50 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExcludedTagsModal;
