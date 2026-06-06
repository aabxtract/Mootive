import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { STATUSES } from '../lib/constants';

export default function Timeline({ events }) {
  if (!events?.length) return <p className="text-xs text-slate-400 italic">No events yet.</p>;
  return (
    <ol className="space-y-3">
      {events.map((e, i) => {
        const info = STATUSES[e.eventType] || { label: e.eventType, tone: 'slate' };
        const isLast = i === events.length - 1;
        return (
          <li key={e.eventId} className="flex gap-3">
            <div className="flex flex-col items-center">
              {isLast ? <CheckCircle2 size={16} className="text-orange-500" /> : <Circle size={14} className="text-slate-300 mt-0.5" />}
              {i < events.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
            </div>
            <div className="pb-2">
              <p className="text-xs font-bold text-slate-800">{info.label}</p>
              {e.message && <p className="text-[11px] text-slate-500">{e.message}</p>}
              <p className="text-[10px] text-slate-400">{new Date(e.createdAt).toLocaleString()}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
