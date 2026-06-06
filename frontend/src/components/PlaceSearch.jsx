import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { withIdentityPoolId } from '@aws/amazon-location-utilities-auth-helper';
import { LocationClient, SearchPlaceIndexForTextCommand } from '@aws-sdk/client-location';
import { env } from '../lib/auth';

export default function PlaceSearch({ label, value, onPick, placeholder = 'Search address...' }) {
  const [text, setText] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const clientRef = useRef(null);
  const tRef = useRef(null);

  useEffect(() => { setText(value || ''); }, [value]);

  useEffect(() => {
    (async () => {
      if (!env.identityPoolId) return;
      const helper = await withIdentityPoolId(env.identityPoolId);
      clientRef.current = new LocationClient({ region: env.region, ...helper.getLocationClientConfig() });
    })();
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setText(v);
    setOpen(true);
    if (tRef.current) clearTimeout(tRef.current);
    if (!clientRef.current || v.length < 3) { setResults([]); return; }
    tRef.current = setTimeout(async () => {
      try {
        const res = await clientRef.current.send(new SearchPlaceIndexForTextCommand({
          IndexName: env.placeIndexName,
          Text: v,
          FilterCountries: ['NGA'],
          MaxResults: 5,
          BiasPosition: [3.379, 6.524],
        }));
        setResults(res.Results || []);
      } catch (err) { console.warn('place search:', err.message); }
    }, 300);
  };

  const pick = (r) => {
    const place = r.Place;
    const [lng, lat] = place.Geometry.Point;
    const label = place.Label;
    setText(label);
    setOpen(false);
    onPick({ address: label, area: place.Municipality || place.SubRegion || null, lat, lng });
  };

  return (
    <div className="relative">
      {label && <label className="text-xs font-bold text-slate-600 block mb-1">{label}</label>}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={text}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <button key={i} onClick={() => pick(r)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0">
              {r.Place.Label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
