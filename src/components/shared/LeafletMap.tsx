import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { DEFAULT_LAT, DEFAULT_LNG } from '../../lib/constants';

interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  popupText?: string;
  type?: 'store' | 'customer' | 'agent';
}

interface LeafletMapProps {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  markers?: MapMarker[];
  showRoute?: boolean;
  interactiveSelect?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}

// Fix default leaflet marker icons path issues in Vite
const storeIcon = L.divIcon({
  html: `<div style="background-color: #2563eb; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white;">🏪</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const customerIcon = L.divIcon({
  html: `<div style="background-color: #10b981; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white;">🏠</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const agentIcon = L.divIcon({
  html: `<div style="background-color: #f97316; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 6px 14px rgba(249,115,22,0.4); border: 2px solid white; animation: pulse 2s infinite;">🛵</div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export const LeafletMap: React.FC<LeafletMapProps> = ({
  centerLat = DEFAULT_LAT,
  centerLng = DEFAULT_LNG,
  zoom = 14,
  markers = [],
  showRoute = false,
  interactiveSelect = false,
  onLocationSelect,
  height = '320px',
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const hasFittedBoundsRef = useRef<boolean>(false);
  const prevMarkerCountRef = useRef<number>(0);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: zoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      markersGroupRef.current = L.layerGroup().addTo(map);

      if (interactiveSelect) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          if (selectedMarkerRef.current) {
            selectedMarkerRef.current.setLatLng([lat, lng]);
          } else {
            selectedMarkerRef.current = L.marker([lat, lng], { icon: customerIcon })
              .addTo(map)
              .bindPopup('الموقع المحدد للتوصيل 📍')
              .openPopup();
          }
          if (onLocationSelect) {
            onLocationSelect(lat, lng);
          }
        });
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map center & markers reactively
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (markersGroupRef.current) {
      markersGroupRef.current.clearLayers();
    }

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    const latLngs: [number, number][] = [];

    markers.forEach((m) => {
      let icon = customerIcon;
      if (m.type === 'store') icon = storeIcon;
      if (m.type === 'agent') icon = agentIcon;

      const marker = L.marker([m.lat, m.lng], { icon });
      if (m.popupText) {
        marker.bindPopup(`
          <div style="direction: rtl; text-align: right; font-family: 'Cairo', sans-serif;">
            <strong style="font-size: 14px; color: #1e293b;">${m.title}</strong>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">${m.popupText}</p>
          </div>
        `);
      }
      marker.addTo(markersGroupRef.current!);
      latLngs.push([m.lat, m.lng]);
    });

    const isNewMarkerSet = prevMarkerCountRef.current !== markers.length;
    prevMarkerCountRef.current = markers.length;

    if (showRoute && latLngs.length >= 2) {
      routeLineRef.current = L.polyline(latLngs, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8',
      }).addTo(map);

      if (!hasFittedBoundsRef.current || isNewMarkerSet) {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [40, 40] });
        hasFittedBoundsRef.current = true;
      }
    } else if (markers.length > 0 && !interactiveSelect) {
      if (!hasFittedBoundsRef.current || isNewMarkerSet) {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
        hasFittedBoundsRef.current = true;
      }
    } else {
      map.setView([centerLat, centerLng], zoom);
    }
  }, [markers, centerLat, centerLng, zoom, showRoute]);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-slate-200 shadow-sm ${className}`}>
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
      {interactiveSelect && (
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md border border-slate-200 text-xs text-slate-700 font-medium z-[400] flex items-center gap-1.5">
          <span>📍</span>
          <span>انقر على الخريطة لتحديد عنوان التوصيل</span>
        </div>
      )}
    </div>
  );
};
