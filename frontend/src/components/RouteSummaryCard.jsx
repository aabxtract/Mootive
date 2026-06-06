import { MapPin, User, Clock, Navigation, ShieldCheck } from 'lucide-react';

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-slate-400 shrink-0" />
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <span className="text-xs font-bold text-slate-800 ml-auto truncate">{value}</span>
    </div>
  );
}

function RiskBadge({ score }) {
  if (!score || score === '—') {
    return <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded-full bg-slate-100">—</span>;
  }
  const num = typeof score === 'string' ? parseFloat(score) : score;
  const isLow = num <= 3;
  const isMedium = num <= 6;
  const label = isLow ? 'Low' : isMedium ? 'Medium' : 'High';
  const color = isLow ? 'bg-emerald-100 text-emerald-700' : isMedium ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
}

export default function RouteSummaryCard({ delivery }) {
  if (!delivery) return null;

  const pickup = delivery.pickupArea || delivery.pickupAddress || '—';
  const dropoff = delivery.dropoffArea || delivery.dropoffAddress || '—';
  const driver = delivery.recommendedDriverName || delivery.aiRecommendation?.recommendedDriverName || 'Not assigned';
  const duration = delivery.estimatedDuration ? `${delivery.estimatedDuration} mins` : '—';
  const distance = delivery.estimatedDistance ? `${delivery.estimatedDistance} km` : '—';
  const risk = delivery.riskScore != null ? delivery.riskScore : '—';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Route Summary</h3>
      <div className="space-y-2">
        <InfoRow icon={MapPin} label="Pickup" value={pickup} />
        <InfoRow icon={MapPin} label="Drop-off" value={dropoff} />
        <InfoRow icon={User} label="Driver" value={driver} />
        <InfoRow icon={Clock} label="Duration" value={duration} />
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 mt-2">
          <Navigation size={14} className="text-slate-400 shrink-0" />
          <span className="text-[11px] font-medium text-slate-500">Distance</span>
          <span className="text-xs font-bold text-slate-800 ml-auto">{distance}</span>
          <ShieldCheck size={14} className="text-slate-400 shrink-0 ml-3" />
          <span className="text-[11px] font-medium text-slate-500">Risk</span>
          <RiskBadge score={risk} />
        </div>
      </div>
    </div>
  );
}
