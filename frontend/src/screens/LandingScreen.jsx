import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function LandingScreen() {
  const { navigate, VIEWS } = useApp();
  return (
    <div className="flex flex-col h-full px-6 pt-10 pb-8">
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg">
          <ShieldCheck size={36} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Mootive</h1>
          <p className="text-sm text-slate-500 mt-1">Fast-track your deliveries, reliably and cheaply.</p>
        </div>
        <p className="text-xs text-slate-400 max-w-xs">
          Send, receive, and track deliveries with trusted dispatch riders across Lagos.
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-600 text-[10px] font-bold">
          <Sparkles size={11} /> POWERED BY CLAUDE ON BEDROCK
        </div>
      </div>
      <div className="space-y-3">
        <button onClick={() => navigate(VIEWS.signup)} className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md active:scale-95">
          Get Started
        </button>
        <button onClick={() => navigate(VIEWS.login)} className="w-full py-3.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 active:scale-95">
          Sign In
        </button>
      </div>
    </div>
  );
}
