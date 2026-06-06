import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import * as auth from '../lib/auth';
import { useApp } from '../context/AppContext';

export default function LoginScreen() {
  const { back, navigate, VIEWS, afterLogin } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      await auth.login(email, password);
      await afterLogin();
    } catch (e) {
      if (e.name === 'UserNotConfirmedException') { navigate(VIEWS.confirm); return; }
      setErr(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-8">
      <button onClick={back} className="self-start mb-3 text-slate-500"><ArrowLeft size={18} /></button>
      <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
      <p className="text-xs text-slate-500 mb-5">Welcome back to Mootive.</p>
      <form onSubmit={submit} className="space-y-3 flex-1">
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <Field label="Password" type="password" value={password} onChange={setPassword} required />
        {err && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{err}</p>}
        <button disabled={loading} className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm shadow-md active:scale-95">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
      <p className="text-xs text-center text-slate-400 mt-4">
        No account? <button onClick={() => navigate(VIEWS.signup)} className="text-orange-600 font-bold">Sign up</button>
      </p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-600 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
    </div>
  );
}
