import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import * as auth from '../lib/auth';
import { useApp } from '../context/AppContext';

export default function SignupScreen() {
  const { back, navigate, VIEWS } = useApp();
  const [form, setForm] = useState({ name: '', email: '', phoneNumber: '+234', password: '' });
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await auth.signup(form);
      localStorage.setItem('MOOTIVE_SIGNUP_EMAIL', form.email);
      navigate(VIEWS.confirm);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-8">
      <button onClick={back} className="self-start mb-3 text-slate-500"><ArrowLeft size={18} /></button>
      <h2 className="text-2xl font-bold text-slate-900">Create account</h2>
      <p className="text-xs text-slate-500 mb-5">Sign up to send and receive packages.</p>
      <form onSubmit={submit} className="space-y-3 flex-1">
        <Field label="Full name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
        <Field label="Email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required />
        <Field label="Phone (E.164, e.g. +2348012345678)" value={form.phoneNumber} onChange={v => setForm(f => ({ ...f, phoneNumber: v }))} />
        <Field label="Password (8+ chars, 1 number, 1 lowercase)" type="password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} required />
        {err && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{err}</p>}
        <button disabled={loading} className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm shadow-md active:scale-95">
          {loading ? 'Creating…' : 'Create Account'}
        </button>
      </form>
      <p className="text-xs text-center text-slate-400 mt-4">
        Have an account? <button onClick={() => navigate(VIEWS.login)} className="text-orange-600 font-bold">Sign in</button>
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
