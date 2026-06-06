import { useEffect, useState, useRef, useMemo } from 'react';
import { Star, Navigation, Clock, CheckCircle2, MapPin, Sparkles, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

const DRIVERS = [
  { id: 'd1', name: 'Chidi Obi', initials: 'CO', vehicle: 'Motorcycle', rating: 4.8, price: 2500, eta: '8 min', color: 'bg-orange-500' },
  { id: 'd2', name: 'Funke Adeyemi', initials: 'FA', vehicle: 'Car', rating: 4.9, price: 3200, eta: '12 min', color: 'bg-blue-500' },
  { id: 'd3', name: 'Tunde Balogun', initials: 'TB', vehicle: 'Motorcycle', rating: 4.7, price: 2200, eta: '6 min', color: 'bg-emerald-500' },
  { id: 'd4', name: 'Aisha Mohammed', initials: 'AM', vehicle: 'Car', rating: 4.9, price: 3000, eta: '10 min', color: 'bg-purple-500' },
  { id: 'd5', name: 'Emeka Nwosu', initials: 'EN', vehicle: 'Motorcycle', rating: 4.6, price: 2800, eta: '15 min', color: 'bg-rose-500' },
];

const ENTRY_DELAYS = [800, 2200, 3600, 5000, 6200];
const PROGRESS_INCREMENT = 100;

function formatPrice(n) { return '₦' + n.toLocaleString('en-NG'); }

export default function FindingDriversScreen() {
  const { delivery, setDelivery, navigate, VIEWS } = useApp();
  const [visibleIds, setVisibleIds] = useState([]);
  const [phase, setPhase] = useState('searching');
  const [progress, setProgress] = useState(0);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const timers = useRef([]);
  const started = useRef(false);

  const area = delivery?.pickupArea || delivery?.pickupAddress || 'your area';

  const sortedDrivers = useMemo(() => {
    return [...DRIVERS].sort((a, b) => (b.rating * 10000 / b.price) - (a.rating * 10000 / a.price));
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const tids = [];

    ENTRY_DELAYS.forEach((delay, i) => {
      const t = setTimeout(() => {
        setVisibleIds(prev => [...prev, DRIVERS[i].id]);
        if (i === DRIVERS.length - 1) {
          const best = sortedDrivers[0];
          setSelectedDriver(best);
          setPhase('completed');
          const navTimer = setTimeout(() => {
            setDelivery(prev => ({
              ...prev,
              assignedDriverId: best.id,
              recommendedDriverName: best.name,
              aiRecommendation: {
                ...(prev?.aiRecommendation || {}),
                recommendedDriverName: best.name,
              },
              estimatedDuration: best.eta,
              totalDeliveryFee: best.price,
              riskScore: 2,
            }));
            navigate(VIEWS.senderTracking);
          }, 2500);
          tids.push(navTimer);
        }
      }, delay);
      tids.push(t);
    });

    const prog = setInterval(() => {
      setProgress(p => Math.min(p + PROGRESS_INCREMENT, 100));
    }, 80);
    tids.push(prog);

    return () => tids.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!delivery) return null;

  return (
    <div className="flex flex-col h-full px-5 pt-6 pb-8 overflow-y-auto">
      <div className="text-center mb-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg mx-auto">
          <Sparkles size={24} className="text-white" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mt-3">
          {phase === 'searching' ? 'Finding nearby drivers' :
           phase === 'completed' ? 'Driver found!' : 'Finding nearby drivers'}
        </h2>
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          <MapPin size={12} className="text-orange-500" />
          <p className="text-xs text-slate-500">{area}</p>
        </div>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${phase === 'completed' ? 'bg-emerald-500' : 'bg-orange-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {phase === 'searching' && visibleIds.length < DRIVERS.length && (
        <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
          <Loader2 size={12} className="animate-spin text-orange-500" />
          <span>Checking available riders...</span>
        </div>
      )}

      <div className="space-y-3">
        {DRIVERS.map((driver) => {
          const isVisible = visibleIds.includes(driver.id);
          const isSelected = selectedDriver?.id === driver.id;

          return (
            <div
              key={driver.id}
              className={`rounded-2xl border p-4 transition-all duration-500 ${
                !isVisible ? 'opacity-0 translate-y-4 max-h-0 overflow-hidden p-0 border-transparent' :
                isSelected ? 'border-emerald-300 bg-emerald-50/60 shadow-md ring-1 ring-emerald-200' :
                'border-slate-200 bg-white shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${driver.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                  {driver.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{driver.name}</p>
                    {isSelected && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                    <span className="inline-flex items-center gap-1"><Navigation size={10} />{driver.vehicle}</span>
                    <span className="inline-flex items-center gap-1"><Clock size={10} />{driver.eta}</span>
                    <span className="inline-flex items-center gap-1"><Star size={10} className="text-amber-400" />{driver.rating}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{formatPrice(driver.price)}</p>
                  <p className="text-[10px] text-slate-400">offer</p>
                </div>
              </div>
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-emerald-200 flex items-center gap-2 text-xs text-emerald-700">
                  <CheckCircle2 size={14} />
                  <span className="font-bold">Best match selected</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {phase === 'completed' && selectedDriver && (
        <div className="mt-5 text-center">
          <button
            onClick={() => {
              setDelivery(prev => ({
                ...prev,
                assignedDriverId: selectedDriver.id,
                recommendedDriverName: selectedDriver.name,
                aiRecommendation: {
                  ...(prev?.aiRecommendation || {}),
                  recommendedDriverName: selectedDriver.name,
                },
                estimatedDuration: selectedDriver.eta,
                totalDeliveryFee: selectedDriver.price,
                riskScore: 2,
              }));
              navigate(VIEWS.senderTracking);
            }}
            className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md inline-flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <CheckCircle2 size={16} /> Continue to tracking
          </button>
        </div>
      )}
    </div>
  );
}
