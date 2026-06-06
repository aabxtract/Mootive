import { useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATUSES } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';
import RouteSummaryCard from '../components/RouteSummaryCard';
import DeliveryTimeline from '../components/DeliveryTimeline';
import * as api from '../lib/api';

export default function ReceiverDeliveryDetail() {
  const { back, navigate, VIEWS, delivery, deliveryEvents, setDelivery } = useApp();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  if (!delivery) return null;
  const info = STATUSES[delivery.status] || { label: delivery.status, tone: 'slate' };
  const canConfirm = delivery.status === 'DELIVERED';

  const confirm = async () => {
    setErr(null); setLoading(true);
    try {
      const res = await api.confirmDelivery(delivery.deliveryId);
      setDelivery(res.delivery);
      navigate(VIEWS.completed);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full px-5 pt-5 pb-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={back} className="text-slate-500 p-1"><ArrowLeft size={20} /></button>
        <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
        <div className="w-8" />
      </div>

      <h2 className="text-lg font-bold text-slate-900 mb-4">
        {canConfirm ? 'Confirm your delivery' : 'Your package is on the way'}
      </h2>

      <RouteSummaryCard delivery={delivery} />

      <div className="mt-5">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Delivery Progress</h3>
        <DeliveryTimeline delivery={delivery} events={deliveryEvents} />
      </div>

      {err && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg mt-3">{err}</p>}

      <div className="mt-auto space-y-2 pt-4">
        <button onClick={confirm} disabled={!canConfirm || loading} className="w-full py-3.5 rounded-2xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold text-sm shadow-md inline-flex items-center justify-center gap-2 active:scale-95 transition">
          <CheckCircle2 size={16} /> {loading ? 'Confirming...' : 'Confirm Delivery'}
        </button>
        <button onClick={() => navigate(VIEWS.reportIssue)} className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 transition">
          <AlertTriangle size={13} /> I did not receive this
        </button>
      </div>
    </div>
  );
}
