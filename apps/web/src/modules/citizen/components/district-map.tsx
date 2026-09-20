'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { DISTRICT_BY_CODE, JHARKHAND_CENTER } from '@akhra/shared';

export interface DistrictMapProps {
  districtCode: string | null;
  value: { lat: number; lng: number } | null;
  onChange: (value: { lat: number; lng: number }) => void;
  label: string;
  hint: string;
}

export function DistrictMap({ districtCode, value, onChange, label, hint }: DistrictMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const center = useMemo(() => {
    const district = districtCode ? DISTRICT_BY_CODE[districtCode] : undefined;
    return district ? { lat: district.lat, lng: district.lng } : JHARKHAND_CENTER;
  }, [districtCode]);
  const viewRef = useRef({ center, zoom: districtCode ? 10 : 7 });
  viewRef.current = { center, zoom: districtCode ? 10 : 7 };

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
        [center.lat, center.lng],
        districtCode ? 10 : 7,
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      const icon = L.divIcon({
        className: '',
        html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#1d6a48;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      map.on('click', (event) => {
        const { lat, lng } = event.latlng;
        onChangeRef.current({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
      });

      if (value) {
        markerRef.current = L.marker([value.lat, value.lng], { icon }).addTo(map);
      }

      mapRef.current = map;
      let sized = containerRef.current.clientWidth > 0;
      resizeObserver = new ResizeObserver(([entry]) => {
        map.invalidateSize();
        if (!sized && entry && entry.contentRect.width > 0) {
          sized = true;
          const view = viewRef.current;
          map.setView([view.center.lat, view.center.lng], view.zoom);
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    let resizeObserver: ResizeObserver | null = null;
    void init();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], districtCode ? 10 : 7);
  }, [center, districtCode]);

  useEffect(() => {
    async function syncMarker() {
      const map = mapRef.current;
      if (!map || !value) return;
      const L = await import('leaflet');

      if (markerRef.current) {
        markerRef.current.setLatLng([value.lat, value.lng]);
        return;
      }
      markerRef.current = L.marker([value.lat, value.lng], {
        icon: L.divIcon({
          className: '',
          html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#1d6a48;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(map);
    }
    void syncMarker();
  }, [value]);

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-subtle text-xs">{hint}</p>
      <div
        ref={containerRef}
        role="application"
        aria-label={label}
        className="border-line h-64 w-full overflow-hidden rounded-md border"
      />
      {value && (
        <p className="text-subtle text-xs tabular-nums">
          {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
        </p>
      )}
    </div>
  );
}
