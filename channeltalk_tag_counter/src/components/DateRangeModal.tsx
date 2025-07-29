import { useState, useEffect } from "react";

interface DateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (startDate: Date) => void;
  isEndDateFixed?: boolean; // 종료일 고정 여부
}

export default function DateRangeModal({ isOpen, onClose, startDate, endDate, onDateRangeChange, isEndDateFixed = false }: DateRangeModalProps) {
  const [localStartDate, setLocalStartDate] = useState<Date>(startDate);
  const [localEndDate, setLocalEndDate] = useState<Date>(endDate);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setLocalStartDate(startDate);
      setLocalEndDate(endDate);
      setError("");
    }
  }, [isOpen, startDate, endDate]);

  const handleSave = () => {
    // 날짜 유효성 검사
    if (localStartDate > localEndDate) {
      setError("시작일은 종료일보다 늦을 수 없습니다.");
      return;
    }

    // 30일 제한 검사
    const diffTime = Math.abs(localEndDate.getTime() - localStartDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      setError("조회 기간은 최대 30일까지 가능합니다.");
      return;
    }

    // 종료일이 고정되어 있으면 오늘 날짜로 설정
    onDateRangeChange(localStartDate);
    onClose();
  };

  const handleCancel = () => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
    setError("");
    onClose();
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleStartDateChange = (dateString: string) => {
    const newDate = new Date(dateString);
    setLocalStartDate(newDate);
    setError("");
  };

  const handleEndDateChange = (dateString: string) => {
    const newDate = new Date(dateString);
    setLocalEndDate(newDate);
    setError("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">조회 기간 설정</h2>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">시작일</label>
            <input
              type="date"
              value={formatDateForInput(localStartDate)}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">종료일 {isEndDateFixed && <span className="text-blue-600">(고정)</span>}</label>
            <input
              type="date"
              value={formatDateForInput(localEndDate)}
              onChange={(e) => handleEndDateChange(e.target.value)}
              disabled={isEndDateFixed}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEndDateFixed ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-800 text-sm">
              • 조회 기간은 최대 30일까지 가능합니다.
              <br />• 시작일은 종료일보다 늦을 수 없습니다.
              {isEndDateFixed && (
                <>
                  <br />• 종료일은 오늘 날짜로 고정됩니다.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={handleCancel} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            취소
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
