import React, { useEffect } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function FindingDriversScreen() {
  const { delivery, navigate, VIEWS, refreshDelivery } = useApp();

  useEffect(() => {
    if (!delivery?.deliveryId) return;
    refreshDelivery(delivery.deliveryId).catch(() => {});
    const t = setTimeout(() => navigate(VIEWS.senderTracking), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col h-full px-6 pt-10 pb-8 items-center justify-center text-center space-y-5">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg animate-pulse">
        <Sparkles size={32} className="text-white" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Finding nearby drivers…</h2>
      <p className="text-xs text-slate-500 max-w-xs">
        Claude is checking trust score, pickup time, fair price, and delivery risk.
      </p>
      <Loader2 className="animate-spin text-orange-500" size={20} />
    </div>
  );
}
