import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bike,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Home,
  Inbox,
  Loader2,
  LocateFixed,
  LogIn,
  Map,
  MapPin,
  Navigation,
  Package,
  Phone,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  ToggleLeft,
  ToggleRight,
  Truck,
  User,
  UserPlus,
} from 'lucide-react';
import * as api from './lib/api';
import * as auth from './lib/auth';

const PACKAGE_TYPES = ['Fashion item', 'Food', 'Document', 'Gadget', 'Medicine', 'Other'];
const URGENCY_LEVELS = ['Normal', 'Same day', 'Urgent'];
const VEHICLES = ['Bike', 'Car', 'Van', 'Keke'];

const STATUS_STEPS = [
  'CREATED',
  'ANALYZED',
  'OPEN_FOR_DRIVERS',
  'DRIVER_ACCEPTED',
  'ROUTE_OPTIMIZED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CONFIRMED',
  'COMPLETED',
];

const STATUS_LABELS = {
  CREATED: 'Created',
  ANALYZED: 'Analyzed',
  OPEN_FOR_DRIVERS: 'Open for drivers',
  DRIVER_ACCEPTED: 'Driver accepted',
  ROUTE_OPTIMIZED: 'Route ready',
  PICKED_UP: 'Picked up',
  IN_TRANSIT: 'In transit',
  DELIVERED: 'Delivered',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  ISSUE_REPORTED: 'Issue reported',
};

const SEED_DRIVERS = [
  {
    driverId: 'drv-tunde',
    name: 'Tunde Adeyemi',
    phoneNumber: '0802 111 0909',
    currentArea: 'Yaba',
    vehicleType: 'Bike',
    trustScore: 91,
    completionRate: 96,
    averagePickupTime: 14,
    distanceKm: 1.4,
    estimatedFee: 2500,
    badge: 'Recommended',
    availabilityStatus: 'ONLINE',
    lat: 6.515,
    lng: 3.384,
  },
  {
    driverId: 'drv-amaka',
    name: 'Amaka Nwosu',
    phoneNumber: '0814 230 4455',
    currentArea: 'Surulere',
    vehicleType: 'Car',
    trustScore: 86,
    completionRate: 92,
    averagePickupTime: 18,
    distanceKm: 2.1,
    estimatedFee: 2300,
    badge: 'Cheapest',
    availabilityStatus: 'ONLINE',
    lat: 6.505,
    lng: 3.36,
  },
  {
    driverId: 'drv-bayo',
    name: 'Bayo Martins',
    phoneNumber: '0907 525 6789',
    currentArea: 'Ikeja',
    vehicleType: 'Bike',
    trustScore: 89,
    completionRate: 94,
    averagePickupTime: 11,
    distanceKm: 2.8,
    estimatedFee: 2800,
    badge: 'Fastest',
    availabilityStatus: 'ONLINE',
    lat: 6.58,
    lng: 3.35,
  },
];

const INITIAL_FORM = {
  pickupAddress: '12 Hughes Avenue, Yaba',
  pickupArea: 'Yaba',
  pickupNote: 'Call when outside',
  dropoffAddress: 'Admiralty Way, Lekki Phase 1',
  dropoffArea: 'Lekki Phase 1',
  receiverTag: '',
  receiverName: 'Tolu',
  receiverPhone: '0808 456 2231',
  packageType: 'Fashion item',
  packageValue: '35000',
  urgency: 'Same day',
  deliveryNote: 'Handle package carefully',
};

const formatNaira = (value) => `NGN ${Number(value || 0).toLocaleString('en-NG')}`;

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const makeEvent = (eventType, actorRole, message) => ({
  eventId: `${eventType}-${Date.now()}`,
  eventType,
  actorRole,
  message,
  createdAt: now(),
});

function scoreDriver(driver) {
  return Math.round(driver.trustScore * 0.45 + driver.completionRate * 0.25 + (30 - driver.averagePickupTime) * 0.7 - driver.distanceKm * 1.5);
}

function bestDriver(drivers) {
  return [...drivers].sort((a, b) => scoreDriver(b) - scoreDriver(a))[0];
}

function buildAnalysis(form, drivers) {
  const recommended = bestDriver(drivers);
  const risk = form.urgency === 'Urgent' || Number(form.packageValue) > 150000 ? 'High' : form.urgency === 'Same day' ? 'Medium' : 'Low';
  return {
    matchedDrivers: drivers,
    recommendedDriverId: recommended.driverId,
    fairPriceMin: 2300,
    fairPriceMax: 2800,
    riskScore: risk,
    estimatedDuration: '45 mins',
    routeSummary: `${form.pickupArea} to ${form.dropoffArea} using a balanced mainland-to-island route.`,
    aiRecommendation: `${recommended.name} is recommended because the driver combines a high trust score, strong completion rate, close pickup distance, and a fair fee for this route.`,
  };
}

function buildDelivery(form, currentUser, analysis) {
  const token = form.receiverTag.trim() ? null : `CONFIRM-${Math.floor(10000 + Math.random() * 89999)}`;
  return {
    deliveryId: `MOT-${Math.floor(100000 + Math.random() * 899999)}`,
    senderId: currentUser.userId,
    senderName: currentUser.name,
    receiverId: form.receiverTag.trim() ? 'usr-receiver' : null,
    receiverTag: form.receiverTag,
    receiverName: form.receiverName,
    receiverPhone: form.receiverPhone,
    confirmationToken: token,
    confirmationLink: token ? `https://mootive.app/confirm/${token}` : null,
    smsStatus: token ? 'SIMULATED_SENT' : null,
    pickupAddress: form.pickupAddress,
    pickupArea: form.pickupArea,
    pickupLat: 6.515,
    pickupLng: 3.385,
    dropoffAddress: form.dropoffAddress,
    dropoffArea: form.dropoffArea,
    dropoffLat: 6.447,
    dropoffLng: 3.471,
    packageType: form.packageType,
    packageValue: Number(form.packageValue) || 0,
    urgency: form.urgency,
    deliveryNote: form.deliveryNote,
    status: 'OPEN_FOR_DRIVERS',
    assignedDriverId: null,
    recommendedDriverId: analysis.recommendedDriverId,
    fairPriceMin: analysis.fairPriceMin,
    fairPriceMax: analysis.fairPriceMax,
    riskScore: analysis.riskScore,
    riskReasons: ['Urgency', 'Route traffic', 'Declared package value'],
    aiRecommendation: analysis.aiRecommendation,
    estimatedDuration: analysis.estimatedDuration,
    estimatedDistance: '14.8 km',
    routeSummary: analysis.routeSummary,
    totalDeliveryFee: bestDriver(analysis.matchedDrivers).estimatedFee,
    createdAt: now(),
  };
}

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function Shell({ children }) {
  const [time, setTime] = useState(now());

  useEffect(() => {
    const timer = setInterval(() => setTime(now()), 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#e8edf3] px-0 text-slate-900 sm:px-6 sm:py-6">
      <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-slate-50 shadow-2xl sm:min-h-[860px] sm:rounded-[2rem] sm:border sm:border-slate-200">
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 text-[11px] font-semibold text-slate-600">
          <span>{time}</span>
          <span className="flex items-center gap-1">
            <span>5G</span>
            <span className="h-2 w-5 rounded-sm border border-slate-500">
              <span className="block h-full w-4 rounded-sm bg-slate-700" />
            </span>
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}

function Header({ title, subtitle, onBack, right }) {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-0"
          disabled={!onBack}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-base font-bold text-slate-900">{title}</h1>
          {subtitle ? <p className="truncate text-[11px] font-medium text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="flex h-9 w-9 items-center justify-center">{right}</div>
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, icon: Icon = ArrowRight, tone = 'orange' }) {
  const tones = {
    orange: 'bg-orange-600 text-white hover:bg-orange-700',
    slate: 'bg-slate-900 text-white hover:bg-slate-800',
    green: 'bg-emerald-600 text-white hover:bg-emerald-700',
    blue: 'bg-blue-600 text-white hover:bg-blue-700',
    light: 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 ${tones[tone]}`}
    >
      {Icon ? <Icon size={18} /> : null}
      <span>{children}</span>
    </button>
  );
}

function TextField({ label, value, onChange, placeholder, type = 'text', icon: Icon, multiline }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
      <div className="relative">
        {Icon ? (
          <Icon className="absolute left-3 top-3 text-slate-400" size={16} />
        ) : null}
        {multiline ? (
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            rows={3}
            className={`w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 ${Icon ? 'pl-9' : ''}`}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 ${Icon ? 'pl-9' : ''}`}
          />
        )}
      </div>
    </label>
  );
}

function StatusBadge({ status }) {
  const tone = {
    CREATED: 'bg-slate-100 text-slate-700',
    ANALYZED: 'bg-blue-50 text-blue-700',
    OPEN_FOR_DRIVERS: 'bg-amber-50 text-amber-700',
    DRIVER_ACCEPTED: 'bg-indigo-50 text-indigo-700',
    ROUTE_OPTIMIZED: 'bg-cyan-50 text-cyan-700',
    PICKED_UP: 'bg-purple-50 text-purple-700',
    IN_TRANSIT: 'bg-orange-50 text-orange-700',
    DELIVERED: 'bg-emerald-50 text-emerald-700',
    CONFIRMED: 'bg-emerald-50 text-emerald-700',
    COMPLETED: 'bg-emerald-100 text-emerald-800',
    ISSUE_REPORTED: 'bg-red-50 text-red-700',
  }[status] || 'bg-slate-100 text-slate-700';

  return <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${tone}`}>{STATUS_LABELS[status] || status}</span>;
}

function Timeline({ status, events }) {
  const activeIndex = STATUS_STEPS.indexOf(status);

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase text-slate-500">Delivery timeline</h2>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="space-y-3">
          {STATUS_STEPS.map((step, index) => {
            const complete = index <= activeIndex || status === 'COMPLETED';
            return (
              <div key={step} className="flex items-center gap-3">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${complete ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-300'}`}>
                  {complete ? <Check size={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold ${complete ? 'text-slate-900' : 'text-slate-400'}`}>{STATUS_LABELS[step]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {events.length ? (
        <div className="space-y-2">
          {events.slice(-3).map((event) => (
            <div key={event.eventId} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-800">{event.message}</p>
                <span className="text-[10px] font-semibold text-slate-400">{event.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function MapVisual({ delivery, drivers = [], assignedDriver }) {
  return (
    <div className="relative h-56 overflow-hidden rounded-lg border border-slate-200 bg-[#dbe7ef]">
      <div className="absolute inset-0 map-grid" />
      <div className="absolute left-8 top-10 flex items-center gap-2 rounded-lg bg-white px-2 py-1 shadow-sm">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white"><MapPin size={14} /></span>
        <span className="text-[11px] font-bold text-slate-800">{delivery?.pickupArea || 'Pickup'}</span>
      </div>
      <div className="absolute bottom-8 right-6 flex items-center gap-2 rounded-lg bg-white px-2 py-1 shadow-sm">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-600 text-white"><LocateFixed size={14} /></span>
        <span className="text-[11px] font-bold text-slate-800">{delivery?.dropoffArea || 'Drop-off'}</span>
      </div>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 360 220" role="img" aria-label="Route map">
        <path d="M72 56 C125 92, 143 88, 172 112 S237 152, 294 170" fill="none" stroke="#f97316" strokeWidth="7" strokeLinecap="round" opacity="0.35" />
        <path d="M72 56 C125 92, 143 88, 172 112 S237 152, 294 170" fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 8" />
      </svg>
      {drivers.map((driver, index) => (
        <div
          key={driver.driverId}
          className={`absolute flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-white shadow-md ${driver.driverId === assignedDriver?.driverId ? 'bg-emerald-600' : 'bg-blue-600'}`}
          style={{ left: `${38 + index * 17}%`, top: `${24 + index * 13}%` }}
          title={driver.name}
        >
          <Bike size={15} />
        </div>
      ))}
      <div className="absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm">
        Amazon Location Service visual
      </div>
    </div>
  );
}

function Landing({ go }) {
  return (
    <div className="flex flex-1 flex-col justify-between px-5 py-6">
      <div className="space-y-7 pt-8">
        <div>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-orange-600 text-white shadow-lg shadow-orange-600/20">
            <Truck size={28} />
          </div>
          <h1 className="text-4xl font-black text-slate-950">Mootive</h1>
          <p className="mt-3 text-xl font-bold leading-snug text-slate-800">Fast-track your deliveries, reliably and cheaply.</p>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-500">Send, receive, and track deliveries with trusted drivers across Lagos.</p>
        </div>
        <MapVisual />
      </div>

      <div className="space-y-3 pb-4">
        <PrimaryButton onClick={() => go('signup')} icon={UserPlus}>Get Started</PrimaryButton>
        <PrimaryButton onClick={() => go('login')} icon={LogIn} tone="light">Sign In</PrimaryButton>
      </div>
    </div>
  );
}

function AuthScreen({ mode, go, setUser }) {
  const isSignup = mode === 'signup';
  const [form, setForm] = useState({
    name: 'Tara Styles',
    email: 'tara@example.com',
    phoneNumber: '0800 000 0000',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    username: 'tarastyles',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async () => {
    setError('');
    if (!form.email || !form.password) return setError('Email and password are required.');
    if (isSignup && (!form.name || form.password !== form.confirmPassword)) return setError('Check your name and password confirmation.');

    setLoading(true);
    try {
      let authUser;
      if (isSignup) {
        authUser = await auth.signup(form);
      } else {
        authUser = await auth.login(form.email, form.password);
      }

      const profile = {
        userId: authUser.userId || `usr-${Date.now()}`,
        cognitoSub: authUser.cognitoSub || authUser.userId || 'local-cognito-user',
        name: form.name || authUser.email?.split('@')[0] || 'Mootive User',
        email: form.email,
        phoneNumber: form.phoneNumber,
        username: form.username,
        role: null,
      };

      await api.createUserProfile(profile).catch(() => null);
      setUser(profile);
      go('role');
    } catch (err) {
      setError(err.message || 'Could not authenticate this user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <Header title={isSignup ? 'Create account' : 'Sign in'} subtitle="Amazon Cognito email and password" onBack={() => go('landing')} />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {isSignup ? (
          <>
            <TextField label="Full name" value={form.name} onChange={(value) => update('name', value)} icon={User} />
            <TextField label="Phone number" value={form.phoneNumber} onChange={(value) => update('phoneNumber', value)} icon={Phone} />
            <TextField label="Mootive tag" value={form.username} onChange={(value) => update('username', value)} icon={Search} />
          </>
        ) : null}
        <TextField label="Email" value={form.email} onChange={(value) => update('email', value)} type="email" icon={Inbox} />
        <TextField label="Password" value={form.password} onChange={(value) => update('password', value)} type="password" icon={ShieldCheck} />
        {isSignup ? <TextField label="Confirm password" value={form.confirmPassword} onChange={(value) => update('confirmPassword', value)} type="password" icon={ShieldCheck} /> : null}

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</div> : null}
      </div>
      <div className="border-t border-slate-200 bg-white p-5">
        <PrimaryButton onClick={submit} disabled={loading} icon={loading ? Loader2 : ArrowRight}>{loading ? 'Working...' : isSignup ? 'Create Account' : 'Sign In'}</PrimaryButton>
      </div>
    </div>
  );
}

function RoleSetup({ user, setUser, go }) {
  const [driverProfile, setDriverProfile] = useState({
    name: user?.name || 'Tunde Adeyemi',
    phoneNumber: user?.phoneNumber || '0802 111 0909',
    currentArea: 'Yaba',
    vehicleType: 'Bike',
    availabilityStatus: 'ONLINE',
  });

  const chooseSeller = async () => {
    const profile = { ...user, role: 'seller_receiver' };
    await api.updateProfile({ role: 'seller_receiver' }).catch(() => null);
    setUser(profile);
    go('sellerHome');
  };

  const chooseDriver = async () => {
    const profile = { ...user, role: 'driver', driverId: 'drv-current', driverProfile };
    await api.createRiderProfile(driverProfile).catch(() => null);
    setUser(profile);
    go('driverHome');
  };

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Choose role" subtitle="Set your Mootive dashboard" onBack={() => go('landing')} />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <button type="button" onClick={chooseSeller} className="w-full rounded-lg border border-orange-200 bg-orange-50 p-4 text-left transition active:scale-[0.99]">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-600 text-white"><Package size={22} /></span>
            <span>
              <span className="block text-base font-black text-slate-900">Seller / Receiver</span>
              <span className="block text-xs font-semibold leading-5 text-slate-600">Send packages, receive packages, confirm deliveries.</span>
            </span>
          </div>
        </button>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white"><Bike size={22} /></span>
            <div>
              <h2 className="text-base font-black text-slate-900">Driver</h2>
              <p className="text-xs font-semibold leading-5 text-slate-500">Create your driver profile and accept jobs.</p>
            </div>
          </div>
          <div className="space-y-3">
            <TextField label="Driver name" value={driverProfile.name} onChange={(value) => setDriverProfile((prev) => ({ ...prev, name: value }))} />
            <TextField label="Current area" value={driverProfile.currentArea} onChange={(value) => setDriverProfile((prev) => ({ ...prev, currentArea: value }))} />
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-600">Vehicle type</span>
              <select
                value={driverProfile.vehicleType}
                onChange={(event) => setDriverProfile((prev) => ({ ...prev, vehicleType: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              >
                {VEHICLES.map((vehicle) => <option key={vehicle}>{vehicle}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => setDriverProfile((prev) => ({ ...prev, availabilityStatus: prev.availabilityStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE' }))} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-3">
              <span className="text-sm font-bold text-slate-700">Availability</span>
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                {driverProfile.availabilityStatus === 'ONLINE' ? <ToggleRight className="text-emerald-600" /> : <ToggleLeft className="text-slate-400" />}
                {driverProfile.availabilityStatus === 'ONLINE' ? 'Online' : 'Offline'}
              </span>
            </button>
            <PrimaryButton onClick={chooseDriver} icon={Bike} tone="slate">Save Driver Profile</PrimaryButton>
          </div>
        </section>
      </div>
    </div>
  );
}

function BottomNav({ go, active, role }) {
  const sellerItems = [
    ['sellerHome', Home, 'Home'],
    ['create', Package, 'Send'],
    ['incoming', Inbox, 'Incoming'],
    ['tracking', Route, 'Track'],
  ];
  const driverItems = [
    ['driverHome', Home, 'Home'],
    ['driverJobs', Boxes, 'Jobs'],
    ['driverRoute', Navigation, 'Route'],
    ['completed', CheckCircle2, 'Done'],
  ];
  const items = role === 'driver' ? driverItems : sellerItems;

  return (
    <nav className="grid grid-cols-4 border-t border-slate-200 bg-white px-2 py-2">
      {items.map(([view, Icon, label]) => (
        <button key={view} type="button" onClick={() => go(view)} className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold ${active === view ? 'bg-orange-50 text-orange-700' : 'text-slate-500'}`}>
          <Icon size={18} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function SellerHome({ user, delivery, go }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-500">Hi {user?.name?.split(' ')[0] || 'there'}</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">What do you want to move today?</h1>
          </div>
          <button type="button" onClick={() => go('role')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">Role</button>
        </div>

        <button type="button" onClick={() => go('create')} className="mb-4 w-full rounded-lg bg-orange-600 p-5 text-left text-white shadow-lg shadow-orange-600/20 transition active:scale-[0.99]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Send a Package</h2>
              <p className="mt-1 text-sm font-semibold text-orange-100">Create a delivery and find available drivers.</p>
            </div>
            <ArrowRight size={24} />
          </div>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => go('incoming')} className="rounded-lg border border-slate-200 bg-white p-4 text-left">
            <Inbox className="mb-4 text-blue-600" size={24} />
            <h3 className="text-sm font-black text-slate-900">Incoming Deliveries</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">Confirm packages.</p>
          </button>
          <button type="button" onClick={() => go('tracking')} className="rounded-lg border border-slate-200 bg-white p-4 text-left">
            <Truck className="mb-4 text-emerald-600" size={24} />
            <h3 className="text-sm font-black text-slate-900">Active Deliveries</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">{delivery ? STATUS_LABELS[delivery.status] : 'No active delivery'}</p>
          </button>
        </div>

        {delivery ? (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Current package</p>
                <h2 className="mt-1 text-base font-black text-slate-900">{delivery.pickupArea} to {delivery.dropoffArea}</h2>
              </div>
              <StatusBadge status={delivery.status} />
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{delivery.aiRecommendation}</p>
            <button type="button" onClick={() => go('tracking')} className="mt-4 flex w-full items-center justify-between rounded-lg bg-slate-900 px-3 py-3 text-sm font-bold text-white">
              View tracking <ChevronRight size={18} />
            </button>
          </section>
        ) : null}
      </div>
      <BottomNav go={go} active="sellerHome" role="seller_receiver" />
    </div>
  );
}

function CreateDelivery({ form, setForm, go, analyzeDelivery }) {
  const [error, setError] = useState('');
  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = () => {
    setError('');
    if (!form.pickupArea || !form.dropoffArea || !form.receiverPhone || !form.receiverName) {
      setError('Pickup, drop-off, receiver name, and receiver phone are required.');
      return;
    }
    analyzeDelivery();
    go('finding');
  };

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Create delivery" subtitle="Pickup, receiver, and package" onBack={() => go('sellerHome')} />
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</div> : null}
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase text-slate-500">Pickup details</h2>
          <TextField label="Pickup address" value={form.pickupAddress} onChange={(value) => update('pickupAddress', value)} icon={MapPin} />
          <TextField label="Pickup area" value={form.pickupArea} onChange={(value) => update('pickupArea', value)} />
          <TextField label="Pickup note" value={form.pickupNote} onChange={(value) => update('pickupNote', value)} />
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase text-slate-500">Drop-off details</h2>
          <TextField label="Drop-off address" value={form.dropoffAddress} onChange={(value) => update('dropoffAddress', value)} icon={LocateFixed} />
          <TextField label="Drop-off area" value={form.dropoffArea} onChange={(value) => update('dropoffArea', value)} />
          <TextField label="Receiver tag or username" value={form.receiverTag} onChange={(value) => update('receiverTag', value)} placeholder="Optional if phone is provided" />
          <TextField label="Receiver name" value={form.receiverName} onChange={(value) => update('receiverName', value)} icon={User} />
          <TextField label="Receiver phone number" value={form.receiverPhone} onChange={(value) => update('receiverPhone', value)} icon={Phone} />
          {!form.receiverTag ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
              SMS confirmation link will be simulated for this receiver.
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase text-slate-500">Package details</h2>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">Package type</span>
            <select value={form.packageType} onChange={(event) => update('packageType', event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100">
              {PACKAGE_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <TextField label="Package value" value={form.packageValue} onChange={(value) => update('packageValue', value)} type="number" />
          <div>
            <span className="mb-2 block text-xs font-bold text-slate-600">Urgency</span>
            <div className="grid grid-cols-3 gap-2">
              {URGENCY_LEVELS.map((urgency) => (
                <button key={urgency} type="button" onClick={() => update('urgency', urgency)} className={`rounded-lg border px-2 py-3 text-xs font-bold ${form.urgency === urgency ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
                  {urgency}
                </button>
              ))}
            </div>
          </div>
          <TextField label="Delivery note" value={form.deliveryNote} onChange={(value) => update('deliveryNote', value)} multiline />
        </section>
      </div>
      <div className="border-t border-slate-200 bg-white p-5">
        <PrimaryButton onClick={submit} icon={Search}>Find Drivers</PrimaryButton>
      </div>
    </div>
  );
}

function FindingDrivers({ go, delivery }) {
  useEffect(() => {
    const timer = setTimeout(() => go('drivers'), 900);
    return () => clearTimeout(timer);
  }, [go]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="relative mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
        <Loader2 className="animate-spin text-orange-600" size={34} />
        <Sparkles className="absolute right-2 top-2 text-blue-600" size={18} />
      </div>
      <h1 className="text-xl font-black text-slate-950">Finding nearby drivers...</h1>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">Checking price, trust score, route, and delivery risk.</p>
      {delivery?.smsStatus === 'SIMULATED_SENT' ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
          SMS confirmation link sent to receiver.
        </p>
      ) : null}
    </div>
  );
}

function DriverRecommendation({ delivery, drivers, go }) {
  const recommended = drivers.find((driver) => driver.driverId === delivery?.recommendedDriverId) || drivers[0];

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Available drivers" subtitle={`${delivery.pickupArea} to ${delivery.dropoffArea}`} onBack={() => go('sellerHome')} />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">{delivery.pickupArea} to {delivery.dropoffArea}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">{delivery.packageType} - {delivery.urgency}</p>
            </div>
            <StatusBadge status={delivery.status} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-[10px] font-bold text-slate-500">Fair price</p>
              <p className="text-xs font-black text-slate-900">{formatNaira(delivery.fairPriceMin)} - {formatNaira(delivery.fairPriceMax)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-[10px] font-bold text-slate-500">Risk</p>
              <p className="text-xs font-black text-amber-700">{delivery.riskScore}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-[10px] font-bold text-slate-500">ETA</p>
              <p className="text-xs font-black text-slate-900">{delivery.estimatedDuration}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-slate-900 p-4 text-white">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="text-orange-400" size={18} />
            <h2 className="text-sm font-black">AI recommendation</h2>
          </div>
          <p className="text-sm font-bold text-white">Recommended driver: {recommended?.name}</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">{delivery.aiRecommendation}</p>
        </section>

        <MapVisual delivery={delivery} drivers={drivers} />

        <div className="space-y-3">
          {drivers.map((driver) => (
            <DriverCard key={driver.driverId} driver={driver} recommended={driver.driverId === delivery.recommendedDriverId} />
          ))}
        </div>
      </div>
      <div className="border-t border-slate-200 bg-white p-5">
        <PrimaryButton onClick={() => go('tracking')} icon={Truck}>Track Open Delivery</PrimaryButton>
      </div>
    </div>
  );
}

function DriverCard({ driver, recommended, onAccept }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-xs font-black text-white">{initials(driver.name)}</div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">{driver.name}</h3>
              <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${recommended ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{recommended ? 'Recommended' : driver.badge}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1"><Star size={12} className="text-amber-500" />{driver.trustScore}% trust</span>
              <span>{driver.completionRate}% completion</span>
              <span>{driver.distanceKm} km away</span>
              <span>{driver.averagePickupTime} mins pickup</span>
            </div>
          </div>
        </div>
        <p className="shrink-0 text-sm font-black text-slate-950">{formatNaira(driver.estimatedFee)}</p>
      </div>
      {onAccept ? (
        <button type="button" onClick={() => onAccept(driver)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-3 text-sm font-bold text-white">
          <CheckCircle2 size={17} /> Accept Job
        </button>
      ) : null}
    </div>
  );
}

function Tracking({ delivery, drivers, events, go }) {
  if (!delivery) {
    return (
      <div className="flex flex-1 flex-col">
        <Header title="Tracking" onBack={() => go('sellerHome')} />
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <Truck className="mb-4 text-slate-300" size={46} />
          <h2 className="text-lg font-black text-slate-900">No active delivery</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Create a delivery to see tracking.</p>
        </div>
        <BottomNav go={go} active="tracking" role="seller_receiver" />
      </div>
    );
  }

  const assigned = drivers.find((driver) => driver.driverId === delivery.assignedDriverId);

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Delivery tracking" subtitle={`${delivery.pickupArea} to ${delivery.dropoffArea}`} onBack={() => go('sellerHome')} />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Package status</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{STATUS_LABELS[delivery.status]}</h2>
            </div>
            <StatusBadge status={delivery.status} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-bold text-slate-600">
            <p>Rider: <span className="text-slate-950">{assigned?.name || 'Waiting for driver'}</span></p>
            <p>Receiver: <span className="text-slate-950">{delivery.receiverName}</span></p>
            <p>Package: <span className="text-slate-950">{delivery.packageType}</span></p>
            <p>Fee: <span className="text-slate-950">{formatNaira(delivery.totalDeliveryFee)}</span></p>
          </div>
          {delivery.smsStatus ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">SMS confirmation link sent to receiver.</p> : null}
        </section>

        <MapVisual delivery={delivery} drivers={assigned ? [assigned] : drivers} assignedDriver={assigned} />
        <Timeline status={delivery.status} events={events} />
      </div>
      <BottomNav go={go} active="tracking" role="seller_receiver" />
    </div>
  );
}

function Incoming({ delivery, go }) {
  const incomingReady = delivery && ['IN_TRANSIT', 'DELIVERED', 'CONFIRMED', 'COMPLETED'].includes(delivery.status);

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Incoming deliveries" onBack={() => go('sellerHome')} />
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {incomingReady ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900">Incoming Delivery</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">From: {delivery.senderName}</p>
              </div>
              <StatusBadge status={delivery.status} />
            </div>
            <div className="space-y-2 text-sm font-bold text-slate-600">
              <p>Package: <span className="text-slate-950">{delivery.packageType}</span></p>
              <p>Route: <span className="text-slate-950">{delivery.pickupArea} to {delivery.dropoffArea}</span></p>
              <p>Estimated time: <span className="text-slate-950">{delivery.estimatedDuration}</span></p>
            </div>
            <button type="button" onClick={() => go('receiverDetail')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-3 text-sm font-bold text-white">
              View Delivery <ChevronRight size={17} />
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
            <Inbox className="mb-4 text-slate-300" size={46} />
            <h2 className="text-lg font-black text-slate-900">No incoming deliveries</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Packages headed to you will show here.</p>
          </div>
        )}
      </div>
      <BottomNav go={go} active="incoming" role="seller_receiver" />
    </div>
  );
}

function ReceiverDetail({ delivery, driver, confirmDelivery, reportIssue, go }) {
  const delivered = delivery?.status === 'DELIVERED';

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Receiver confirmation" subtitle={delivery ? STATUS_LABELS[delivery.status] : ''} onBack={() => go('incoming')} />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <section className={`rounded-lg border p-4 ${delivered ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'}`}>
          <h2 className={`text-base font-black ${delivered ? 'text-emerald-900' : 'text-blue-900'}`}>{delivered ? 'Package marked as delivered.' : 'Your package is on the way.'}</h2>
          <p className={`mt-1 text-xs font-bold leading-5 ${delivered ? 'text-emerald-800' : 'text-blue-800'}`}>{delivered ? 'Please confirm once you have received it.' : `Status: ${STATUS_LABELS[delivery?.status] || 'Waiting'}`}</p>
        </section>

        {delivery ? (
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="space-y-3 text-sm font-bold text-slate-600">
              <p>Sender: <span className="text-slate-950">{delivery.senderName}</span></p>
              <p>Package: <span className="text-slate-950">{delivery.packageType}</span></p>
              <p>Driver: <span className="text-slate-950">{driver?.name || 'Waiting for driver'}</span></p>
              <p>Route: <span className="text-slate-950">{delivery.pickupArea} to {delivery.dropoffArea}</span></p>
            </div>
          </section>
        ) : null}
      </div>
      <div className="space-y-3 border-t border-slate-200 bg-white p-5">
        <PrimaryButton onClick={confirmDelivery} disabled={!delivered} icon={CheckCircle2} tone="green">Confirm Delivery</PrimaryButton>
        {delivered ? <PrimaryButton onClick={reportIssue} icon={AlertTriangle} tone="light">I did not receive this</PrimaryButton> : null}
      </div>
    </div>
  );
}

function DriverHome({ user, delivery, availability, setAvailability, go }) {
  const openCount = delivery?.status === 'OPEN_FOR_DRIVERS' && availability === 'ONLINE' ? 1 : 0;
  const assigned = delivery?.assignedDriverId === 'drv-current' || delivery?.assignedDriverId === user?.driverId;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-500">Driver dashboard</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">{user?.driverProfile?.name || user?.name}</h1>
          </div>
          <button type="button" onClick={() => go('role')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">Role</button>
        </div>

        <button type="button" onClick={() => setAvailability(availability === 'ONLINE' ? 'OFFLINE' : 'ONLINE')} className="mb-4 flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
          <span>
            <span className="block text-sm font-black text-slate-900">Availability</span>
            <span className="block text-xs font-semibold text-slate-500">Drivers see jobs while online.</span>
          </span>
          <span className="flex items-center gap-2 text-sm font-black text-slate-900">
            {availability === 'ONLINE' ? <ToggleRight className="text-emerald-600" /> : <ToggleLeft className="text-slate-400" />}
            {availability === 'ONLINE' ? 'Online' : 'Offline'}
          </span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => go('driverJobs')} className="rounded-lg border border-slate-200 bg-white p-4 text-left">
            <Boxes className="mb-4 text-orange-600" size={24} />
            <h3 className="text-sm font-black text-slate-900">Available Jobs</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">{openCount} open job</p>
          </button>
          <button type="button" onClick={() => go('driverRoute')} className="rounded-lg border border-slate-200 bg-white p-4 text-left">
            <Route className="mb-4 text-blue-600" size={24} />
            <h3 className="text-sm font-black text-slate-900">Accepted Jobs</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">{assigned ? STATUS_LABELS[delivery.status] : 'No assigned job'}</p>
          </button>
        </div>

        {assigned ? (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Current job</p>
                <h2 className="mt-1 text-base font-black text-slate-900">{delivery.pickupArea} to {delivery.dropoffArea}</h2>
              </div>
              <StatusBadge status={delivery.status} />
            </div>
            <button type="button" onClick={() => go('driverRoute')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-3 text-sm font-bold text-white">
              Open Route <Navigation size={17} />
            </button>
          </section>
        ) : null}
      </div>
      <BottomNav go={go} active="driverHome" role="driver" />
    </div>
  );
}

function DriverJobs({ delivery, drivers, acceptJob, availability, go }) {
  const open = delivery?.status === 'OPEN_FOR_DRIVERS' && availability === 'ONLINE';

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Available jobs" subtitle={availability === 'ONLINE' ? 'Online' : 'Offline'} onBack={() => go('driverHome')} />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {open ? (
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">{delivery.pickupArea} to {delivery.dropoffArea}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">{delivery.packageType} - {delivery.urgency}</p>
              </div>
              <StatusBadge status={delivery.status} />
            </div>
            <MapVisual delivery={delivery} drivers={drivers} />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] font-bold text-slate-500">Fee</p><p className="text-xs font-black">{formatNaira(delivery.totalDeliveryFee)}</p></div>
              <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] font-bold text-slate-500">Route</p><p className="text-xs font-black">{delivery.estimatedDuration}</p></div>
              <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] font-bold text-slate-500">Risk</p><p className="text-xs font-black text-amber-700">{delivery.riskScore}</p></div>
            </div>
            <button type="button" onClick={acceptJob} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-3 text-sm font-bold text-white">
              <CheckCircle2 size={17} /> Accept Job
            </button>
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Boxes className="mb-4 text-slate-300" size={46} />
            <h2 className="text-lg font-black text-slate-900">No open jobs</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">{availability === 'ONLINE' ? 'New jobs will appear here.' : 'Go online to see available jobs.'}</p>
          </div>
        )}
      </div>
      <BottomNav go={go} active="driverJobs" role="driver" />
    </div>
  );
}

function DriverRoute({ delivery, driver, events, updateStatus, go }) {
  const nextStatus = {
    DRIVER_ACCEPTED: 'ROUTE_OPTIMIZED',
    ROUTE_OPTIMIZED: 'PICKED_UP',
    PICKED_UP: 'IN_TRANSIT',
    IN_TRANSIT: 'DELIVERED',
  }[delivery?.status];
  const buttonText = {
    ROUTE_OPTIMIZED: 'Optimize Route',
    PICKED_UP: 'Mark Picked Up',
    IN_TRANSIT: 'Start Trip',
    DELIVERED: 'Mark Delivered',
  }[nextStatus];

  if (!delivery || !driver) {
    return (
      <div className="flex flex-1 flex-col">
        <Header title="Route" onBack={() => go('driverHome')} />
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <Route className="mb-4 text-slate-300" size={46} />
          <h2 className="text-lg font-black text-slate-900">No assigned route</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Accept a job to see route details.</p>
        </div>
        <BottomNav go={go} active="driverRoute" role="driver" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Optimized route" subtitle={`${delivery.pickupArea} to ${delivery.dropoffArea}`} onBack={() => go('driverHome')} />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <MapVisual delivery={delivery} drivers={[driver]} assignedDriver={driver} />
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Route ready</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">{delivery.estimatedDistance} - {delivery.estimatedDuration}</h2>
            </div>
            <StatusBadge status={delivery.status} />
          </div>
          <div className="space-y-2 text-sm font-bold text-slate-600">
            <p>Pickup: <span className="text-slate-950">{delivery.pickupAddress}</span></p>
            <p>Drop-off: <span className="text-slate-950">{delivery.dropoffAddress}</span></p>
          </div>
          <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold leading-5 text-blue-800">
            AI route note: This Amazon Location route balances distance and travel time. Expect moderate traffic near Lekki.
          </p>
        </section>
        <Timeline status={delivery.status} events={events} />
      </div>
      <div className="border-t border-slate-200 bg-white p-5">
        {nextStatus ? <PrimaryButton onClick={() => updateStatus(nextStatus)} icon={Navigation}>{buttonText}</PrimaryButton> : <PrimaryButton onClick={() => go('driverHome')} icon={CheckCircle2} tone="green">Job Waiting For Receiver</PrimaryButton>}
      </div>
    </div>
  );
}

function Completed({ delivery, driver, reset, go }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={42} />
          </div>
          <h1 className="text-2xl font-black text-slate-950">Delivery Completed</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Receiver confirmed delivery. Delivery has been completed successfully.</p>
        </div>

        {delivery ? (
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-xs font-bold uppercase text-slate-500">Summary</h2>
            <div className="space-y-2 text-sm font-bold text-slate-600">
              <p>Delivery ID: <span className="text-slate-950">{delivery.deliveryId}</span></p>
              <p>Sender: <span className="text-slate-950">{delivery.senderName}</span></p>
              <p>Receiver: <span className="text-slate-950">{delivery.receiverName}</span></p>
              <p>Driver: <span className="text-slate-950">{driver?.name || 'Assigned driver'}</span></p>
              <p>Package: <span className="text-slate-950">{delivery.packageType}</span></p>
              <p>Route: <span className="text-slate-950">{delivery.pickupArea} to {delivery.dropoffArea}</span></p>
              <p>Total fee: <span className="text-slate-950">{formatNaira(delivery.totalDeliveryFee)}</span></p>
              <p>Final status: <span className="text-slate-950">{STATUS_LABELS[delivery.status]}</span></p>
            </div>
          </section>
        ) : null}
      </div>
      <div className="space-y-3 border-t border-slate-200 bg-white p-5">
        <PrimaryButton onClick={reset} icon={Package}>Send Another Package</PrimaryButton>
        <PrimaryButton onClick={() => go('sellerHome')} icon={Home} tone="light">Back Home</PrimaryButton>
      </div>
    </div>
  );
}

function ReportIssue({ delivery, go }) {
  return (
    <div className="flex flex-1 flex-col">
      <Header title="Issue reported" onBack={() => go('receiverDetail')} />
      <div className="flex flex-1 flex-col justify-center px-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-700">
          <AlertTriangle size={34} />
        </div>
        <h1 className="text-xl font-black text-slate-950">Delivery issue reported.</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">This delivery will be reviewed by Mootive support.</p>
        <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">{delivery?.deliveryId || 'No delivery ID'}</p>
      </div>
      <div className="border-t border-slate-200 bg-white p-5">
        <PrimaryButton onClick={() => go('sellerHome')} icon={Home}>Back Home</PrimaryButton>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('landing');
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [drivers] = useState(SEED_DRIVERS);
  const [delivery, setDelivery] = useState(null);
  const [events, setEvents] = useState([]);
  const [availability, setAvailabilityState] = useState('ONLINE');

  const currentDriver = useMemo(() => {
    if (!delivery?.assignedDriverId) return null;
    if (delivery.assignedDriverId === 'drv-current') {
      return {
        driverId: 'drv-current',
        name: user?.driverProfile?.name || user?.name || 'Current Driver',
        vehicleType: user?.driverProfile?.vehicleType || 'Bike',
        trustScore: 88,
        completionRate: 93,
        averagePickupTime: 13,
        distanceKm: 1.1,
        estimatedFee: delivery.totalDeliveryFee,
      };
    }
    return drivers.find((driver) => driver.driverId === delivery.assignedDriverId) || null;
  }, [delivery, drivers, user]);

  const go = (nextView) => setView(nextView);

  const setAvailability = async (status) => {
    setAvailabilityState(status);
    await api.updateRiderAvailability({ availabilityStatus: status }).catch(() => null);
  };

  const analyzeDelivery = async () => {
    const analysis = buildAnalysis(form, drivers);
    const draft = buildDelivery(form, user || { userId: 'demo-user', name: 'Tara Styles' }, analysis);
    setDelivery(draft);
    setEvents([
      makeEvent('CREATED', 'seller_receiver', 'Delivery created by sender.'),
      makeEvent('ANALYZED', 'system', 'Mootive analyzed price, risk, and driver fit.'),
      makeEvent('OPEN_FOR_DRIVERS', 'system', 'Delivery opened to available drivers.'),
    ]);

    await api.createDelivery(draft).catch(() => null);
    await api.analyzeDelivery(draft.deliveryId).catch(() => null);
  };

  const acceptJob = async () => {
    if (!delivery || delivery.status !== 'OPEN_FOR_DRIVERS') return;
    const accepted = {
      ...delivery,
      assignedDriverId: 'drv-current',
      status: 'DRIVER_ACCEPTED',
    };
    setDelivery(accepted);
    setEvents((prev) => [...prev, makeEvent('DRIVER_ACCEPTED', 'driver', 'Driver accepted the delivery job.')]);
    await api.acceptJob(delivery.deliveryId).catch(() => null);
    go('driverRoute');
  };

  const updateStatus = async (status) => {
    if (!delivery) return;
    const next = { ...delivery, status };
    setDelivery(next);
    setEvents((prev) => [...prev, makeEvent(status, 'driver', `Delivery updated to ${STATUS_LABELS[status]}.`)]);
    await api.updateDeliveryStatus(delivery.deliveryId, status).catch(() => null);
  };

  const confirmDelivery = async () => {
    if (!delivery || delivery.status !== 'DELIVERED') return;
    const confirmed = { ...delivery, status: 'COMPLETED' };
    setDelivery(confirmed);
    setEvents((prev) => [
      ...prev,
      makeEvent('CONFIRMED', 'receiver', 'Receiver confirmed delivery.'),
      makeEvent('COMPLETED', 'system', 'Delivery completed successfully.'),
    ]);
    await api.confirmDelivery(delivery.deliveryId, delivery.confirmationToken).catch(() => null);
    go('completed');
  };

  const reportIssue = async () => {
    if (!delivery) return;
    const issue = { ...delivery, status: 'ISSUE_REPORTED' };
    setDelivery(issue);
    setEvents((prev) => [...prev, makeEvent('ISSUE_REPORTED', 'receiver', 'Receiver reported a delivery issue.')]);
    await api.reportIssue(delivery.deliveryId, 'Receiver says package was not received.').catch(() => null);
    go('reportIssue');
  };

  const reset = () => {
    setForm(INITIAL_FORM);
    setDelivery(null);
    setEvents([]);
    go(user?.role === 'driver' ? 'driverHome' : 'sellerHome');
  };

  const screen = (() => {
    switch (view) {
      case 'landing':
        return <Landing go={go} />;
      case 'signup':
        return <AuthScreen mode="signup" go={go} setUser={setUser} />;
      case 'login':
        return <AuthScreen mode="login" go={go} setUser={setUser} />;
      case 'role':
        return <RoleSetup user={user} setUser={setUser} go={go} />;
      case 'sellerHome':
        return <SellerHome user={user} delivery={delivery} go={go} />;
      case 'create':
        return <CreateDelivery form={form} setForm={setForm} go={go} analyzeDelivery={analyzeDelivery} />;
      case 'finding':
        return <FindingDrivers go={go} delivery={delivery} />;
      case 'drivers':
        return <DriverRecommendation delivery={delivery} drivers={drivers} go={go} />;
      case 'tracking':
        return <Tracking delivery={delivery} drivers={drivers} events={events} go={go} />;
      case 'incoming':
        return <Incoming delivery={delivery} go={go} />;
      case 'receiverDetail':
        return <ReceiverDetail delivery={delivery} driver={currentDriver} confirmDelivery={confirmDelivery} reportIssue={reportIssue} go={go} />;
      case 'driverHome':
        return <DriverHome user={user} delivery={delivery} availability={availability} setAvailability={setAvailability} go={go} />;
      case 'driverJobs':
        return <DriverJobs delivery={delivery} drivers={drivers} acceptJob={acceptJob} availability={availability} go={go} />;
      case 'driverRoute':
        return <DriverRoute delivery={delivery} driver={currentDriver} events={events} updateStatus={updateStatus} go={go} />;
      case 'completed':
        return <Completed delivery={delivery} driver={currentDriver} reset={reset} go={go} />;
      case 'reportIssue':
        return <ReportIssue delivery={delivery} go={go} />;
      default:
        return <Landing go={go} />;
    }
  })();

  return <Shell>{screen}</Shell>;

}
