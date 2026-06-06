import React, { useState } from 'react';
import { Package, Bike } from 'lucide-react';
import * as api from '../lib/api';
import { useApp } from '../context/AppContext';

export default function RoleSetupScreen() {
  const { authUser, refreshProfile, reset, navigate, VIEWS } = useApp();
  const [role, setRole] = useState(null);
  const [name, setName] = useState(authUser?.email?.split('@')[0] || '');
  const [phone, setPhone] = useState('+234');
  const [username, setUsername] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!role) { setErr('Pick a role.'); return; }
    setErr(null); setLoading(true);
    try {
      await api.createUserProfile({ name, role, username, phoneNumber: phone });
      const profile = await refreshProfile();
      if (profile?.role === 'driver') navigate(VIEWS.driverProfileSetup);
      else reset(VIEWS.sellerHome);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full px-6 pt-8 pb-8">
      <h2 className="text-2xl font-bold text-slate-900">Pick your role</h2>
      <p className="text-xs text-slate-500 mb-5">You can change this later.</p>

      <div className="grid grid-cols-1 gap-3 mb-5">
        <RoleCard icon={Package} title="Send & receive packages" desc="Create deliveries and receive incoming packages." selected={role === 'seller_receiver'} onClick={() => setRole('seller_receiver')} />
        <RoleCard icon={Bike} title="Become a driver" desc="Accept and complete delivery jobs." selected={role === 'driver'} onClick={() => setRole('driver')} />
      </div>

      <div className="space-y-3 flex-1">
        <Field label="Full name" value={name} onChange={setName} />
        <Field label="Phone (E.164)" value={phone} onChange={setPhone} />
        <Field label="Username (your @tag)" value={username} onChange={setUsername} />
        {err && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{err}</p>}
      </div>

      <button onClick={submit} disabled={loading} className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm shadow-md mt-4 active:scale-95">
        {loading ? 'Saving…' : 'Continue'}
      </button>
    </div>
  );
}

function RoleCard({ icon: Icon, title, desc, selected, onClick }) {
  return (
    <button onClick={onClick} className={`w-full text-left p-4 rounded-2xl border flex gap-3 transition ${selected ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="text-[11px] text-slate-500 leading-snug">{desc}</p>
      </div>
    </button>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-600 block">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
    </div>
  );
}
