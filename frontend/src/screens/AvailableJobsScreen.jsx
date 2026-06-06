import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Briefcase } from 'lucide-react';
import { useApp } from '../context/AppContext';
import JobCard from '../components/JobCard';

export default function AvailableJobsScreen() {
  const { back, navigate, VIEWS, openJobs, loadOpenJobs, setDelivery } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOpenJobs().catch(() => {});
    const t = setInterval(() => loadOpenJobs().catch(() => {}), 10000);
    return () => clearInterval(t);
  }, []);

  const refresh = async () => { setRefreshing(true); await loadOpenJobs().catch(() => {}); setRefreshing(false); };

  const view = (d) => { setDelivery(d); navigate(VIEWS.jobDetail); };

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <button onClick={back} className="text-slate-500"><ArrowLeft size={18} /></button>
        <button onClick={refresh} className="text-slate-400 p-1"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /></button>
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Available jobs</h2>
      <p className="text-xs text-slate-500 mb-4">First driver to accept gets the job.</p>

      {!openJobs.length && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center">
          <Briefcase size={32} />
          <p className="text-xs mt-2">No open jobs right now.</p>
        </div>
      )}

      <div className="space-y-3">
        {openJobs.map(d => (
          <button key={d.deliveryId} onClick={() => view(d)} className="block w-full text-left">
            <JobCard delivery={d} />
          </button>
        ))}
      </div>
    </div>
  );
}
