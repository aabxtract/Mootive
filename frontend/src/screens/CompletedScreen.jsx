import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function CompletedScreen() {
  const { delivery, reset, VIEWS, profile } = useApp();
  const home = profile?.role === 'driver' ? VIEWS.driverHome : VIEWS.sellerHome;

  return (
    <div className="flex flex-col h-full px-6 pt-10 pb-8 items-center text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle2 size={42} className="text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mt-4">Delivery completed</h2>
      <p className="text-xs text-slate-500 mt-1">Receiver confirmed delivery.</p>
      {delivery && (
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 mt-5 text-left space-y-1.5">
          <Row label="ID" value={delivery.deliveryId} />
          <Row label="Package" value={delivery.packageType} />
          <Row label="Route" value={`${delivery.pickupArea || ''} → ${delivery.dropoffArea || ''}`} />
          <Row label="Distance" value={delivery.estimatedDistance ? `${delivery.estimatedDistance} km` : '—'} />
        </div>
      )}
      <button onClick={() => reset(home)} className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md mt-auto active:scale-95">
        Back home
      </button>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-800 truncate ml-3">{value}</span>
    </div>
  );
}
