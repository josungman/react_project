import { useEffect, useState } from "react";

function ProductNameAutocomplete({ keywords, setKeywords, searchLogic, setSearchLogic, positions, filteredPositionsCount }) {
  const DEFAULT_PLACEHOLDER = "품목 필터";
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [inputPlaceholder, setInputPlaceholder] = useState(DEFAULT_PLACEHOLDER);

  // 필터된 위치 개수를 받아서 플레이스홀더 업데이트
  useEffect(() => {
    if (filteredPositionsCount > 0) {
      setInputPlaceholder(`품목 필터 (${filteredPositionsCount}개)`);
    } else {
      setInputPlaceholder(DEFAULT_PLACEHOLDER);
    }
  }, [filteredPositionsCount]);

  // product_name에서 쉼표로 분리해 자동완성 후보 생성
  useEffect(() => {
    if (!positions || positions.length === 0) return;

    const allProductNames = positions
      .map((pos) => pos.product_name)
      .filter((name) => name)
      .flatMap((name) => name.split(","))
      .map((name) => name.trim().toLowerCase())
      .filter((name, index, self) => self.indexOf(name) === index);

    setSuggestions(allProductNames);
  }, [positions]);

  // 입력값 변화 시 자동완성 후보 필터링
  useEffect(() => {
    if (input.trim() === "") {
      setFilteredSuggestions([]);
      return;
    }

    const lowerInput = input.toLowerCase();
    const filtered = suggestions.filter((s) => s.includes(lowerInput) && !keywords.includes(s));
    setFilteredSuggestions(filtered.slice(0, 50)); // 최대 30개 제한
  }, [input, suggestions, keywords]);

  const addKeyword = (word = input.trim()) => {
    const keyword = word.toLowerCase();
    if (keyword && !keywords.includes(keyword)) {
      if (keywords.length >= 5) {
        // 👉 placeholder에 안내 메시지 표시
        setInputPlaceholder("❗❗최대 5개");
        setTimeout(() => {
          setInputPlaceholder(`항목 필터 (${filteredPositionsCount}개)`);
        }, 2000);
        return;
      }
      setKeywords([...keywords, keyword]);
    }
    setInput("");
    setFilteredSuggestions([]);
  };

  const removeKeyword = (keyword) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  // 자동완성 드롭다운 외부 클릭 시 닫히도록 처리
  const handleBlur = () => {
    // 짧은 지연 후 닫기 (드롭다운 클릭 이벤트 먼저 처리되게 함)
    setTimeout(() => {
      setFilteredSuggestions([]);
    }, 100);
  };

  return (
    <div className="flex flex-col gap-2 relative">
      <div className="flex items-center gap-2">
        <input
          id="product-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            // 포커스 시 suggestions 전체 보여주되, 이미 등록된 키워드는 제외
            if (input.trim() === "") {
              const filtered = suggestions.filter((s) => !keywords.includes(s));
              setFilteredSuggestions(filtered.slice(0, 50));
            }
          }}
          onBlur={handleBlur}
          className="border px-2 py-1 rounded text-xm"
          placeholder={inputPlaceholder}
        />

        <select value={searchLogic} onChange={(e) => setSearchLogic(e.target.value)} className="border text-xm px-2 py-1 rounded w-18">
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>
      </div>

      {filteredSuggestions.length > 0 && (
        <ul className="absolute top-full mt-1 border bg-white w-full max-h-40 overflow-y-auto z-50 shadow rounded">
          {filteredSuggestions.map((item) => (
            <li key={item} onMouseDown={() => addKeyword(item)} className="px-2 py-1 hover:bg-blue-100 cursor-pointer">
              {item}
            </li>
          ))}
        </ul>
      )}

      {keywords.length > 0 && (
        <div className="mt-1 rounded p-2 max-h-40 overflow-y-auto text-xm space-y-1 absolute top-full left-0 w-[80%] z-10">
          {keywords.map((keyword) => (
            <div key={keyword} className="bg-blue-100  text-blue-700 px-2 py-1 rounded-full flex items-center justify-between gap-1 shadow">
              <span className="truncate">{keyword}</span>
              <button onClick={() => removeKeyword(keyword)} className="text-blue-500 hover:text-blue-700 font-bold ml-2">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductNameAutocomplete;
