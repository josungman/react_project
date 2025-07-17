import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">채널톡 대시보드</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">채널톡 내부용 대시보드</p>

          <div className="mt-12 flex justify-center space-x-6">
            <Link to="/tag_dashboard">
              <div className="bg-white p-6 rounded-lg shadow-md max-w-sm cursor-pointer hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-2">📊</div>
                <h3 className="font-semibold text-gray-800 mb-2">태그 통계</h3>
                <p className="text-gray-600 text-sm">셋팅된 태그별 사용 빈도 확인</p>
              </div>
            </Link>
            <Link to="/reservation_dashboard">
              <div className="bg-white p-6 rounded-lg shadow-md max-w-sm cursor-pointer hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-2">💰</div>
                <h3 className="font-semibold text-gray-800 mb-2">예약금 통계(작업중)</h3>
                <p className="text-gray-600 text-sm">월별 예약금 현황 및 추이</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
