import { motion } from "framer-motion";

function WasteStatus() {
  return (
    <motion.div className="p-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
      <h2 className="text-2xl font-bold">폐기물 발생현황 페이지</h2>
      <p className="mt-4">여기에 데이터를 시각화하거나 목록을 표시할 수 있습니다.</p>
    </motion.div>
  );
}

export default WasteStatus;
