import React, { useState } from 'react';
import { Settings, X, Link2, HelpCircle, Wifi, Battery, Signal, CheckCircle2 } from 'lucide-react';

export default function PhoneFrame({ children }) {
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl]  = useState(() => localStorage.getItem('MOOTIVE_API_URL') || '');
  const [saveMsg, setSaveMsg]  = useState('');

  const [time, setTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
  React.useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const saved = Boolean(localStorage.getItem('MOOTIVE_API_URL'));

  const handleSave = () => {
    const url = tempUrl.trim().replace(/\/$/, '');
    localStorage.setItem('MOOTIVE_API_URL', url);
    setSaveMsg('API URL saved! Reload the page if needed.');
    setTimeout(() => { setSaveMsg(''); setShowSettings(false); }, 1600);
  };

  const handleClear = () => {
    localStorage.removeItem('MOOTIVE_API_URL');
    setTempUrl('');
    setSaveMsg('Cleared.');
    setTimeout(() => setSaveMsg(''), 1000);
  };

  return (
    <div className="w-full max-w-[420px] h-[860px] bg-slate-900 rounded-[50px] p-3 border-4 border-slate-700 shadow-2xl relative flex flex-col overflow-hidden select-none">
      {/* Dynamic Island */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-slate-900 rounded-b-3xl z-50 flex items-center justify-center">
        <div className="w-24 h-4 bg-black rounded-full flex items-center justify-between px-3">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-[7px] tracking-wider text-slate-400 font-mono">MOOTIVE</span>
          <div className={`w-1.5 h-1.5 rounded-full ${saved ? 'bg-green-500' : 'bg-slate-600'}`}></div>
        </div>
      </div>

      {/* Side buttons */}
      <div className="absolute left-[-4px] top-32 w-[4px] h-12 bg-slate-700 rounded-l-md"></div>
      <div className="absolute left-[-4px] top-48 w-[4px] h-16 bg-slate-700 rounded-l-md"></div>
      <div className="absolute right-[-4px] top-40 w-[4px] h-20 bg-slate-700 rounded-r-md"></div>

      {/* Screen */}
      <div className="w-full h-full bg-slate-50 rounded-[40px] overflow-hidden relative flex flex-col text-slate-800">

        {/* Status Bar */}
        <div className="h-10 bg-white/70 backdrop-blur-md flex items-center justify-between px-6 text-xs text-slate-700 font-medium z-40 border-b border-slate-100 shrink-0">
          <span>{time}</span>
          <div className="flex items-center gap-1.5">
            <Signal size={12} />
            <span className="text-[9px] font-bold">5G</span>
            <Wifi size={12} />
            <Battery size={14} />
          </div>
        </div>

        {/* Settings button */}
        <div className="absolute top-12 right-4 z-40">
          <button
            onClick={() => { setTempUrl(localStorage.getItem('MOOTIVE_API_URL') || ''); setShowSettings(true); }}
            className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center border border-slate-200 text-slate-600 active:scale-95 shadow-sm"
            title="Settings"
          >
            <Settings size={16} className={saved ? 'text-green-500' : ''} />
          </button>
        </div>

        {/* App body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col bg-slate-50 pt-2 pb-6">
          {children}
        </div>

        {/* Home indicator */}
        <div className="h-5 bg-slate-50 flex items-center justify-center pb-1.5 shrink-0">
          <div className="w-32 h-1 bg-slate-300 rounded-full"></div>
        </div>

        {/* Settings Sheet */}
        {showSettings && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col justify-end">
            <div className="bg-white rounded-t-[32px] p-6 shadow-2xl border-t border-slate-200">
              <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Link2 className="text-orange-500" size={20} />
                  <h3 className="font-bold text-lg text-slate-800">API Settings</h3>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your deployed AWS API Gateway URL. This connects Mootive to the real DynamoDB backend.
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">API Base URL</label>
                  <input
                    type="url"
                    value={tempUrl}
                    onChange={e => setTempUrl(e.target.value)}
                    placeholder="https://xxxxxx.execute-api.us-east-1.amazonaws.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>

                {saveMsg && (
                  <div className={`text-xs p-2.5 rounded-lg text-center font-medium flex items-center justify-center gap-1.5 ${saveMsg.includes('saved') ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                    {saveMsg.includes('saved') && <CheckCircle2 size={13} />}
                    {saveMsg}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={handleClear} className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-50 active:scale-95">
                    Clear
                  </button>
                  <button onClick={handleSave} className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95">
                    Save URL
                  </button>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 flex gap-2 items-start mt-2">
                  <HelpCircle size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    No backend deployed yet? You can still explore the UI using <strong>Continue Demo</strong> from the landing screen. All states will be simulated locally.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
