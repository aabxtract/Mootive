import React from 'react';
import { MapPin, ArrowRight, Package } from 'lucide-react';
import { formatNaira } from '../lib/constants';

export default function JobCard({ delivery, onAccept, accepting }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs text-slate-700">
        <MapPin size={12} className="text-orange-500" />
        <span className="font-bold truncate">{delivery.pickupArea || delivery.pickupAddress}</span>
        <ArrowRight size={12} className="text-slate-400" />
        <span className="font-bold truncate">{delivery.dropoffArea || delivery.dropoffAddress}</span>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1"><Package size={11} />{delivery.packageType}</span>
        {delivery.estimatedDuration && <span>• ~{delivery.estimatedDuration} min</span>}
        {delivery.riskScore && <span>• Risk {delivery.riskScore}</span>}
      </div>
      <div className="flex justify-between items-center pt-1">
        <span className="text-sm font-bold text-slate-800">{formatNaira(delivery.totalDeliveryFee)}</span>
        {onAccept && (
          <button
            onClick={() => onAccept(delivery.deliveryId)}
            disabled={accepting}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold active:scale-95"
          >
            {accepting ? 'Accepting…' : 'Accept Job'}
          </button>
        )}
      </div>
    </div>
  );
}
