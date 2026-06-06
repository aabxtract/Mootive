import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, CheckCircle2, Navigation, Package, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATUSES } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';
import RouteSummaryCard from '../components/RouteSummaryCard';
import DeliveryTimeline from '../components/DeliveryTimeline';

const ACTIONS = {
  DRIVER_ACCEPTED: { label: 'Mark Picked Up', next: 'PICKED_UP', icon: Package },
  ROUTE_OPTIMIZED: { label: 'Mark Picked Up', next: 'PICKED_UP', icon: Package },
  PICKED_UP: { label: 'Start Trip', next: 'IN_TRANSIT', icon: Navigation },
  IN_TRANSIT: { label: 'Mark Delivered', next: 'DELIVERED', icon: CheckCircle2 },
};

export default function RiderRoute() {
  const { back, navigate, VIEWS, delivery, deliveryEvents, callOptimizeRoute, advanceStatus, refreshDelivery } = useApp();
  const [optimizing, setOptimizing] = useState(() => delivery && !delivery.routeId);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!delivery?.deliveryId) return;
    if (delivery.routeId) return;
    callOptimizeRoute(delivery.deliveryId).catch(e => setErr(e.message)).finally(() => setOptimizing(false));
  }, []);

  if (!delivery) return null;
  const info = STATUSES[delivery.status] || { label: delivery.status, tone: 'slate' };
  const action = ACTIONS[delivery.status];

  const handleAction = async () => {
    if (!action) return;
    setErr(null); setBusy(true);
    try {
      await advanceStatus(delivery.deliveryId, action.next);
      if (action.next === 'DELIVERED') navigate(VIEWS.driverHome);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col h-full px-5 pt-5 pb-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={back} className="text-slate-500 p-1"><ArrowLeft size={20} /></button>
        <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
        <button onClick={() => refreshDelivery(delivery.deliveryId)} className="text-slate-400 p-1"><RefreshCw size={16} /></button>
      </div>

      <h2 className="text-lg font-bold text-slate-900 mb-4">Rider Route</h2>

      <RouteSummaryCard delivery={delivery} />

      {optimizing && (
        <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-orange-700">Optimizing route...</p>
        </div>
      )}

      <div className="mt-5">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Delivery Progress</h3>
        <DeliveryTimeline delivery={delivery} events={deliveryEvents} />
      </div>

      {err && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg mt-3">{err}</p>}

      <div className="mt-auto space-y-2 pt-4">
        {action && (
          <button onClick={handleAction} disabled={busy} className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm shadow-md inline-flex items-center justify-center gap-2 active:scale-95 transition">
            {busy ? 'Updating...' : <><action.icon size={16} /> {action.label}</>}
          </button>
        )}
        <button onClick={() => navigate(VIEWS.reportIssue)} className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 transition">
          <AlertTriangle size={13} /> Report an issue
        </button>
      </div>
    </div>
  );
}
