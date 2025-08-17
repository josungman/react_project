/**
 * CallOverlay
 * - 통화 상태를 표시하고 수락/종료 버튼을 제공하는 오버레이 UI입니다.
 */
export default function CallOverlay({
  isIncoming,
  status,
  onAccept,
  onEnd,
  localRef,
  remoteRef,
}: {
  isIncoming: boolean;
  status: string;
  onAccept: () => void;
  onEnd: () => void;
  localRef: any;
  remoteRef: any;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white shadow-xl rounded-lg p-4 w-80">
        <div className="text-sm text-gray-500 mb-2">{isIncoming ? "수신 통화" : "발신 통화"}</div>
        <div className="text-lg font-semibold mb-4">상태: {status}</div>
        <audio ref={localRef} hidden autoPlay />
        <audio ref={remoteRef} hidden autoPlay />
        <div className="flex gap-2 justify-end">
          {isIncoming && (
            <button onClick={onAccept} className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700">
              수락
            </button>
          )}
          <button onClick={onEnd} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">
            종료
          </button>
        </div>
      </div>
    </div>
  );
}
