import { useState, useEffect } from "react";

interface AmountFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMaxAmount: number;
  onMaxAmountChange: (amount: number) => void;
}

export default function AmountFilterModal({ isOpen, onClose, currentMaxAmount, onMaxAmountChange }: AmountFilterModalProps) {
  const [localMaxAmount, setLocalMaxAmount] = useState(currentMaxAmount);
  const [inputValue, setInputValue] = useState(currentMaxAmount.toLocaleString());

  useEffect(() => {
    if (isOpen) {
      setLocalMaxAmount(currentMaxAmount);
      setInputValue(currentMaxAmount.toLocaleString());
    }
  }, [isOpen, currentMaxAmount]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = parseInt(e.target.value);
    setLocalMaxAmount(newAmount);
    setInputValue(newAmount.toLocaleString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.min(numValue, 100000000); // 최대 1억원

    setLocalMaxAmount(clampedValue);
    setInputValue(clampedValue.toLocaleString());
  };

  const handleSave = () => {
    onMaxAmountChange(localMaxAmount);
    onClose();
  };

  const handleCancel = () => {
    setLocalMaxAmount(currentMaxAmount);
    setInputValue(currentMaxAmount.toLocaleString());
    onClose();
  };

  const formatAmount = (amount: number): string => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억원`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`;
    } else {
      return `${amount.toLocaleString()}원`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">예약금 표출 설정</h2>
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
              <label className="text-sm font-medium text-gray-700">최대 표출 금액</label>
              <span className="text-lg font-bold text-blue-600">{formatAmount(localMaxAmount)}</span>
            </div>

            <div className="relative">
              <input
                type="range"
                min="100000"
                max="100000000"
                step="100000"
                value={localMaxAmount}
                onChange={handleSliderChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((localMaxAmount - 100000) / 99900000) * 100}%, #e5e7eb ${
                    ((localMaxAmount - 100000) / 99900000) * 100
                  }%, #e5e7eb 100%)`,
                }}
              />

              {/* 슬라이더 마커들 */}
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10만원</span>
                <span>1000만원</span>
                <span>5000만원</span>
                <span>1억원</span>
              </div>
            </div>
          </div>

          {/* 직접 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">직접 입력</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="금액을 입력하세요"
              />
              <span className="text-sm text-gray-500">원</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">최대 1억원까지 설정 가능합니다.</p>
          </div>

          {/* 미리보기 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">설정 미리보기</h3>
            <div className="text-sm text-blue-700">
              <p>• {formatAmount(localMaxAmount)} 이하의 예약금만 표시됩니다.</p>
              <p>• {formatAmount(localMaxAmount)} 초과 예약금은 필터링됩니다.</p>
              <p className="font-medium mt-1">이 설정은 상세 내역 테이블에만 적용됩니다.</p>
            </div>
          </div>

          {/* 빠른 선택 버튼들 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">빠른 선택</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setLocalMaxAmount(1000000);
                  setInputValue("1,000,000");
                }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  localMaxAmount === 1000000 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                100만원
              </button>
              <button
                onClick={() => {
                  setLocalMaxAmount(5000000);
                  setInputValue("5,000,000");
                }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  localMaxAmount === 5000000 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                500만원
              </button>
              <button
                onClick={() => {
                  setLocalMaxAmount(10000000);
                  setInputValue("10,000,000");
                }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  localMaxAmount === 10000000 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                1000만원
              </button>
              <button
                onClick={() => {
                  setLocalMaxAmount(100000000);
                  setInputValue("100,000,000");
                }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  localMaxAmount === 100000000 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                1억원
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
