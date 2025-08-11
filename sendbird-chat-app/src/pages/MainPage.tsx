import { Link } from "react-router-dom";

export default function MainPage() {
  return (
    <div className="h-full bg-gray-100 flex flex-col">
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">SendBird 채팅 앱</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 채팅 생성 카드 */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">💬</div>
              <h2 className="text-xl font-semibold mb-2">채팅 생성</h2>
              <p className="text-gray-600 mb-4">새로운 1대1 채팅방을 생성하고 대화를 시작하세요.</p>
              <Link to="/chat/create" className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                채팅 시작하기
              </Link>
            </div>

            {/* 상담방 관리 카드 */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">🎧</div>
              <h2 className="text-xl font-semibold mb-2">상담방 관리(검토중)</h2>
              <p className="text-gray-600 mb-4">기존 상담방을 관리하고 고객과 소통하세요.</p>
              <Link to="/support/list" className="inline-block bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
                상담방 보기
              </Link>
            </div>
          </div>

          {/* 기능 설명 */}
          <div className="mt-12 bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold mb-6">주요 기능</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">💬 실시간 채팅</h3>
                <ul className="text-gray-600 space-y-2">
                  <li>• 1대1 실시간 메시지 전송</li>
                  <li>• 파일 업로드 (이미지, PDF, 문서)</li>
                  <li>• 실시간 연결 상태 모니터링(작업필요.)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">📞 통화 기능(검토중)</h3>
                <ul className="text-gray-600 space-y-2">
                  <li>• 음성 녹음 및 자동 업로드</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
