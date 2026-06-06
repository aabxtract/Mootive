import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import * as auth from '../lib/auth';
import { useApp } from '../context/AppContext';

export default function ConfirmSignupScreen() {
  const { back, navigate, VIEWS } = useApp();
  const [email, setEmail] = useState(localStorage.getItem('MOOTIVE_SIGNUP_EMAIL') || '');
  const [code, setCode] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      await auth.confirmSignup({ email, code });
      navigate(VIEWS.login);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  const resend = async () => {
    setErr(null);
    try { await auth.resendCode(email); setErr('New code sent.'); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-8">
      <button onClick={back} className="self-start mb-3 text-slate-500"><ArrowLeft size={18} /></button>
      <h2 className="text-2xl font-bold text-slate-900">Verify email</h2>
      <p className="text-xs text-slate-500 mb-5">Enter the 6-digit code we sent to {email || 'your email'}.</p>
      <form onSubmit={submit} className="space-y-3 flex-1">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600 block">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600 block">Verification code</label>
          <input type="text" value={code} onChange={e => setCode(e.target.value)} required maxLength={6}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm tracking-[0.5em] text-center font-mono focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        {err && <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">{err}</p>}
        <button disabled={loading} className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm shadow-md active:scale-95">
          {loading ? 'Verifying…' : 'Verify'}
        </button>
        <button type="button" onClick={resend} className="w-full text-xs text-slate-500 underline">Resend code</button>
      </form>
    </div>
  );
}
