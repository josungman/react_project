import React from "react";

interface CallInterfaceProps {
  isCallActive: boolean;
  callType: "voice" | "video" | null;
  callDuration: number;
  isRecording: boolean;
  onStartVoiceCall: () => void;
  onEndCall: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export const CallInterface: React.FC<CallInterfaceProps> = ({
  isCallActive,
  callType,
  callDuration,
  isRecording,
  onStartVoiceCall,
  onEndCall,
  onStartRecording,
  onStopRecording,
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white border-t px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 통화 상태 표시 */}
        <div className="flex items-center space-x-4">
          {isCallActive ? (
            <>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isRecording ? "bg-red-500" : "bg-green-500"} animate-pulse`}></div>
                <span className="text-sm font-medium">{callType === "voice" ? "음성 통화" : "영상 통화"} 중</span>
                <span className="text-xs text-gray-500">{formatDuration(callDuration)}</span>
              </div>

              {/* 녹음 상태 */}
              {isRecording && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-red-600">녹음 중</span>
                </div>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-500">통화 준비됨</span>
          )}
        </div>

        {/* 통화 버튼들 */}
        <div className="flex items-center space-x-2">
          {!isCallActive ? (
            <>
              {/* 음성 통화 버튼 */}
              <button onClick={onStartVoiceCall} className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors" title="음성 통화 시작">
                <span className="text-sm">📞(검토및테스트중)</span>
              </button>
            </>
          ) : (
            <>
              {/* 녹음 버튼 */}
              <button
                onClick={isRecording ? onStopRecording : onStartRecording}
                className={`p-2 rounded-lg transition-colors ${isRecording ? "bg-red-500 hover:bg-red-600 text-white" : "bg-yellow-500 hover:bg-yellow-600 text-white"}`}
                title={isRecording ? "녹음 중지" : "녹음 시작"}
              >
                <span className="text-lg">{isRecording ? "⏹️" : "🔴"}</span>
              </button>

              {/* 통화 종료 버튼 */}
              <button onClick={onEndCall} className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors" title="통화 종료">
                <span className="text-lg">📞</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
