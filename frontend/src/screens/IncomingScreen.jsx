import React, { useEffect } from 'react';
import { ArrowLeft, Inbox, MapPin, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATUSES } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';

export default function IncomingScreen() {
  const { back, navigate, VIEWS, incoming, loadIncoming, setDelivery } = useApp();

  useEffect(() => { loadIncoming().catch(() => {}); }, []);

  const open = (d) => { setDelivery(d); navigate(VIEWS.receiverConfirm); };

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-8 overflow-y-auto">
      <button onClick={back} className="self-start mb-3 text-slate-500"><ArrowLeft size={18} /></button>
      <h2 className="text-xl font-bold text-slate-900 mb-4">Incoming deliveries</h2>

      {!incoming.length && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center">
          <Inbox size={36} />
          <p className="text-xs mt-2">Nothing on the way right now.</p>
        </div>
      )}

      <div className="space-y-3">
        {incoming.map(d => {
          const info = STATUSES[d.status] || { label: d.status, tone: 'slate' };
          return (
            <button key={d.deliveryId} onClick={() => open(d)} className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 space-y-2 active:scale-[0.99] transition">
              <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
              <div className="flex items-center gap-1.5 text-xs text-slate-700">
                <MapPin size={11} className="text-orange-500" />
                <span className="truncate">{d.pickupArea || d.pickupAddress}</span>
                <ArrowRight size={11} className="text-slate-400 shrink-0" />
                <span className="truncate">{d.dropoffArea || d.dropoffAddress}</span>
              </div>
              <p className="text-[11px] text-slate-500">From sender · {d.packageType}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
