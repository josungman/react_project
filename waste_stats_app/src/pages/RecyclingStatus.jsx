import { motion } from "framer-motion";

function RecyclingStatus() {
  return (
    <motion.div className="p-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
      <h2 className="text-2xl font-bold">재활용 실적 및 업체 현황 페이지</h2>
      <p className="mt-4">카카오맵 API 연동 예정</p>
    </motion.div>
  );
}

export default RecyclingStatus;
