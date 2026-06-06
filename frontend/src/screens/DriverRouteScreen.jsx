import React, { useEffect, useState } from 'react';
import { ArrowLeft, Navigation, MapPin, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MapView from '../components/MapView';
import StatusBadge from '../components/StatusBadge';
import { STATUSES } from '../lib/constants';

const NEXT_BY_STATUS = {
  DRIVER_ACCEPTED: { label: 'Mark Picked Up', next: 'PICKED_UP' },
  ROUTE_OPTIMIZED: { label: 'Mark Picked Up', next: 'PICKED_UP' },
  PICKED_UP:       { label: 'Start Trip',     next: 'IN_TRANSIT' },
  IN_TRANSIT:      { label: 'Mark Delivered', next: 'DELIVERED' },
};

export default function DriverRouteScreen() {
  const { back, navigate, VIEWS, delivery, callOptimizeRoute, advanceStatus } = useApp();
  const [optimizing, setOptimizing] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!delivery?.deliveryId) return;
    if (delivery.routeId) return;
    setOptimizing(true);
    callOptimizeRoute(delivery.deliveryId).catch(e => setErr(e.message)).finally(() => setOptimizing(false));
  }, []);

  if (!delivery) return null;
  const info = STATUSES[delivery.status] || { label: delivery.status, tone: 'slate' };
  const action = NEXT_BY_STATUS[delivery.status];

  const click = async () => {
    if (!action) return;
    setErr(null); setBusy(true);
    try {
      await advanceStatus(delivery.deliveryId, action.next);
      if (action.next === 'DELIVERED') navigate(VIEWS.driverHome);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-8 overflow-y-auto">
      <button onClick={back} className="self-start mb-3 text-slate-500"><ArrowLeft size={18} /></button>
      <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
      <h2 className="text-xl font-bold text-slate-900 mt-2">Route</h2>

      <div className="flex items-center gap-1.5 text-xs text-slate-700 mt-1">
        <MapPin size={11} className="text-orange-500" />
        <span className="truncate">{delivery.pickupArea || delivery.pickupAddress}</span>
        <ArrowRight size={11} className="text-slate-400 shrink-0" />
        <span className="truncate">{delivery.dropoffArea || delivery.dropoffAddress}</span>
      </div>

      <div className="mt-3">
        <MapView pickup={{ lat: delivery.pickupLat, lng: delivery.pickupLng }} dropoff={{ lat: delivery.dropoffLat, lng: delivery.dropoffLng }} height={220} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Stat icon={Navigation} label="Distance" value={delivery.estimatedDistance ? `${delivery.estimatedDistance} km` : optimizing ? '…' : '—'} />
        <Stat icon={Clock} label="ETA" value={delivery.estimatedDuration ? `${delivery.estimatedDuration} min` : optimizing ? '…' : '—'} />
      </div>

      {delivery.routeSummary && (
        <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 flex gap-2">
          <Sparkles size={14} className="text-orange-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-700 leading-relaxed">{delivery.routeSummary}</p>
        </div>
      )}

      {err && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mt-3">{err}</p>}

      {action && (
        <button onClick={click} disabled={busy} className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm shadow-md mt-auto active:scale-95">
          {busy ? 'Updating…' : action.label}
        </button>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide inline-flex items-center gap-1"><Icon size={10} />{label}</p>
      <p className="text-sm font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}
