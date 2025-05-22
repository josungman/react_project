import { useEffect, useRef, useState } from "react";
import axios from "axios";
import * as turf from "@turf/turf";

function KaKaoMap({ kakaoMapKey, positions, onLoaded }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const clustererRef = useRef(null);
  const markerMapRef = useRef({});
  const overlayMapRef = useRef({});
  const currentOverlayRef = useRef(null);
  const userMarkerRef = useRef(null);
  const userCircleRef = useRef(null);
  const polygonsRef = useRef([]);
  const customOverlayRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [regionList, setRegionList] = useState([]);
  const [nearbyList, setNearbyList] = useState([]);
  const [mode, setMode] = useState(""); // "distance" or "region"

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const removePolygons = () => {
    polygonsRef.current.forEach((polygon) => polygon.setMap(null));
    polygonsRef.current = [];
  };

  const removeUserMarker = () => {
    userMarkerRef.current?.setMap(null);
    userMarkerRef.current = null;
    userCircleRef.current?.setMap(null);
    userCircleRef.current = null;
  };

  const placeUserMarker = (lat, lng) => {
    const map = mapInstance.current;
    if (!map) return;

    // ✅ 오버레이 닫기
    if (currentOverlayRef.current) {
      currentOverlayRef.current.setMap(null);
      currentOverlayRef.current = null;
    }

    removeUserMarker();
    removePolygons();
    setSearchTerm("");

    const marker = new window.kakao.maps.Marker({
      position: new window.kakao.maps.LatLng(lat, lng),
      map,
      title: "선택 위치",
    });
    userMarkerRef.current = marker;

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
    setMode("distance");
  };

  const moveToCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("이 브라우저는 위치를 지원하지 않습니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const latlng = new window.kakao.maps.LatLng(lat, lng);
      mapInstance.current?.setCenter(latlng);
      mapInstance.current?.setLevel(6);

      placeUserMarker(lat, lng);
    });
  };

  const initSidoPolygons = async (filterName = null) => {
    try {
      const response = await axios.get("/geo/sig/sig-geo.json");
      const geojson = response.data;
      const map = mapInstance.current;

      // ✅ 오버레이 닫기
      if (currentOverlayRef.current) {
        currentOverlayRef.current.setMap(null);
        currentOverlayRef.current = null;
      }

      removePolygons();
      removeUserMarker();

      const uniqueNames = new Set();
      geojson.features.forEach((f) => uniqueNames.add(f.properties.SIG_KOR_NM));
      setRegionList(Array.from(uniqueNames));

      geojson.features
        .filter((f) => filterName && f.properties.SIG_KOR_NM === filterName)
        .forEach((feature) => {
          const name = feature.properties.SIG_KOR_NM;
          const coords = feature.geometry.coordinates[0];
          const latlngs = coords.map((c) => new window.kakao.maps.LatLng(c[1], c[0]));

          const polygon = new window.kakao.maps.Polygon({
            path: latlngs,
            strokeWeight: 2,
            strokeColor: "#004c80",
            strokeOpacity: 0.8,
            fillColor: "#fff",
            fillOpacity: 0.6,
            map,
          });

          polygonsRef.current.push(polygon);

          const bounds = new window.kakao.maps.LatLngBounds();
          latlngs.forEach((latlng) => bounds.extend(latlng));
          map.setBounds(bounds);

          const turfPolygon = turf.polygon([coords]);
          const filtered = positions.filter((item) => {
            const pt = turf.point([item.latlng.lng, item.latlng.lat]);
            return turf.booleanPointInPolygon(pt, turfPolygon);
          });
          setNearbyList(filtered);
          setMode("region");
        });
    } catch (err) {
      console.error("시도 폴리곤 로딩 실패:", err);
    }
  };

  const handleRegionChange = (e) => {
    const selected = e.target.value;
    setSearchTerm(selected);
    initSidoPolygons(selected);
  };

  useEffect(() => {
    if (!kakaoMapKey || !positions?.length) return;

    const scriptId = "kakao-map-script";
    const existingScript = document.getElementById(scriptId);

    const loadMap = () => {
      window.kakao.maps.load(() => {
        const map = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(36.5, 127.5),
          level: 7,
          minLevel: 5,
          maxLevel: 12,
        });

        mapInstance.current = map;

        // ✅ 줌 컨트롤 추가
        map.addControl(new window.kakao.maps.ZoomControl(), window.kakao.maps.ControlPosition.RIGHT);

        const clusterer = new window.kakao.maps.MarkerClusterer({
          map,
          averageCenter: true,
          minLevel: 6,
        });
        clustererRef.current = clusterer;

        const markerImage = new window.kakao.maps.MarkerImage("/marker-icon.png", new window.kakao.maps.Size(26, 34), {
          offset: new window.kakao.maps.Point(18, 36),
        });

        const markers = positions.map((pos) => {
          const marker = new window.kakao.maps.Marker({
            position: new window.kakao.maps.LatLng(pos.latlng.lat, pos.latlng.lng),
            title: pos.title,
            image: markerImage,
          });

          const content = document.createElement("div");
          content.innerHTML = `
            <div style="position:absolute;top:8px;right:10px;cursor:pointer;font-weight:bold;color:#888;" class="close-btn">❌</div>
            <div style="font-weight:bold;font-size:14px;margin-bottom:6px;">📍 ${pos.title}</div>
            <div>👤 <b>대표자:</b> ${pos.ceo}</div>
            <div>📞 <b>연락처:</b> ${pos.phone}</div>
            <div>♻️ <b>위탁폐기물:</b> ${pos.type}</div>
          `;
          content.style.cssText = `
            position:relative;
            background:white;
            padding:12px 16px;
            border-radius:10px;
            box-shadow:0 2px 8px rgba(0,0,0,0.15);
            font-size:13px;
            width:220px;
            line-height:1.6;
          `;

          const overlay = new window.kakao.maps.CustomOverlay({
            content,
            position: new window.kakao.maps.LatLng(pos.latlng.lat, pos.latlng.lng),
            yAnchor: 1.2,
          });

          content.querySelector(".close-btn")?.addEventListener("click", () => {
            overlay.setMap(null);
            if (currentOverlayRef.current === overlay) currentOverlayRef.current = null;
          });

          marker.addListener("click", () => {
            if (currentOverlayRef.current === overlay) {
              overlay.setMap(null);
              currentOverlayRef.current = null;
            } else {
              currentOverlayRef.current?.setMap(null);
              overlay.setMap(map);
              currentOverlayRef.current = overlay;
            }
          });

          markerMapRef.current[pos.title] = marker;
          overlayMapRef.current[pos.title] = overlay;

          return marker;
        });

        clusterer.addMarkers(markers);

        window.kakao.maps.event.addListener(map, "click", (e) => {
          placeUserMarker(e.latLng.getLat(), e.latLng.getLng());
        });

        onLoaded?.();
      });
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoMapKey}&autoload=false&libraries=services,clusterer`;
      script.async = true;
      script.onload = loadMap;
      document.head.appendChild(script);
    } else {
      loadMap();
    }

    initSidoPolygons(null);
  }, [kakaoMapKey, positions]);

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="h-[56px] px-4 bg-white shadow z-10 flex items-center gap-2">
        <select onChange={handleRegionChange} value={searchTerm} className="px-3 py-1 border rounded text-sm">
          <option value="">시군구 선택</option>
          {regionList.map((name, idx) => (
            <option key={idx} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button onClick={moveToCurrentLocation} className="px-3 py-1 bg-gray-100 border rounded text-sm hover:bg-gray-200">
          현재 위치
        </button>
      </div>

      {nearbyList.length > 0 && (
        <div className="absolute top-[60px] left-2 bg-white shadow pl-2 rounded max-h-[240px] w-[260px] overflow-y-auto z-20 text-sm">
          <div className="sticky top-0 bg-white z-10 py-2 border-b font-semibold">
            {mode === "region" ? `📍 시군구 업체 목록 (${nearbyList.length}개)` : `📍 반경 5km 업체 목록 (${nearbyList.length}개)`}
          </div>
          <ul className="mt-1 space-y-1">
            {nearbyList.map((item, i) => (
              <li
                key={i}
                onClick={() => {
                  const marker = markerMapRef.current[item.title];
                  const overlay = overlayMapRef.current[item.title];
                  const map = mapInstance.current;
                  if (marker && overlay && map) {
                    map.setLevel(4);
                    map.setCenter(marker.getPosition());
                    currentOverlayRef.current?.setMap(null);
                    overlay.setMap(map);
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
