import React, { useState } from 'react';
import { ArrowLeft, MapPin, ArrowRight, Package } from 'lucide-react';
import { useApp } from '../context/AppContext';
import RecommendationCard from '../components/RecommendationCard';
import MapView from '../components/MapView';
import { formatNaira } from '../lib/constants';

export default function JobDetailScreen() {
  const { back, navigate, VIEWS, delivery, claimJob } = useApp();
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!delivery) return null;

  const accept = async () => {
    setErr(null); setLoading(true);
    try {
      await claimJob(delivery.deliveryId);
      navigate(VIEWS.driverRoute);
    } catch (e) {
      setErr(e.status === 409 ? 'Another driver beat you to it.' : e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-8 overflow-y-auto">
      <button onClick={back} className="self-start mb-3 text-slate-500"><ArrowLeft size={18} /></button>

      <div className="flex items-center gap-1.5 text-xs text-slate-700">
        <MapPin size={11} className="text-orange-500" />
        <span className="font-bold truncate">{delivery.pickupArea || delivery.pickupAddress}</span>
        <ArrowRight size={11} className="text-slate-400 shrink-0" />
        <span className="font-bold truncate">{delivery.dropoffArea || delivery.dropoffAddress}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 mt-2">{formatNaira(delivery.totalDeliveryFee)}</p>

      <div className="mt-4">
        <MapView pickup={{ lat: delivery.pickupLat, lng: delivery.pickupLng }} dropoff={{ lat: delivery.dropoffLat, lng: delivery.dropoffLng }} height={180} />
      </div>

      <div className="space-y-2 mt-4">
        <Row icon={Package} label="Package" value={`${delivery.packageType} · ${delivery.urgency}`} />
        <Row label="Distance" value={delivery.estimatedDistance ? `${delivery.estimatedDistance} km` : '—'} />
        <Row label="Risk" value={delivery.riskScore} />
      </div>

      <div className="mt-4">
        <RecommendationCard delivery={delivery} />
      </div>

      {err && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mt-3">{err}</p>}

      <button onClick={accept} disabled={loading} className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm shadow-md mt-auto active:scale-95">
        {loading ? 'Accepting…' : 'Accept Job'}
      </button>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-500 inline-flex items-center gap-1.5">{Icon && <Icon size={12} />}{label}</span>
      <span className="font-bold text-slate-800">{value || '—'}</span>
    </div>
  );
}
