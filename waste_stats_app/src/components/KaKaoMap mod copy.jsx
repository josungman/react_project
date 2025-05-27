// 전체 코드가 길어 중략 후 마커 클릭 시 오버레이 복원 포함된 전체 코드 다시 작성합니다

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import * as turf from "@turf/turf";
import RegionSelector from "./RegionSelector";
import ProductNameAutocomplete from "./ProductNameAutocomplete";
import { getDistance } from "../utils/geoUtils";

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
  const searchKeywordsRef = useRef([]);
  const searchLogicRef = useRef("and");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [loadingAutocomplete, setLoadingAutocomplete] = useState(false);

  const [searchKeywords, setSearchKeywords] = useState([]); // ✅ 키워드 리스트 상태
  const [searchLogic, setSearchLogic] = useState("and"); // ✅ AND / OR 선택 상태
  const [regionSearchTerm, setRegionSearchTerm] = useState("");
  const [regionList, setRegionList] = useState([]);
  const [nearbyList, setNearbyList] = useState([]);
  const [mode, setMode] = useState("");
  const [initialMarkersSet, setInitialMarkersSet] = useState(false);

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

    currentOverlayRef.current?.setMap(null);
    removeUserMarker();
    removePolygons();
    setRegionSearchTerm("");

    const marker = new window.kakao.maps.Marker({
      position: new window.kakao.maps.LatLng(lat, lng),
      map,
      title: "선택 위치",
    });
    userMarkerRef.current = marker;

    marker.addListener("click", () => {
      marker.setMap(null);
      userCircleRef.current?.setMap(null);
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

    const filteredPositions = searchKeywordsRef.current.length
      ? positions.filter((item) => {
          const product = item.product_name?.toLowerCase() || "";
          return searchLogicRef.current === "and" ? searchKeywordsRef.current.every((kw) => product.includes(kw)) : searchKeywordsRef.current.some((kw) => product.includes(kw));
        })
      : positions;

    const nearby = filteredPositions.filter((item) => getDistance(lat, lng, item.latlng.lat, item.latlng.lng) <= 5);

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
      const response = await axios.get("/geo/sido-sig/sido-sig-geo.json");
      const geojson = response.data;
      const map = mapInstance.current;
      currentOverlayRef.current?.setMap(null);
      removePolygons();
      removeUserMarker();

      const uniqueNames = new Set();
      geojson.features.forEach((f) => uniqueNames.add(f.properties.KOR_NM));
      setRegionList(Array.from(uniqueNames));

      geojson.features
        .filter((f) => filterName && f.properties.KOR_NM === filterName)
        .forEach((feature) => {
          const { type, coordinates } = feature.geometry;
          const bounds = new window.kakao.maps.LatLngBounds();
          const groups = type === "Polygon" ? [coordinates] : coordinates;

          groups.forEach((rings) => {
            const latlngs = rings.map((ring) => ring.map(([x, y]) => new window.kakao.maps.LatLng(y, x)));
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
            latlngs[0].forEach((latlng) => bounds.extend(latlng));
          });

          map.setBounds(bounds);
          const turfPolygon = turf.feature(feature.geometry);
          const filtered = positions
            .filter((item) => {
              const pt = turf.point([item.latlng.lng, item.latlng.lat]);
              return turf.booleanPointInPolygon(pt, turfPolygon);
            })
            .filter((item) => {
              const product = item.product_name?.toLowerCase() || "";
              return searchKeywordsRef.current.length === 0
                ? true
                : searchLogicRef.current === "and"
                ? searchKeywordsRef.current.every((kw) => product.includes(kw))
                : searchKeywordsRef.current.some((kw) => product.includes(kw));
            });

          setNearbyList(filtered);
          setMode("region");
        });
    } catch (err) {
      console.error("시도 폴리곤 로딩 실패:", err);
    }
  };

  useEffect(() => {
    if (initialMarkersSet) {
      setLoadingAutocomplete(true);
      const timer = setTimeout(() => {
        setShowAutocomplete(true);
        setLoadingAutocomplete(false);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowAutocomplete(false);
      setLoadingAutocomplete(false);
    }
  }, [initialMarkersSet]);

  useEffect(() => {
    searchKeywordsRef.current = searchKeywords;
  }, [searchKeywords]);

  useEffect(() => {
    // 키워드 변경 시 오버레이 닫기
    if (currentOverlayRef.current) {
      currentOverlayRef.current.setMap(null);
      currentOverlayRef.current = null;
    }
  }, [searchKeywords, searchLogic]);

  useEffect(() => {
    searchLogicRef.current = searchLogic;
  }, [searchLogic]);

  //수정 코드 추가
  useEffect(() => {
    if (!initialMarkersSet || !positions || positions.length === 0) return;

    if (mode === "distance" && userCircleRef.current && userCircleRef.current.getPosition) {
      const center = userCircleRef.current.getPosition();
      const lat = center.getLat();
      const lng = center.getLng();

      const filteredPositions = searchKeywordsRef.current.length
        ? positions.filter((item) => {
            const product = item.product_name?.toLowerCase() || "";
            return searchLogicRef.current === "and" ? searchKeywordsRef.current.every((kw) => product.includes(kw)) : searchKeywordsRef.current.some((kw) => product.includes(kw));
          })
        : positions;

      const nearby = filteredPositions.filter((item) => getDistance(lat, lng, item.latlng.lat, item.latlng.lng) <= 5);

      setNearbyList(nearby);
    } else if (mode === "region" && polygonsRef.current.length > 0) {
      const turfPolygons = polygonsRef.current.map((polygon) => {
        const path = polygon.getPath();

        // path가 LatLng[] 배열 여러 개일 수 있음 (즉, MultiPolygon 형태)
        const rings = Array.isArray(path[0])
          ? path.map((ring) => ring.map((latlng) => [latlng.getLng(), latlng.getLat()]))
          : [path.map((latlng) => [latlng.getLng(), latlng.getLat()])];

        return turf.polygon(rings);
      });

      const filtered = positions
        .filter((item) => {
          const pt = turf.point([item.latlng.lng, item.latlng.lat]);
          return turfPolygons.some((poly) => turf.booleanPointInPolygon(pt, poly));
        })
        .filter((item) => {
          const product = item.product_name?.toLowerCase() || "";
          return searchKeywordsRef.current.length === 0
            ? true
            : searchLogicRef.current === "and"
            ? searchKeywordsRef.current.every((kw) => product.includes(kw))
            : searchKeywordsRef.current.some((kw) => product.includes(kw));
        });

      setNearbyList(filtered);
    }
  }, [initialMarkersSet, searchKeywords, searchLogic, positions, mode]);

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
        map.addControl(new window.kakao.maps.ZoomControl(), window.kakao.maps.ControlPosition.RIGHT);
        mapInstance.current = map;
        clustererRef.current = new window.kakao.maps.MarkerClusterer({ map, averageCenter: true, minLevel: 6 });
        window.kakao.maps.event.addListener(map, "click", (e) => {
          const inputEl = document.getElementById("product-input");
          inputEl?.blur();
          placeUserMarker(e.latLng.getLat(), e.latLng.getLng());
        });
        setInitialMarkersSet(true);
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

  useEffect(() => {
    if (!initialMarkersSet) return;
    const map = mapInstance.current;
    const clusterer = clustererRef.current;
    if (!map || !clusterer) return;

    clusterer.clear();
    Object.values(markerMapRef.current).forEach((m) => m.setMap(null));
    markerMapRef.current = {};
    overlayMapRef.current = {};

    const markerImage = new window.kakao.maps.MarkerImage("/marker-icon.png", new window.kakao.maps.Size(26, 34), {
      offset: new window.kakao.maps.Point(18, 36),
    });

    // ✅ 기존 productSearchTerm 기반 코드 대신 여기에 삽입
    const filtered = positions.filter((pos) => {
      const product = pos.product_name?.toLowerCase() || "";
      if (searchKeywords.length === 0) return true;
      if (searchLogic === "and") {
        return searchKeywords.every((kw) => product.includes(kw));
      } else {
        return searchKeywords.some((kw) => product.includes(kw));
      }
    });

    const markers = filtered.map((pos) => {
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(pos.latlng.lat, pos.latlng.lng),
        title: pos.title,
        image: markerImage,
      });

      const getDuration = (text) => {
        const baseDuration = 8; // 기준 시간
        const lengthFactor = Math.max(text.length / 20, 1); // 길이 20 이하 → 최소 속도 유지
        return (baseDuration * lengthFactor).toFixed(1) + "s";
      };

      const addressDuration = getDuration(pos.address || "");
      const productDuration = getDuration(pos.product_name || "");

      const shouldAnimate = pos.address && pos.address.length > 10;
      const shouldAnimateProductName = pos.product_name && pos.product_name.length > 10;

      const addressHTML = shouldAnimate
        ? `
              <div style="overflow: hidden;width: 140px;height: 1.8em;position: relative;display: inline-block;vertical-align: middle;">
                <div style="display: inline-block;white-space: nowrap;animation: scrollText ${addressDuration} linear infinite;">
                  <span style="margin-right: 8px;">${pos.address}</span>
                  <span>${pos.address}</span>
                </div>
              </div>
            `
        : `<span>${pos.address}</span>`;

      const productNameHTML = shouldAnimateProductName
        ? `
              <div style="overflow: hidden;width: 140px;height: 1.8em;position: relative;display: inline-block;vertical-align: middle;">
                <div style="display: inline-block;white-space: nowrap;animation: scrollText ${productDuration} linear infinite;">
                  <span style="margin-right: 8px;">${pos.product_name}</span>
                  <span>${pos.product_name}</span>
                </div>
              </div>
            `
        : `<span>${pos.product_name ? pos.product_name : "-"}</span>`;

      const content = document.createElement("div");
      content.innerHTML = `
              <style>
                @keyframes scrollText {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-51%); }
                }
              </style>
              <div style="position:absolute;top:8px;right:10px;cursor:pointer;font-weight:bold;color:#888;" class="close-btn">❌</div>
              <div style="font-weight:bold;font-size:14px;margin-bottom:6px;">📍 ${pos.title}</div>
              <div>👤 <b>대표자:</b> ${pos.ceo}</div>
              <div>📞 <b>연락처:</b> ${pos.phone}</div>
              <div>🏦 <b style="display:inline;">주소:</b> ${addressHTML}</div>
              <div>♻️ <b>품목:</b> ${productNameHTML}</div>
            `;
      content.style.cssText = `position:relative;background:white;padding:12px 16px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-size:13px;width:220px;line-height:1.6;`;

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
  }, [positions, initialMarkersSet, searchKeywords, searchLogic]);

  return (
    <div className="flex flex-col h-full overflow-hidden relative ">
      <div className="h-[56px] px-4 bg-white  z-30 flex flex-col sm:flex-row items-center gap-2">
        <div className="flex items-center gap-2 sm:flex-row">
          <RegionSelector regionList={regionList} searchTerm={regionSearchTerm} setSearchTerm={setRegionSearchTerm} onSelect={initSidoPolygons} />
          <button onClick={moveToCurrentLocation} className="flex items-center gap-1 px-3 py-1 bg-gray-100 border rounded text-xm hover:bg-gray-200">
            <span className="block sm:hidden">📍</span>
            <span className="hidden sm:block">📍 현위치 이동</span>
          </button>
        </div>
        {loadingAutocomplete && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" />
            로딩 중...
          </div>
        )}

        {showAutocomplete && (
          <ProductNameAutocomplete keywords={searchKeywords} setKeywords={setSearchKeywords} searchLogic={searchLogic} setSearchLogic={setSearchLogic} positions={positions} />
        )}
      </div>
      {nearbyList.length > 0 && (
        <div className="absolute top-[60px] left-2 bg-white shadow pl-4 rounded max-h-[240px] w-[260px] overflow-y-auto z-20 text-sm  mt-8 sm:mt-0">
          <div className="sticky top-0 bg-white z-10 py-2 border-b font-semibold">
            {mode === "region" ? `📍 범위 내 업체 목록 (${nearbyList.length}개)` : `📍 반경 5km 업체 목록 (${nearbyList.length}개)`}
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
                    map.setLevel(6);
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

      <div ref={mapRef} className="flex-1 w-full mt-8 sm:mt-0 " />
    </div>
  );
}

export default KaKaoMap;
