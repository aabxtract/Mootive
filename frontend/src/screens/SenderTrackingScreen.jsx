import React, { useEffect } from 'react';
import { ArrowLeft, RefreshCw, MapPin, ArrowRight, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATUSES } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';
import Timeline from '../components/Timeline';
import RecommendationCard from '../components/RecommendationCard';
import MapView from '../components/MapView';

export default function SenderTrackingScreen() {
  const { back, navigate, VIEWS, delivery, deliveryEvents, refreshDelivery } = useApp();

  useEffect(() => {
    if (!delivery?.deliveryId) return;
    const t = setInterval(() => refreshDelivery(delivery.deliveryId).catch(() => {}), 8000);
    return () => clearInterval(t);
  }, [delivery?.deliveryId]);

  if (!delivery) return null;
  const info = STATUSES[delivery.status] || { label: delivery.status, tone: 'slate' };

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <button onClick={back} className="text-slate-500"><ArrowLeft size={18} /></button>
        <button onClick={() => refreshDelivery(delivery.deliveryId)} className="text-slate-400 p-1"><RefreshCw size={14} /></button>
      </div>

      <div className="space-y-1 mb-4">
        <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
        <h2 className="text-xl font-bold text-slate-900 mt-1.5">Your delivery</h2>
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin size={11} className="text-orange-500" />
          <span className="truncate">{delivery.pickupArea || delivery.pickupAddress}</span>
          <ArrowRight size={11} className="text-slate-400 shrink-0" />
          <span className="truncate">{delivery.dropoffArea || delivery.dropoffAddress}</span>
        </div>
      </div>

      <MapView
        pickup={{ lat: delivery.pickupLat, lng: delivery.pickupLng }}
        dropoff={{ lat: delivery.dropoffLat, lng: delivery.dropoffLng }}
        height={180}
      />

      <div className="mt-4 space-y-3">
        <RecommendationCard delivery={delivery} />

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Timeline</h4>
          <Timeline events={deliveryEvents} />
        </div>

        <button onClick={() => navigate(VIEWS.reportIssue)} className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95">
          <AlertTriangle size={13} /> Report an issue
        </button>
      </div>
    </div>
  );
}
