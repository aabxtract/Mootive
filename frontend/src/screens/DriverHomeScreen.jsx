import React, { useEffect, useState } from 'react';
import { LogOut, Power, Briefcase, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function DriverHomeScreen() {
  const { profile, doLogout, navigate, VIEWS, driverProfile, refreshDriverProfile, toggleAvailability, loadOpenJobs, loadAcceptedJobs, openJobs, acceptedJobs } = useApp();
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    refreshDriverProfile().catch(() => {});
    loadOpenJobs().catch(() => {});
    loadAcceptedJobs().catch(() => {});
  }, []);

  const isOnline = driverProfile?.availabilityStatus === 'available';

  const flip = async () => {
    setToggling(true);
    try {
      const next = !isOnline;
      const coords = await getCoords();
      await toggleAvailability({ available: next, ...coords });
      if (next) loadOpenJobs();
    } finally { setToggling(false); }
  };

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-8 overflow-y-auto">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-slate-500">Driver</p>
          <h2 className="text-2xl font-bold text-slate-900">Hi {profile?.name?.split(' ')[0] || 'rider'} 🏍️</h2>
        </div>
        <button onClick={doLogout} className="p-2 text-slate-400"><LogOut size={16} /></button>
      </div>

      <button onClick={flip} disabled={toggling} className={`mt-5 w-full p-4 rounded-2xl flex items-center justify-between transition ${isOnline ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
        <div className="flex items-center gap-3">
          <Power size={20} />
          <div className="text-left">
            <p className="text-sm font-bold">{isOnline ? 'You are online' : 'You are offline'}</p>
            <p className="text-[11px] opacity-80">{isOnline ? 'You will see new jobs.' : 'Go online to receive jobs.'}</p>
          </div>
        </div>
        <span className={`w-10 h-6 rounded-full ${isOnline ? 'bg-white/30' : 'bg-slate-300'} relative`}>
          <span className={`absolute top-0.5 ${isOnline ? 'right-0.5 bg-white' : 'left-0.5 bg-white'} w-5 h-5 rounded-full transition`} />
        </span>
      </button>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <Card icon={Briefcase} title="Available Jobs" count={openJobs.length} tone="orange" onClick={() => navigate(VIEWS.availableJobs)} />
        <Card icon={CheckCircle2} title="Accepted Jobs" count={acceptedJobs.length} tone="indigo" onClick={() => navigate(VIEWS.completedJobs)} />
      </div>
    </div>
  );
}

function getCoords() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve({}),
      { timeout: 4000 }
    );
  });
}

function Card({ icon: Icon, title, count, tone, onClick }) {
  const tones = { orange: 'bg-orange-500 text-white', indigo: 'bg-indigo-500 text-white' };
  return (
    <button onClick={onClick} className="aspect-square rounded-2xl bg-white border border-slate-200 p-4 flex flex-col justify-between active:scale-95">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="text-left">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="text-2xl font-extrabold text-slate-900 mt-1">{count}</p>
      </div>
    </button>
  );
}
