import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { PACKAGE_TYPES, URGENCY_LEVELS } from '../lib/constants';
import PlaceSearch from '../components/PlaceSearch';
import { useApp } from '../context/AppContext';

export default function CreateDeliveryScreen() {
  const { back, navigate, VIEWS, deliveryForm, updateForm, receiverLookup, checkReceiverTag, submitDelivery, deliveryLoading } = useApp();
  const [err, setErr] = useState(null);

  const handleReceiverChange = (v) => {
    updateForm({ receiverTag: v });
    checkReceiverTag(v);
  };

  const onSubmit = async () => {
    setErr(null);
    if (!deliveryForm.pickupLat || !deliveryForm.dropoffLat) { setErr('Pick pickup and dropoff from the suggestions.'); return; }
    if (!deliveryForm.receiverTag && !deliveryForm.receiverPhone) { setErr('Provide a receiver tag or phone.'); return; }
    try {
      await submitDelivery();
      navigate(VIEWS.findingDrivers);
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-6 overflow-y-auto">
      <button onClick={back} className="self-start mb-3 text-slate-500"><ArrowLeft size={18} /></button>
      <h2 className="text-xl font-bold text-slate-900">Create delivery</h2>
      <p className="text-xs text-slate-500 mb-4">Powered by Amazon Location Service.</p>

      <Section title="Pickup">
        <PlaceSearch label="Pickup address" value={deliveryForm.pickupAddress} onPick={({ address, area, lat, lng }) => updateForm({ pickupAddress: address, pickupArea: area, pickupLat: lat, pickupLng: lng })} />
        <SmallInput label="Pickup note" value={deliveryForm.pickupNote} onChange={v => updateForm({ pickupNote: v })} />
      </Section>

      <Section title="Drop-off">
        <PlaceSearch label="Drop-off address" value={deliveryForm.dropoffAddress} onPick={({ address, area, lat, lng }) => updateForm({ dropoffAddress: address, dropoffArea: area, dropoffLat: lat, dropoffLng: lng })} />
        <SmallInput label="Receiver tag or phone" value={deliveryForm.receiverTag} onChange={handleReceiverChange} />
        <ReceiverHint state={receiverLookup.state} data={receiverLookup.data} />
        <SmallInput label="Receiver name" value={deliveryForm.receiverName} onChange={v => updateForm({ receiverName: v })} />
      </Section>

      <Section title="Package">
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Type</label>
          <div className="grid grid-cols-3 gap-1.5">
            {PACKAGE_TYPES.map(p => (
              <button key={p.value} onClick={() => updateForm({ packageType: p.value })} className={`py-2 rounded-lg border text-[11px] font-bold ${deliveryForm.packageType === p.value ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-200 bg-white text-slate-700'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <SmallInput label="Package value (₦)" type="number" value={deliveryForm.packageValue} onChange={v => updateForm({ packageValue: v })} />
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Urgency</label>
          <div className="grid grid-cols-3 gap-1.5">
            {URGENCY_LEVELS.map(u => (
              <button key={u.value} onClick={() => updateForm({ urgency: u.value })} className={`py-2 rounded-lg border text-[11px] font-bold ${deliveryForm.urgency === u.value ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-200 bg-white text-slate-700'}`}>
                <div>{u.label}</div>
                <div className="text-[9px] opacity-70 font-medium">{u.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <SmallInput label="Note for rider" value={deliveryForm.deliveryNote} onChange={v => updateForm({ deliveryNote: v })} />
      </Section>

      {err && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mt-2">{err}</p>}

      <button onClick={onSubmit} disabled={deliveryLoading} className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm shadow-md mt-4 active:scale-95">
        {deliveryLoading ? 'Submitting…' : 'Find Drivers'}
      </button>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4 space-y-2">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function SmallInput({ label, value, onChange, type = 'text' }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-600 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
    </div>
  );
}

function ReceiverHint({ state, data }) {
  if (state === 'idle') return null;
  if (state === 'checking') return <p className="text-[11px] text-slate-400 inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Checking…</p>;
  if (state === 'found') return <p className="text-[11px] text-green-600 inline-flex items-center gap-1"><CheckCircle2 size={11} /> Found {data?.name}.</p>;
  if (state === 'not_found') return <p className="text-[11px] text-amber-600 inline-flex items-center gap-1"><XCircle size={11} /> Not registered — we'll SMS a confirmation link.</p>;
  return <p className="text-[11px] text-red-600">{data?.message}</p>;
}
