import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATUSES } from '../lib/constants';
import JobCard from '../components/JobCard';
import StatusBadge from '../components/StatusBadge';

export default function DriverAcceptedJobsScreen() {
  const { back, navigate, VIEWS, acceptedJobs, loadAcceptedJobs, setDelivery } = useApp();

  useEffect(() => { loadAcceptedJobs().catch(() => {}); }, []);

  const open = (d) => { setDelivery(d); navigate(VIEWS.driverRoute); };

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-8 overflow-y-auto">
      <button onClick={back} className="self-start mb-3 text-slate-500"><ArrowLeft size={18} /></button>
      <h2 className="text-xl font-bold text-slate-900 mb-4">Your jobs</h2>

      {!acceptedJobs.length && <p className="text-xs text-slate-400">Nothing accepted yet.</p>}

      <div className="space-y-3">
        {acceptedJobs.map(d => {
          const info = STATUSES[d.status] || { label: d.status, tone: 'slate' };
          return (
            <button key={d.deliveryId} onClick={() => open(d)} className="block w-full text-left space-y-2">
              <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
              <JobCard delivery={d} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
