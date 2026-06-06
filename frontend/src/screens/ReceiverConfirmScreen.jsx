import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATUSES } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';
import * as api from '../lib/api';

export default function ReceiverConfirmScreen() {
  const { back, navigate, VIEWS, delivery, setDelivery } = useApp();
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
    <div className="flex flex-col h-full px-6 pt-6 pb-8">
      <button onClick={back} className="self-start mb-3 text-slate-500"><ArrowLeft size={18} /></button>
      <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
      <h2 className="text-xl font-bold text-slate-900 mt-2">{canConfirm ? 'Confirm your delivery' : 'Your package is on the way'}</h2>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 mt-4 space-y-2">
        <Row label="From" value={delivery.senderName || delivery.senderId} />
        <Row label="Package" value={delivery.packageType} />
        <Row label="Rider" value={delivery.aiRecommendation?.recommendedDriverName || 'Pending'} />
        <Row label="Pickup" value={delivery.pickupAddress} />
        <Row label="Drop-off" value={delivery.dropoffAddress} />
      </div>

      {err && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mt-3">{err}</p>}

      <div className="mt-auto space-y-2">
        <button onClick={confirm} disabled={!canConfirm || loading} className="w-full py-3.5 rounded-2xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold text-sm shadow-md inline-flex items-center justify-center gap-2 active:scale-95">
          <CheckCircle2 size={16} /> Confirm Delivery
        </button>
        <button onClick={() => navigate(VIEWS.reportIssue)} className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold inline-flex items-center justify-center gap-1.5">
          <AlertTriangle size={13} /> I did not receive this
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-800 truncate ml-3">{value || '—'}</span>
    </div>
  );
}
