import { useEffect, useRef, useState } from "react";

function KaKaoMap({ kakaoMapKey, positions, onLoaded }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const clustererRef = useRef(null);
  const markerMapRef = useRef({});
  const overlayMapRef = useRef({});
  const currentOverlayRef = useRef(null);
  const userMarkerRef = useRef(null);
  const userCircleRef = useRef(null);

  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [nearbyList, setNearbyList] = useState([]);

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const placeUserMarker = (lat, lng) => {
    const map = mapInstance.current;
    if (!map) return;

    if (currentOverlayRef.current) {
      currentOverlayRef.current.setMap(null);
      currentOverlayRef.current = null;
    }

    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    if (userCircleRef.current) userCircleRef.current.setMap(null);

    const marker = new window.kakao.maps.Marker({
      position: new window.kakao.maps.LatLng(lat, lng),
      map,
      title: "선택 위치",
    });
    userMarkerRef.current = marker;
    marker.addListener("click", () => {
      marker.setMap(null);
      if (userCircleRef.current) userCircleRef.current.setMap(null);
      userMarkerRef.current = null;
      userCircleRef.current = null;
      setNearbyList([]);
    });

    const circle = new window.kakao.maps.Circle({
      center: new window.kakao.maps.LatLng(lat, lng),
      radius: 5000,
      strokeWeight: 2,
      strokeColor: "#007bff",
      strokeOpacity: 0.8,
      fillColor: "#cce5ff",
      fillOpacity: 0.4,
      map,
    });
    userCircleRef.current = circle;

    const nearby = positions.filter((item) => getDistance(lat, lng, item.latlng.lat, item.latlng.lng) <= 5);
    setNearbyList(nearby);
  };

  useEffect(() => {
    if (!kakaoMapKey || !positions || positions.length === 0) return;

    const scriptId = "kakao-map-script";
    const existingScript = document.getElementById(scriptId);

    const loadMap = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          const map = new window.kakao.maps.Map(mapRef.current, {
            center: new window.kakao.maps.LatLng(36.5, 127.5),
            level: 7,
            minLevel: 5,
            maxLevel: 12,
          });

          mapInstance.current = map;

          const zoomControl = new window.kakao.maps.ZoomControl();
          map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

          const clusterer = new window.kakao.maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 6,
          });

          clustererRef.current = clusterer;

          const markers = positions.map((pos) => {
            const marker = new window.kakao.maps.Marker({
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
              if (currentOverlayRef.current === overlay) {
                currentOverlayRef.current = null;
              }
            });

            marker.addListener("click", () => {
              if (currentOverlayRef.current && currentOverlayRef.current !== overlay) {
                currentOverlayRef.current.setMap(null);
              }
              overlay.setMap(map);
              currentOverlayRef.current = overlay;
            });

            markerMapRef.current[pos.title] = marker;
            overlayMapRef.current[pos.title] = overlay;

            return marker;
          });

          clusterer.addMarkers(markers);

          window.kakao.maps.event.addListener(map, "click", (mouseEvent) => {
            const lat = mouseEvent.latLng.getLat();
            const lng = mouseEvent.latLng.getLng();
            placeUserMarker(lat, lng);
          });

          // ✅ onLoaded 콜백 실행
          onLoaded?.();
        });
      }
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoMapKey}&autoload=false&libraries=clusterer`;
      script.async = true;
      script.onload = loadMap;
      document.head.appendChild(script);
    } else {
      loadMap();
    }
  }, [kakaoMapKey, positions]);

  useEffect(() => {
    if (!searchTerm || !mapInstance.current) return;
    const marker = markerMapRef.current[searchTerm];
    const overlay = overlayMapRef.current[searchTerm];
    const map = mapInstance.current;

    if (marker && overlay) {
      map.setCenter(marker.getPosition());
      if (currentOverlayRef.current) {
        currentOverlayRef.current.setMap(null);
      }
      overlay.setMap(map);
      currentOverlayRef.current = overlay;
    } else {
      alert("일치하는 업체를 찾을 수 없습니다.");
    }
  }, [searchTerm]);

  const moveToCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("이 브라우저는 위치를 지원하지 않습니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (mapInstance.current) {
        const latlng = new window.kakao.maps.LatLng(lat, lng);
        mapInstance.current.setCenter(latlng);
        mapInstance.current.setLevel(6);
        placeUserMarker(lat, lng);
      }
    });
  };

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (trimmed === "") return;

    if (searchTerm === trimmed) {
      setSearchTerm("");
      setTimeout(() => setSearchTerm(trimmed), 0);
    } else {
      setSearchTerm(trimmed);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="h-[56px] px-4 bg-white shadow z-10 flex items-center gap-2">
        <input
          type="text"
          placeholder="업체명을 입력하세요 (예: 테스트장소)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="px-3 py-1 border rounded text-sm flex-1"
        />
        <button onClick={handleSearch} className="flex items-center gap-1 px-3 py-1 bg-gray-100 border rounded text-sm hover:bg-gray-200">
          <span className="block sm:hidden">🔍</span>
          <span className="hidden sm:block">검색</span>
        </button>

        <button onClick={moveToCurrentLocation} className="flex items-center gap-1 px-3 py-1 bg-gray-100 border rounded text-sm hover:bg-gray-200">
          <span className="block sm:hidden">📍</span>
          <span className="hidden sm:block">현재 위치</span>
        </button>
      </div>

      {nearbyList.length > 0 && (
        <div className="absolute top-[60px] left-2 bg-white shadow pl-2 rounded max-h-[240px] w-[260px] overflow-y-auto z-20 text-sm">
          <div className="sticky top-0 bg-white z-10 py-2 border-b font-semibold">📍 반경 5km 업체 ({nearbyList.length}개)</div>
          <ul className="mt-1 space-y-1">
            {nearbyList.map((item, i) => (
              <li
                key={i}
                onClick={() => {
                  const marker = markerMapRef.current[item.title];
                  const overlay = overlayMapRef.current[item.title];
                  if (marker && overlay && mapInstance.current) {
                    mapInstance.current.setCenter(marker.getPosition());
                    if (currentOverlayRef.current) {
                      currentOverlayRef.current.setMap(null);
                    }
                    overlay.setMap(mapInstance.current);
                    currentOverlayRef.current = overlay;
                  }
                }}
                className="border-b pb-1 cursor-pointer hover:text-blue-600"
              >
                {item.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div ref={mapRef} className="flex-1 w-full" />
    </div>
  );
}

export default KaKaoMap;
