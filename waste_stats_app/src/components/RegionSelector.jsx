import { useEffect, useRef, useState } from "react";

function RegionSelector({ regionList, searchTerm, setSearchTerm, onSelect }) {
  const [filtered, setFiltered] = useState([]);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const isManualCloseRef = useRef(false); // ✅ 수동 닫힘 여부 추적

  useEffect(() => {
    const newFiltered = regionList.filter((name) => name.includes(searchTerm)).sort((a, b) => a.localeCompare(b, "ko"));
    setFiltered(newFiltered);
    setFocusedIdx(-1);

    // ✅ 수동으로 닫은 경우가 아니면 드롭박스 열기
    if (!isManualCloseRef.current && document.activeElement === inputRef.current) {
      setIsOpen(newFiltered.length > 0);
    }

    // ✅ 수동 닫힘 여부 초기화
    isManualCloseRef.current = false;
  }, [searchTerm, regionList]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!inputRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      isManualCloseRef.current = true; // ✅ 닫기 플래그 설정
      setIsOpen(false);

      if (focusedIdx >= 0 && focusedIdx < filtered.length) {
        const selected = filtered[focusedIdx];
        setSearchTerm(selected);
        onSelect(selected);
      } else {
        onSelect(searchTerm);
      }
    }
  };

  useEffect(() => {
    if (focusedIdx !== -1 && listRef.current) {
      const items = listRef.current.querySelectorAll("li");
      if (items[focusedIdx]) {
        items[focusedIdx].scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIdx]);

  return (
    <div className="relative z-40">
      <input
        ref={inputRef}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        //onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        placeholder="시/군/구 검색 후 클릭"
        className="px-3 py-1 border rounded text-sm w-[220px]"
      />
      {isOpen && filtered.length > 0 && (
        <ul ref={listRef} className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border rounded shadow text-sm">
          {filtered.map((name, idx) => (
            <li
              key={name}
              onClick={() => {
                isManualCloseRef.current = true; // ✅ 닫기 플래그 설정
                setSearchTerm(name);
                setIsOpen(false);
                onSelect(name);
              }}
              className={`px-3 py-1 cursor-pointer hover:bg-blue-100 ${idx === focusedIdx ? "bg-blue-200" : ""}`}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default RegionSelector;
