import React, { useState, useEffect } from "react";

interface TimeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInterval: number;
  onUpdateIntervalChange: (interval: number) => void;
}

const TimeSettingsModal: React.FC<TimeSettingsModalProps> = ({ isOpen, onClose, updateInterval, onUpdateIntervalChange }) => {
  const [localInterval, setLocalInterval] = useState(updateInterval);

  useEffect(() => {
    setLocalInterval(updateInterval);
  }, [updateInterval]);

  const handleSave = () => {
    // 유효성 검사: 30초 이상 3600초 이하인지 확인
    if (localInterval >= 30 && localInterval <= 3600) {
      onUpdateIntervalChange(localInterval);
      onClose();
    }
  };

  const handleCancel = () => {
    setLocalInterval(updateInterval);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">시간 설정</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 설정 내용 */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-6">
            {/* 업데이트 간격 설정 */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">업데이트 설정</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">업데이트 간격 (초)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="30"
                      max="3600"
                      value={localInterval}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 30 && value <= 3600) {
                          setLocalInterval(value);
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-500">초</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">최소 30초, 최대 3600초 (1시간)</p>
                </div>

                {/* 미리 정의된 간격 버튼들 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">빠른 선택</label>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => setLocalInterval(30)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        localInterval === 30 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      30초
                    </button>
                    <button
                      onClick={() => setLocalInterval(60)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        localInterval === 60 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      1분
                    </button>
                    <button
                      onClick={() => setLocalInterval(120)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        localInterval === 120 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      2분
                    </button>
                    <button
                      onClick={() => setLocalInterval(300)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        localInterval === 300 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      5분
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 현재 설정 정보 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">현재 설정</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• 업데이트 간격: {updateInterval}초</p>
                <p>• 다음 업데이트: {updateInterval}초 후</p>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
          <button onClick={handleCancel} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors">
            취소
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeSettingsModal;
