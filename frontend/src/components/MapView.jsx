import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { withIdentityPoolId } from '@aws/amazon-location-utilities-auth-helper';
import { env } from '../lib/auth';

export default function MapView({ pickup, dropoff, height = 200 }) {
  const ref = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ref.current || !env.identityPoolId || !env.mapName) return;
      try {
        const helper = await withIdentityPoolId(env.identityPoolId);
        if (cancelled) return;
        const map = new maplibregl.Map({
          container: ref.current,
          style: `https://maps.geo.${env.region}.amazonaws.com/maps/v0/maps/${env.mapName}/style-descriptor`,
          center: pickup ? [pickup.lng, pickup.lat] : [3.379, 6.524], // Lagos default
          zoom: 11,
          ...helper.getMapAuthenticationOptions(),
        });
        mapRef.current = map;

        if (pickup) new maplibregl.Marker({ color: '#f97316' }).setLngLat([pickup.lng, pickup.lat]).addTo(map);
        if (dropoff) new maplibregl.Marker({ color: '#22c55e' }).setLngLat([dropoff.lng, dropoff.lat]).addTo(map);
        if (pickup && dropoff) {
          const bounds = new maplibregl.LngLatBounds([pickup.lng, pickup.lat], [pickup.lng, pickup.lat]);
          bounds.extend([dropoff.lng, dropoff.lat]);
          map.fitBounds(bounds, { padding: 40, maxZoom: 13 });
        }
      } catch (e) {
        console.warn('Map init failed:', e.message);
      }
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  if (!env.identityPoolId) {
    return (
      <div style={{ height }} className="rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] text-slate-500 text-center px-4">
        Map disabled — VITE_IDENTITY_POOL_ID not set.
      </div>
    );
  }
  return <div ref={ref} style={{ height }} className="rounded-2xl overflow-hidden border border-slate-200" />;
}
