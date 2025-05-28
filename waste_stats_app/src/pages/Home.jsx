import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button"; // 또는 상대경로

function Home() {
  const navigate = useNavigate();

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen bg-gray-100 gap-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold mb-6 text-center">
        📊 폐기물 통계 포털 <br></br> <small>Made By ELB</small>
      </h1>

      <motion.div whileTap={{ scale: 0.95 }}>
        <Button onClick={() => navigate("/waste")} className="bg-blue-600 hover:bg-blue-700 text-white">
          폐기물 발생이력
        </Button>
      </motion.div>

      <motion.div whileTap={{ scale: 0.95 }}>
        <Button onClick={() => navigate("/recycle")} className="bg-green-600 hover:bg-green-700 text-white">
          폐기물 실적 업체
        </Button>
      </motion.div>

      {/* ✅ 업데이트 일자 하단 고정 */}
      <div className="absolute bottom-4 text-sm text-gray-500">업데이트: 25.05.28</div>
    </motion.div>
  );
}

export default Home;
