import React from 'react';
import { Sparkles } from 'lucide-react';

export default function RecommendationCard({ delivery }) {
  const ai = delivery?.aiRecommendation;
  if (!ai) return null;
  const ex = ai.explanations || {};
  return (
    <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-orange-500" />
        <h4 className="text-xs font-bold uppercase text-orange-700 tracking-wide">AI Recommendation</h4>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800">{ai.recommendedDriverName}</p>
        {ex.driverRecommendation && <p className="text-[12px] text-slate-600 mt-0.5 leading-relaxed">{ex.driverRecommendation}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {ex.fairPrice && (
          <div className="bg-white/70 rounded-xl p-2">
            <p className="font-bold text-slate-600">Fair price</p>
            <p className="text-slate-500 leading-snug">{ex.fairPrice}</p>
          </div>
        )}
        {ex.risk && (
          <div className="bg-white/70 rounded-xl p-2">
            <p className="font-bold text-slate-600">Risk: {delivery.riskScore}</p>
            <p className="text-slate-500 leading-snug">{ex.risk}</p>
          </div>
        )}
        {ex.route && (
          <div className="bg-white/70 rounded-xl p-2 col-span-2">
            <p className="font-bold text-slate-600">Route</p>
            <p className="text-slate-500 leading-snug">{ex.route}</p>
          </div>
        )}
      </div>
    </div>
  );
}
