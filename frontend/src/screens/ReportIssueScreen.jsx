import React, { useState } from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import * as api from '../lib/api';
import { useApp } from '../context/AppContext';

export default function ReportIssueScreen() {
  const { back, delivery } = useApp();
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!delivery) return;
    setErr(null); setLoading(true);
    try {
      await api.reportIssue(delivery.deliveryId, reason || 'Issue reported by user.');
      setDone(true);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-8">
      <button onClick={back} className="self-start mb-3 text-slate-500"><ArrowLeft size={18} /></button>
      <h2 className="text-xl font-bold text-slate-900">Report an issue</h2>
      <p className="text-xs text-slate-500 mb-5">Your delivery will be marked for review.</p>

      {done ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Issue reported</h3>
          <p className="text-xs text-slate-500">We will review this delivery.</p>
          <button onClick={back} className="mt-4 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold">Back</button>
        </div>
      ) : (
        <>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={5} placeholder="Briefly describe the issue…"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          {err && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mt-3">{err}</p>}
          <button onClick={submit} disabled={loading} className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm shadow-md mt-4 active:scale-95">
            {loading ? 'Submitting…' : 'Report issue'}
          </button>
        </>
      )}
    </div>
  );
}
