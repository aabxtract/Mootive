import React from 'react';
import { Send, Inbox, Package, LogOut, User } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SellerHomeScreen() {
  const { profile, doLogout, navigate, VIEWS, emptyForm, setDeliveryForm, setDelivery } = useApp();

  const startNewDelivery = () => {
    setDeliveryForm(emptyForm());
    setDelivery(null);
    navigate(VIEWS.createDelivery);
  };

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-8">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-slate-500">Welcome back</p>
          <h2 className="text-2xl font-bold text-slate-900">Hi {profile?.name?.split(' ')[0] || 'there'} 👋</h2>
          <p className="text-xs text-slate-500 mt-1">What do you want to do today?</p>
        </div>
        <button onClick={doLogout} className="p-2 text-slate-400 hover:text-slate-600">
          <LogOut size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <Card icon={Send} title="Send a Package" tone="orange" onClick={startNewDelivery} />
        <Card icon={Inbox} title="Incoming" tone="indigo" onClick={() => navigate(VIEWS.incoming)} />
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <User size={14} className="text-slate-400" />
          <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wide">Your tag</p>
        </div>
        <p className="text-sm font-bold text-slate-800">@{profile?.username}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Share this with senders so they can find you.</p>
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, tone, onClick }) {
  const tones = { orange: 'bg-orange-500 text-white', indigo: 'bg-indigo-500 text-white' };
  return (
    <button onClick={onClick} className="aspect-square rounded-2xl bg-white border border-slate-200 p-4 flex flex-col justify-between active:scale-95 transition">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
        <Icon size={18} />
      </div>
      <p className="text-sm font-bold text-slate-800 text-left">{title}</p>
    </button>
  );
}
