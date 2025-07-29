import { useState, useEffect } from "react";

interface DateRangeSliderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDays: number;
  onDaysChange: (days: number) => void;
}

export default function DateRangeSliderModal({ isOpen, onClose, currentDays, onDaysChange }: DateRangeSliderModalProps) {
  const [localDays, setLocalDays] = useState(currentDays);
  const [previewStartDate, setPreviewStartDate] = useState<Date>(new Date());
  const [previewEndDate, setPreviewEndDate] = useState<Date>(new Date());

  useEffect(() => {
    if (isOpen) {
      setLocalDays(currentDays);
      updatePreviewDates(currentDays);
    }
  }, [isOpen, currentDays]);

  const updatePreviewDates = (days: number) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days + 1);

    setPreviewEndDate(today);
    setPreviewStartDate(startDate);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDays = parseInt(e.target.value);
    setLocalDays(newDays);
    updatePreviewDates(newDays);
  };

  const handleSave = () => {
    onDaysChange(localDays);
    onClose();
  };

  const handleCancel = () => {
    setLocalDays(currentDays);
    updatePreviewDates(currentDays);
    onClose();
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">조회 기간 설정</h2>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* 슬라이더 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">조회 기간</label>
              <span className="text-lg font-bold text-blue-600">{localDays}일</span>
            </div>

            <div className="relative">
              <input
                type="range"
                min="1"
                max="30"
                value={localDays}
                onChange={handleSliderChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((localDays - 1) / 29) * 100}%, #e5e7eb ${((localDays - 1) / 29) * 100}%, #e5e7eb 100%)`,
                }}
              />

              {/* 슬라이더 마커들 */}
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1일</span>
                <span>7일</span>
                <span>15일</span>
                <span>30일</span>
              </div>
            </div>
          </div>

          {/* 미리보기 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">조회 기간 미리보기</h3>
            <div className="text-sm text-blue-700">
              <p>시작일: {formatDate(previewStartDate)}</p>
              <p>종료일: {formatDate(previewEndDate)}</p>
              <p className="font-medium mt-1">총 {localDays}일간의 데이터를 조회합니다.</p>
            </div>
          </div>

          {/* 빠른 선택 버튼들 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">빠른 선택</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => {
                  setLocalDays(7);
                  updatePreviewDates(7);
                }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  localDays === 7 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                7일
              </button>
              <button
                onClick={() => {
                  setLocalDays(14);
                  updatePreviewDates(14);
                }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  localDays === 14 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                14일
              </button>
              <button
                onClick={() => {
                  setLocalDays(21);
                  updatePreviewDates(21);
                }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  localDays === 21 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                21일
              </button>
              <button
                onClick={() => {
                  setLocalDays(30);
                  updatePreviewDates(30);
                }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  localDays === 30 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                30일
              </button>
            </div>
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
