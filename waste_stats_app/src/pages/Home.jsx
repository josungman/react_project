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
      <h1 className="text-2xl font-bold mb-6">폐기물 통계 포털</h1>

      <motion.div whileTap={{ scale: 0.95 }}>
        <Button onClick={() => navigate("/waste")} className="bg-blue-600 hover:bg-blue-700 text-white">
          폐기물 발생현황
        </Button>
      </motion.div>

      <motion.div whileTap={{ scale: 0.95 }}>
        <Button onClick={() => navigate("/recycle")} className="bg-green-600 hover:bg-green-700 text-white">
          재활용 실적 및 업체 현황
        </Button>
      </motion.div>
    </motion.div>
  );
}

export default Home;
