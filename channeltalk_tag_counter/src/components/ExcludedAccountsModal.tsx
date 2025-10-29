import React, { useState, useEffect, useMemo, useCallback } from "react";
import { addExcludedAccount, deleteExcludedAccount, fetchExcludedAccounts } from "../services/api";

interface ExcludedAccount {
  id: number;
  account_name: string;
  match_type: "exact" | "contains";
  is_active?: boolean;
  created_at?: string;
}

interface ExcludedAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountsUpdate: (accounts: ExcludedAccount[]) => void;
  onToast: (message: string, type: "success" | "error" | "info") => void;
}

const ExcludedAccountsModal: React.FC<ExcludedAccountsModalProps> = ({ isOpen, onClose, onAccountsUpdate, onToast }) => {
  const [newAccountName, setNewAccountName] = useState("");
  const [matchType, setMatchType] = useState<"exact" | "contains">("exact");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [excludedAccounts, setExcludedAccounts] = useState<ExcludedAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  // 검색어에 따라 송금자명 필터링
  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) {
      return excludedAccounts;
    }
    return excludedAccounts.filter((account) => account.account_name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [excludedAccounts, searchQuery]);

  // 제외된 송금자명 목록 가져오기
  const fetchExcludedAccountsData = useCallback(async () => {
    console.log("🔄 제외 송금자명 데이터 가져오기 시작 - ExcludedAccountsModal.tsx의 fetchExcludedAccountsData 함수");
    setIsLoadingAccounts(true);
    try {
      console.log("📡 API 호출 시작 - fetchExcludedAccounts()");
      const response = await fetchExcludedAccounts();
      console.log("📡 제외 송금자명 API 응답 받음:", response);

      if (response.success && response.data) {
        console.log("✅ 제외 송금자명 데이터 설정 완료:", response.data);
        setExcludedAccounts(response.data);
        onAccountsUpdate(response.data);
      } else {
        console.error("❌ 제외 송금자명 목록 가져오기 실패:", response.error);
        onToast("제외 송금자명 목록을 불러오는데 실패했습니다.", "error");
      }
    } catch (err) {
      console.error("❌ 제외 송금자명 목록 가져오기 실패:", err);
      onToast("제외 송금자명 목록을 불러오는데 실패했습니다.", "error");
    } finally {
      setIsLoadingAccounts(false);
    }
  }, [onAccountsUpdate, onToast]);

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
      setNewAccountName("");
      setMatchType("exact");
      setSearchQuery("");
      setInputKey((prev) => prev + 1);
      fetchExcludedAccountsData();
    }
  }, [isOpen, fetchExcludedAccountsData]);

  // 제외 송금자명 추가
  const handleAddAccount = async () => {
    if (!newAccountName.trim()) return;

    setIsLoading(true);

    try {
      const response = await addExcludedAccount(newAccountName.trim(), matchType);
      if (response.success && response.data) {
        onAccountsUpdate(response.data);
        setNewAccountName("");
        setMatchType("exact");
        onToast("송금자명이 성공적으로 추가되었습니다.", "success");
        // 송금자명 추가 후 목록 다시 로드
        fetchExcludedAccountsData();
      } else {
        onToast(`송금자명 추가에 실패했습니다.${response.error ? `\n${response.error}` : ""}`, "error");
      }
    } catch (err) {
      onToast(`송금자명 추가 중 오류가 발생했습니다.\n${err instanceof Error ? err.message : "알 수 없는 오류"}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 제외 송금자명 삭제
  const handleRemoveAccount = async (id: number) => {
    setIsLoading(true);

    try {
      const response = await deleteExcludedAccount(id);
      if (response.success && response.data) {
        onAccountsUpdate(response.data);
        onToast("송금자명이 성공적으로 삭제되었습니다.", "success");
        // 송금자명 삭제 후 목록 다시 로드
        fetchExcludedAccountsData();
      } else {
        onToast(`송금자명 삭제에 실패했습니다.${response.error ? `\n${response.error}` : ""}`, "error");
      }
    } catch (err) {
      onToast(`송금자명 삭제 중 오류가 발생했습니다.\n${err instanceof Error ? err.message : "알 수 없는 오류"}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Enter 키로 추가
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleAddAccount();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">제외 송금자명 관리</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 추가 폼 */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              {/* 송금자명 입력 */}
              <div className="w-1/2">
                <label htmlFor="newAccountName" className="block text-sm font-medium text-gray-700 mb-2">
                  새 송금자명 추가
                </label>
                <input
                  key={inputKey}
                  id="newAccountName"
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="제외할 송금자명을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>

              {/* 매치 타입 선택 */}
              <div className="w-1/2 flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">매치 타입</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="matchType"
                      value="exact"
                      checked={matchType === "exact"}
                      onChange={(e) => setMatchType(e.target.value as "exact" | "contains")}
                      className="mr-2"
                    />
                    <span className="text-sm">완전일치</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="matchType"
                      value="contains"
                      checked={matchType === "contains"}
                      onChange={(e) => setMatchType(e.target.value as "exact" | "contains")}
                      className="mr-2"
                    />
                    <span className="text-sm">포함</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddAccount}
              disabled={!newAccountName.trim() || isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              )}
              추가
            </button>
          </div>

          {/* 검색 */}
          <div className="space-y-3">
            <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700">
              송금자명 검색
            </label>
            <input
              id="searchQuery"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="송금자명을 검색하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 제외 송금자명 목록 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">제외 송금자명 목록</h3>
              <span className="text-sm text-gray-500">{filteredAccounts.length}개</span>
            </div>

            {isLoadingAccounts ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">로딩 중...</span>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-lg font-medium mb-2">제외 송금자명이 없습니다</p>
                <p className="text-sm">새 송금자명을 추가하거나 다른 검색어를 입력해보세요.</p>
              </div>
            ) : (
              <div className="max-h-[28rem] overflow-y-auto space-y-2 pr-2">
                {filteredAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-800 font-medium">{account.account_name}</span>
                      <span className={`text-xs px-2 py-1 rounded ${account.match_type === "exact" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
                        {account.match_type === "exact" ? "완전일치" : "포함"}
                      </span>
                      {account.created_at && <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">{new Date(account.created_at).toLocaleDateString()}</span>}
                    </div>
                    <button
                      onClick={() => handleRemoveAccount(account.id)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-800 disabled:text-gray-400 transition-colors"
                    >
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

export default ExcludedAccountsModal;
