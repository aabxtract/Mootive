import { useEffect } from 'react';
import { ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATUSES } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';
import RouteSummaryCard from '../components/RouteSummaryCard';
import DeliveryTimeline from '../components/DeliveryTimeline';

export default function SenderTracking() {
  const { back, navigate, VIEWS, delivery, deliveryEvents, refreshDelivery } = useApp();

  useEffect(() => {
    if (!delivery?.deliveryId) return;
    const t = setInterval(() => refreshDelivery(delivery.deliveryId).catch(() => {}), 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery?.deliveryId]);

  if (!delivery) return null;
  const info = STATUSES[delivery.status] || { label: delivery.status, tone: 'slate' };

  return (
    <div className="flex flex-col h-full px-5 pt-5 pb-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={back} className="text-slate-500 p-1"><ArrowLeft size={20} /></button>
        <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
        <button onClick={() => refreshDelivery(delivery.deliveryId)} className="text-slate-400 p-1"><RefreshCw size={16} /></button>
      </div>

      <h2 className="text-lg font-bold text-slate-900 mb-4">Tracking</h2>

      <RouteSummaryCard delivery={delivery} />

      <div className="mt-5">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Delivery Progress</h3>
        <DeliveryTimeline delivery={delivery} events={deliveryEvents} />
      </div>

      <button onClick={() => navigate(VIEWS.reportIssue)} className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 transition mt-4">
        <AlertTriangle size={13} /> Report an issue
      </button>
    </div>
  );
}
