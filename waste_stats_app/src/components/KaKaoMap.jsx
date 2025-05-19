import { useEffect, useRef, useState } from "react";

function KaKaoMap({ kakaoMapKey, positions }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerMap = useRef({});
  const overlayMap = useRef({});
  const currentOverlay = useRef(null);

  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!kakaoMapKey || !positions) return;

    const scriptId = "kakao-map-script";
    const existingScript = document.getElementById(scriptId);

    const loadMap = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          const map = new window.kakao.maps.Map(mapRef.current, {
            center: new window.kakao.maps.LatLng(36.5, 127.5),
            level: 7,
            minLevel: 5, // ✅ 줌레벨 제한: 도 단위까지만
            maxLevel: 12,
          });

          mapInstance.current = map;

          // ✅ 한국 범위로 바운드 설정 (북: 38.6, 남: 33.1 / 서: 124.6, 동: 131.9)
          const bounds = new window.kakao.maps.LatLngBounds(new window.kakao.maps.LatLng(33.1, 124.6), new window.kakao.maps.LatLng(38.6, 131.9));

          let lastCenter = map.getCenter();

          window.kakao.maps.event.addListener(map, "idle", () => {
            const center = map.getCenter();
            if (!bounds.contain(center)) {
              map.setCenter(lastCenter);
            } else {
              lastCenter = center;
            }
          });

          const zoomControl = new window.kakao.maps.ZoomControl();
          map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

          positions.forEach((pos) => {
            const marker = new window.kakao.maps.Marker({
              map,
              position: new window.kakao.maps.LatLng(pos.latlng.lat, pos.latlng.lng),
              title: pos.title,
            });

            const content = document.createElement("div");
            content.style.cssText = `
              position: relative;
              background: white;
              padding: 12px 16px;
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
              font-size: 13px;
              width: 220px;
              line-height: 1.6;
            `;
            content.innerHTML = `
              <div style="position: absolute; top: 8px; right: 10px; cursor: pointer; font-weight: bold; color: #888;" class="close-btn">❌</div>
              <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">📍 ${pos.title}</div>
              <div>👤 <b>대표자:</b> ${pos.ceo}</div>
              <div>📞 <b>연락처:</b> ${pos.phone}</div>
              <div>♻️ <b>폐기물:</b> ${pos.type}</div>
            `;

            const overlay = new window.kakao.maps.CustomOverlay({
              content,
              position: new window.kakao.maps.LatLng(pos.latlng.lat, pos.latlng.lng),
              yAnchor: 1.2,
            });

            content.querySelector(".close-btn")?.addEventListener("click", () => {
              overlay.setMap(null);
              currentOverlay.current = null;
            });

            marker.addListener("click", () => {
              if (currentOverlay.current) currentOverlay.current.setMap(null);
              overlay.setMap(map);
              currentOverlay.current = overlay;
            });

            markerMap.current[pos.title] = marker;
            overlayMap.current[pos.title] = overlay;
          });
        });
      }
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoMapKey}&autoload=false`;
      script.async = true;
      script.onload = loadMap;
      document.head.appendChild(script);
    } else {
      loadMap();
    }
  }, [kakaoMapKey, positions]);

  useEffect(() => {
    if (!searchTerm || !mapInstance.current) return;

    const marker = markerMap.current[searchTerm];
    const overlay = overlayMap.current[searchTerm];
    const map = mapInstance.current;

    if (marker && overlay) {
      if (currentOverlay.current) currentOverlay.current.setMap(null);
      map.setCenter(marker.getPosition());
      overlay.setMap(map);
      currentOverlay.current = overlay;
    } else {
      alert("일치하는 업체를 찾을 수 없습니다.");
    }
  }, [searchTerm]);

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 bg-white z-10 shadow flex gap-2 items-center">
        <input
          type="text"
          placeholder="업체명을 입력하세요 (예: 서울시청)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setSearchTerm(inputValue.trim())}
          className="px-3 py-1 border rounded text-sm flex-1"
        />
        <button onClick={() => setSearchTerm(inputValue.trim())} className="px-4 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
          검색
        </button>
      </div>

      <div ref={mapRef} className="flex-1 w-full" />
    </div>
  );
}

export default KaKaoMap;
