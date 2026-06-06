import React, { useState } from 'react';
import { VEHICLE_TYPES } from '../lib/constants';
import * as api from '../lib/api';
import { useApp } from '../context/AppContext';

export default function DriverProfileSetupScreen() {
  const { reset, VIEWS } = useApp();
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [currentArea, setCurrentArea] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(null); setLoading(true);
    try {
      await api.createDriverProfile({ vehicleType, currentArea });
      reset(VIEWS.driverHome);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full px-6 pt-8 pb-8">
      <h2 className="text-2xl font-bold text-slate-900">Driver details</h2>
      <p className="text-xs text-slate-500 mb-5">Tell us a bit about your dispatch setup.</p>
      <div className="space-y-4 flex-1">
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-2">Vehicle type</label>
          <div className="grid grid-cols-2 gap-2">
            {VEHICLE_TYPES.map(v => (
              <button key={v} onClick={() => setVehicleType(v)} className={`py-2.5 rounded-xl border text-xs font-bold capitalize ${vehicleType === v ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-200 bg-white text-slate-700'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600 block">Current area (e.g. Yaba)</label>
          <input value={currentArea} onChange={e => setCurrentArea(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        {err && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{err}</p>}
      </div>
      <button onClick={submit} disabled={loading} className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm shadow-md mt-4 active:scale-95">
        {loading ? 'Saving…' : 'Save Driver Profile'}
      </button>
    </div>
  );
}
