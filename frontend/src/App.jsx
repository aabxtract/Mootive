import { useEffect, useMemo, useState, useRef } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Clock3,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Navigation,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  User,
} from 'lucide-react';
import * as api from './lib/api';
import * as auth from './lib/auth';
import OnboardingCarousel from './OnboardingCarousel';
import SplashScreen from './SplashScreen';
import DeliveryTimeline from './components/DeliveryTimeline';
import RouteSummaryCard from './components/RouteSummaryCard';

const PENDING_PROFILE_KEY = 'mootive.pendingProfile';
const ONBOARDING_COMPLETE_KEY = 'mootive.onboardingComplete';
const SPLASH_DURATION_MS = 1700;

const DEFAULT_COORDS = {
  pickupLat: 6.515,
  pickupLng: 3.385,
  dropoffLat: 6.447,
  dropoffLng: 3.471,
  driverLat: 6.5095,
  driverLng: 3.3711,
};

const STATUS_LABELS = {
  CREATED: 'Created',
  ANALYZED: 'Analyzed',
  OPEN_FOR_DRIVERS: 'Open for drivers',
  DRIVER_ACCEPTED: 'Accepted',
  ROUTE_OPTIMIZED: 'Route optimized',
  PICKED_UP: 'Picked up',
  IN_TRANSIT: 'In transit',
  DELIVERED: 'Delivered',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  ISSUE_REPORTED: 'Issue reported',
};

const NEXT_DRIVER_STATUS = {
  DRIVER_ACCEPTED: 'PICKED_UP',
  ROUTE_OPTIMIZED: 'PICKED_UP',
  PICKED_UP: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
};

const SIM_DRIVERS = [
  { id: 'd1', name: 'Chidi Obi', initials: 'CO', vehicle: 'Motorcycle', rating: 4.8, price: 2500, eta: '8 min', color: 'bg-orange-500' },
  { id: 'd2', name: 'Funke Adeyemi', initials: 'FA', vehicle: 'Car', rating: 4.9, price: 3200, eta: '12 min', color: 'bg-blue-500' },
  { id: 'd3', name: 'Tunde Balogun', initials: 'TB', vehicle: 'Motorcycle', rating: 4.7, price: 2200, eta: '6 min', color: 'bg-emerald-500' },
  { id: 'd4', name: 'Aisha Mohammed', initials: 'AM', vehicle: 'Car', rating: 4.9, price: 3000, eta: '10 min', color: 'bg-purple-500' },
  { id: 'd5', name: 'Emeka Nwosu', initials: 'EN', vehicle: 'Motorcycle', rating: 4.6, price: 2800, eta: '15 min', color: 'bg-rose-500' },
];

const ENTRY_DELAYS = [800, 2200, 3600, 5000, 6200];

const DELIVERY_FORM_DEFAULTS = {
  receiverName: '',
  receiverTag: '',
  receiverPhone: '',
  pickupAddress: '',
  pickupArea: '',
  pickupLat: String(DEFAULT_COORDS.pickupLat),
  pickupLng: String(DEFAULT_COORDS.pickupLng),
  dropoffAddress: '',
  dropoffArea: '',
  dropoffLat: String(DEFAULT_COORDS.dropoffLat),
  dropoffLng: String(DEFAULT_COORDS.dropoffLng),
  packageType: 'Parcel',
  packageValue: '',
  urgency: 'normal',
  deliveryNote: '',
};

function loadPendingProfile() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_PROFILE_KEY) || 'null');
  } catch {
    return null;
  }
}

function hasCompletedOnboarding() {
  return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
}

function readError(error) {
  return error?.data?.message || error?.message || 'Something went wrong.';
}

function normalizePhone(phone) {
  const trimmed = String(phone || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed.replace(/\s+/g, '');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `+234${digits.slice(1)}`;
  if (digits.startsWith('234')) return `+${digits}`;
  return `+${digits}`;
}

function usernameFromEmail(email) {
  return String(email || '')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

function parseCoord(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sortRecent(items) {
  return [...(items || [])].sort((a, b) => {
    const left = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const right = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return right - left;
  });
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 'Pending';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(number);
}

function statusTone(status) {
  if (status === 'COMPLETED' || status === 'CONFIRMED') return 'bg-black text-white border-black';
  if (status === 'ISSUE_REPORTED') return 'bg-[#FF5600] text-white border-[#FF5600]';
  if (status === 'DELIVERED' || status === 'IN_TRANSIT' || status === 'PICKED_UP') return 'bg-[#FF5600]/10 text-[#FF5600] border-[#FF5600]/25';
  if (status === 'OPEN_FOR_DRIVERS' || status === 'DRIVER_ACCEPTED' || status === 'ROUTE_OPTIMIZED') return 'bg-[#FF5600]/10 text-[#FF5600] border-[#FF5600]/25';
  return 'bg-white text-black border-black/15';
}

function Shell({ children, error, notice, busyLabel }) {
  return (
    <div className="min-h-screen bg-white text-black">
      <main className="mx-auto flex h-screen w-full max-w-[430px] flex-col bg-white shadow-xl sm:my-4 sm:h-[calc(100vh-2rem)] sm:rounded-lg sm:border sm:border-black/10">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {(error || notice || busyLabel) && (
            <div className="border-b border-slate-200 bg-white px-4 py-3">
              {busyLabel && (
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {busyLabel}
                </div>
              )}
              {error && !busyLabel && <p className="text-sm font-semibold text-rose-700">{error}</p>}
              {notice && !error && !busyLabel && <p className="text-sm font-semibold text-emerald-700">{notice}</p>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

function TopBar({ title, subtitle, onBack, onLogout, action }) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-slate-950">{title}</h1>
            {subtitle && <p className="truncate text-sm font-medium text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function Button({ children, icon: Icon, variant = 'primary', className = '', disabled, ...props }) {
  const styles = {
    primary: 'bg-[#FF5600] text-white border-[#FF5600]',
    secondary: 'bg-white text-black border-black/15',
    success: 'bg-[#FF5600] text-white border-[#FF5600]',
    warning: 'bg-[#FF5600] text-white border-[#FF5600]',
    ghost: 'bg-transparent text-black/70 border-transparent',
  };
  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span className="truncate">{children}</span>
    </button>
  );
}

function Field({ label, icon: Icon, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </span>
      <input
        className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold text-slate-950 outline-none focus:border-slate-950"
        {...props}
      />
    </label>
  );
}

function SelectField({ label, children, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <select
        className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold text-slate-950 outline-none focus:border-slate-950"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

function TextArea({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <textarea
        className="min-h-24 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-base font-semibold text-slate-950 outline-none focus:border-slate-950"
        {...props}
      />
    </label>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-extrabold ${statusTone(status)}`}>
      {STATUS_LABELS[status] || status || 'Pending'}
    </span>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 text-slate-500">
        {Icon && <Icon className="h-4 w-4" />}
        <p className="text-xs font-bold uppercase tracking-[0.08em]">{label}</p>
      </div>
      <p className="mt-2 text-base font-black text-slate-950">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value || 'Pending'}</p>
    </div>
  );
}

function EmptyState({ title, body, icon: Icon = Package }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-400" />
      <p className="mt-3 text-sm font-black text-slate-950">{title}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{body}</p>
    </div>
  );
}

function MapPreview({ delivery }) {
  return (
    <div className="map-grid relative min-h-40 overflow-hidden rounded-lg border border-slate-200">
      <div className="absolute left-6 top-6 rounded-lg bg-white px-3 py-2 shadow-sm">
        <p className="text-xs font-black text-emerald-700">Pickup</p>
        <p className="max-w-40 truncate text-sm font-bold text-slate-900">{delivery?.pickupArea || delivery?.pickupAddress || 'Pickup'}</p>
      </div>
      <div className="absolute bottom-6 right-6 rounded-lg bg-white px-3 py-2 shadow-sm">
        <p className="text-xs font-black text-rose-700">Dropoff</p>
        <p className="max-w-40 truncate text-sm font-bold text-slate-900">{delivery?.dropoffArea || delivery?.dropoffAddress || 'Dropoff'}</p>
      </div>
      <div className="absolute left-[30%] top-[48%] h-1 w-[42%] rotate-12 rounded-full bg-slate-950" />
      <MapPin className="absolute left-[25%] top-[42%] h-6 w-6 text-emerald-600" />
      <MapPin className="absolute right-[20%] top-[52%] h-6 w-6 text-rose-600" />
    </div>
  );
}

function DeliveryCard({ delivery, onClick, actionLabel, actionIcon: ActionIcon = ChevronRight }) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(delivery)}
      className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{delivery.deliveryId}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {delivery.pickupArea || delivery.pickupAddress} to {delivery.dropoffArea || delivery.dropoffAddress}
          </p>
        </div>
        <StatusBadge status={delivery.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric label="Fee" value={formatMoney(delivery.totalDeliveryFee)} icon={Package} />
        <Metric label="Risk" value={delivery.riskScore || 'Pending'} icon={ShieldCheck} />
      </div>
      {actionLabel && (
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-black text-slate-950">
          <span>{actionLabel}</span>
          <ActionIcon className="h-4 w-4" />
        </div>
      )}
    </button>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(hasCompletedOnboarding);
  const [view, setView] = useState('loading');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phoneNumber: '', password: '', code: '' });
  const [roleForm, setRoleForm] = useState({
    role: 'seller_receiver',
    name: '',
    username: '',
    phoneNumber: '',
    currentArea: '',
    vehicleType: 'motorcycle',
  });
  const [deliveryForm, setDeliveryForm] = useState(DELIVERY_FORM_DEFAULTS);
  const [confirmForm, setConfirmForm] = useState({ deliveryId: '', confirmationToken: '' });
  const [profile, setProfile] = useState(null);
  const [authIdentity, setAuthIdentity] = useState(null);
  const [pendingProfile, setPendingProfile] = useState(loadPendingProfile);
  const [sentDeliveries, setSentDeliveries] = useState([]);
  const [incomingDeliveries, setIncomingDeliveries] = useState([]);
  const [openJobs, setOpenJobs] = useState([]);
  const [acceptedJobs, setAcceptedJobs] = useState([]);
  const [driver, setDriver] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [route, setRoute] = useState(null);
  const [events, setEvents] = useState([]);
  const [completedDelivery, setCompletedDelivery] = useState(null);
  const [sellerTab, setSellerTab] = useState('sent');
  const [busyLabel, setBusyLabel] = useState('');
  const [findDriverPhase, setFindDriverPhase] = useState('idle');
  const [findDriverProgress, setFindDriverProgress] = useState(0);
  const [visibleDrivers, setVisibleDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isBusy = Boolean(busyLabel);
  const selectedDelivery = delivery || activeJob;
  const simStarted = useRef(false);

  useEffect(() => {
    if (view !== 'findDrivers') {
      simStarted.current = false;
      setFindDriverPhase('idle');
      setFindDriverProgress(0);
      setVisibleDrivers([]);
      setSelectedDriver(null);
      return;
    }
    if (simStarted.current) return;
    simStarted.current = true;

    setFindDriverPhase('searching');

    const tids = [];
    ENTRY_DELAYS.forEach((delay, i) => {
      const t = setTimeout(() => {
        setVisibleDrivers(prev => [...prev, SIM_DRIVERS[i].id]);
        if (i === SIM_DRIVERS.length - 1) {
          const sorted = [...SIM_DRIVERS].sort((a, b) => (b.rating * 10000 / b.price) - (a.rating * 10000 / a.price));
          const best = sorted[0];
          setSelectedDriver(best);
          setFindDriverPhase('completed');
          const navTimer = setTimeout(() => {
            setDelivery(prev => prev ? { ...prev, assignedDriverId: best.id, recommendedDriverName: best.name, aiRecommendation: { ...(prev.aiRecommendation || {}), recommendedDriverName: best.name }, estimatedDuration: best.eta, totalDeliveryFee: best.price, riskScore: 2 } : prev);
            setView('sellerDelivery');
          }, 2500);
          tids.push(navTimer);
        }
      }, delay);
      tids.push(t);
    });
    const prog = setInterval(() => setFindDriverProgress(p => Math.min(p + 100, 100)), 80);
    tids.push(prog);
    return () => tids.forEach(clearTimeout);
  }, [view]);

  const dashboardTitle = useMemo(() => {
    if (!profile) return 'Mootive';
    return profile.role === 'driver' ? 'Driver dashboard' : 'Seller / receiver';
  }, [profile]);

  async function runTask(label, task) {
    setBusyLabel(label);
    setError('');
    setNotice('');
    try {
      await task();
    } catch (err) {
      setError(readError(err));
    } finally {
      setBusyLabel('');
    }
  }

  async function refreshSellerData() {
    const [sent, incoming] = await Promise.all([api.getSentDeliveries(), api.getIncomingDeliveries()]);
    setSentDeliveries(sortRecent(sent.deliveries));
    setIncomingDeliveries(sortRecent(incoming.deliveries));
  }

  async function refreshDriverData() {
    const driverRes = await api.getDriverMe();
    const [open, accepted] = await Promise.all([api.getOpenJobs(), api.getAcceptedJobs()]);
    const acceptedList = sortRecent(accepted.deliveries);
    setDriver(driverRes.driver);
    setOpenJobs(sortRecent(open.deliveries));
    setAcceptedJobs(acceptedList);
    setActiveJob((current) => {
      const updatedCurrent = acceptedList.find((item) => item.deliveryId === current?.deliveryId);
      return updatedCurrent || acceptedList.find((item) => !['COMPLETED', 'ISSUE_REPORTED'].includes(item.status)) || null;
    });
  }

  async function syncProfile(identityForRole = authIdentity) {
    try {
      const { user } = await api.getMe();
      setProfile(user);
      localStorage.removeItem(PENDING_PROFILE_KEY);
      setPendingProfile(null);
      if (user.role === 'driver') {
        await refreshDriverData();
        setView('driver');
      } else {
        await refreshSellerData();
        setView('seller');
      }
    } catch (err) {
      if (err.status === 401 || err.status === 404) {
        const pending = loadPendingProfile();
        setProfile(null);
        setRoleForm((current) => ({
          ...current,
          name: current.name || pending?.name || '',
          phoneNumber: current.phoneNumber || pending?.phoneNumber || '',
          username: current.username || usernameFromEmail(identityForRole?.email || pending?.email),
        }));
        setView('role');
        return;
      }
      throw err;
    }
  }

  function completeOnboarding() {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setOnboardingComplete(true);
    setShowSplash(false);
    setView('auth');
  }

  function resetOnboarding() {
    localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    setOnboardingComplete(false);
    setShowSplash(false);
    setView('auth');
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, SPLASH_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.mootiveResetOnboarding = resetOnboarding;
    return () => {
      delete window.mootiveResetOnboarding;
    };
  });

  useEffect(() => {
    let alive = true;

    async function boot() {
      setBusyLabel('Checking session');
      setError('');
      try {
        if (!hasCompletedOnboarding()) {
          if (alive) setView('auth');
          return;
        }

        if (!auth.env.apiUrl || !auth.hasCognitoConfig()) {
          if (alive) {
            setNotice('Add VITE_API_BASE_URL and Cognito values in frontend/.env.');
            setView('auth');
          }
          return;
        }

        const identity = await auth.currentAuthUser();
        if (!alive) return;
        setAuthIdentity(identity);
        if (!identity) {
          setView('auth');
          return;
        }
        await syncProfile(identity);
      } catch (err) {
        if (alive) {
          setError(readError(err));
          setView('auth');
        }
      } finally {
        if (alive) setBusyLabel('');
      }
    }

    boot();
    return () => {
      alive = false;
    };
    // syncProfile is intentionally called once during boot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshEvents(deliveryId) {
    const result = await api.getDeliveryEvents(deliveryId);
    setEvents(result.events || []);
  }

  async function hydrateDelivery(deliveryId) {
    const result = await api.getDelivery(deliveryId);
    setDelivery(result.delivery);
    setConfirmForm((current) => ({
      ...current,
      deliveryId,
      confirmationToken: result.delivery.confirmationToken || current.confirmationToken,
    }));
    await refreshEvents(deliveryId);
    return result.delivery;
  }

  function patchAuthForm(key, value) {
    setAuthForm((current) => ({ ...current, [key]: value }));
  }

  function patchRoleForm(key, value) {
    setRoleForm((current) => ({ ...current, [key]: value }));
  }

  function patchDeliveryForm(key, value) {
    setDeliveryForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSignup(event) {
    event.preventDefault();
    await runTask('Creating account', async () => {
      const phoneNumber = normalizePhone(authForm.phoneNumber);
      const result = await auth.signup({
        name: authForm.name.trim(),
        email: authForm.email.trim().toLowerCase(),
        phoneNumber,
        password: authForm.password,
      });
      const nextPending = {
        name: authForm.name.trim(),
        email: authForm.email.trim().toLowerCase(),
        phoneNumber,
      };
      localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(nextPending));
      setPendingProfile(nextPending);
      if (result.nextStep?.signUpStep === 'CONFIRM_SIGN_UP' || !result.isSignUpComplete) {
        setAuthMode('confirm');
        setNotice('Enter the confirmation code sent by Cognito.');
      } else {
        setAuthMode('login');
        setNotice('Account created. Sign in to continue.');
      }
    });
  }

  async function handleConfirm(event) {
    event.preventDefault();
    await runTask('Confirming account', async () => {
      await auth.confirmSignup({
        email: authForm.email.trim().toLowerCase(),
        code: authForm.code.trim(),
      });
      setAuthMode('login');
      setNotice('Account confirmed. Sign in with your password.');
    });
  }

  async function handleResendCode() {
    await runTask('Sending code', async () => {
      await auth.resendCode(authForm.email.trim().toLowerCase());
      setNotice('A fresh confirmation code was sent.');
    });
  }

  async function handleLogin(event) {
    event.preventDefault();
    await runTask('Signing in', async () => {
      await auth.login(authForm.email.trim().toLowerCase(), authForm.password);
      const identity = await auth.currentAuthUser();
      setAuthIdentity(identity);
      await syncProfile(identity);
    });
  }

  async function handleRoleSubmit(event) {
    event.preventDefault();
    await runTask('Saving profile', async () => {
      const userResult = await api.createUserProfile({
        name: roleForm.name.trim(),
        phoneNumber: normalizePhone(roleForm.phoneNumber),
        username: roleForm.username.trim().toLowerCase(),
        role: roleForm.role,
      });
      setProfile(userResult.user);
      localStorage.removeItem(PENDING_PROFILE_KEY);
      setPendingProfile(null);

      if (roleForm.role === 'driver') {
        await api.createDriverProfile({
          currentArea: roleForm.currentArea.trim() || 'Lagos',
          currentLat: DEFAULT_COORDS.driverLat,
          currentLng: DEFAULT_COORDS.driverLng,
          vehicleType: roleForm.vehicleType,
        });
        await api.updateAvailability({
          available: true,
          lat: DEFAULT_COORDS.driverLat,
          lng: DEFAULT_COORDS.driverLng,
          currentArea: roleForm.currentArea.trim() || 'Lagos',
        });
        await refreshDriverData();
        setView('driver');
      } else {
        await refreshSellerData();
        setView('seller');
      }
    });
  }

  async function handleLogout() {
    await runTask('Signing out', async () => {
      await auth.logout();
      setProfile(null);
      setAuthIdentity(null);
      setDriver(null);
      setDelivery(null);
      setActiveJob(null);
      setCompletedDelivery(null);
      setView('auth');
      setAuthMode('login');
    });
  }

  async function handleCreateDelivery(event) {
    event.preventDefault();
    if (!deliveryForm.receiverTag.trim() && !deliveryForm.receiverPhone.trim()) {
      setError('Add a receiver handle or phone number.');
      return;
    }
    const dummy = {
      deliveryId: 'DEMO-' + Date.now().toString(36).toUpperCase(),
      senderName: profile?.name || 'Demo User',
      receiverTag: deliveryForm.receiverTag.trim(),
      receiverName: deliveryForm.receiverName.trim() || 'Demo Receiver',
      receiverPhone: normalizePhone(deliveryForm.receiverPhone) || '+2348012345678',
      pickupAddress: deliveryForm.pickupAddress.trim() || '123 Awolowo Road, Ikoyi',
      pickupArea: deliveryForm.pickupArea.trim() || 'Ikoyi',
      pickupLat: parseCoord(deliveryForm.pickupLat, DEFAULT_COORDS.pickupLat),
      pickupLng: parseCoord(deliveryForm.pickupLng, DEFAULT_COORDS.pickupLng),
      dropoffAddress: deliveryForm.dropoffAddress.trim() || '45 Admiralty Way, Lekki Phase 1',
      dropoffArea: deliveryForm.dropoffArea.trim() || 'Lekki Phase 1',
      dropoffLat: parseCoord(deliveryForm.dropoffLat, DEFAULT_COORDS.dropoffLat),
      dropoffLng: parseCoord(deliveryForm.dropoffLng, DEFAULT_COORDS.dropoffLng),
      packageType: deliveryForm.packageType || 'Parcel',
      packageValue: Number(deliveryForm.packageValue) || 0,
      urgency: deliveryForm.urgency || 'normal',
      deliveryNote: deliveryForm.deliveryNote.trim() || '',
      status: 'CREATED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedDistance: '4.2',
      estimatedDuration: '25',
      riskScore: 2,
      confirmationToken: 'CONFIRM-DEMO',
    };
    setDelivery(dummy);
    setConfirmForm({ deliveryId: dummy.deliveryId, confirmationToken: dummy.confirmationToken });
    setDeliveryForm(DELIVERY_FORM_DEFAULTS);
    setView('findDrivers');
  }

  async function handleAnalyzeDelivery() {
    if (!selectedDelivery?.deliveryId) return;
    await runTask('Analyzing delivery', async () => {
      const result = await api.analyzeDelivery(selectedDelivery.deliveryId);
      setDelivery(result.delivery);
      await refreshSellerData();
      await refreshEvents(result.delivery.deliveryId);
      setNotice('Delivery analyzed and opened for available drivers.');
    });
  }

  async function openDeliveryDetails(item, target = 'sellerDelivery') {
    await runTask('Loading delivery', async () => {
      await hydrateDelivery(item.deliveryId);
      setView(target);
    });
  }

  async function refreshCurrentDelivery() {
    if (!selectedDelivery?.deliveryId) return;
    await runTask('Refreshing delivery', async () => {
      const updated = await hydrateDelivery(selectedDelivery.deliveryId);
      if (activeJob?.deliveryId === updated.deliveryId) setActiveJob(updated);
      if (updated.status === 'COMPLETED') setCompletedDelivery(updated);
    });
  }

  async function handleDriverRefresh() {
    await runTask('Refreshing jobs', refreshDriverData);
  }

  async function handleAvailabilityToggle() {
    await runTask('Updating availability', async () => {
      const available = driver?.availabilityStatus !== 'available';
      const result = await api.updateAvailability({
        available,
        lat: driver?.currentLat || DEFAULT_COORDS.driverLat,
        lng: driver?.currentLng || DEFAULT_COORDS.driverLng,
        currentArea: driver?.currentArea || roleForm.currentArea || 'Lagos',
      });
      setDriver(result.driver);
      await refreshDriverData();
    });
  }

  async function handleAcceptJob(job) {
    await runTask('Accepting job', async () => {
      const result = await api.acceptJob(job.deliveryId);
      setActiveJob(result.delivery);
      setDelivery(result.delivery);
      setConfirmForm({
        deliveryId: result.delivery.deliveryId,
        confirmationToken: result.delivery.confirmationToken || '',
      });
      await refreshDriverData();
      await refreshEvents(result.delivery.deliveryId);
      setView('driverJob');
    });
  }

  async function handleOptimizeRoute() {
    if (!activeJob?.deliveryId) return;
    await runTask('Optimizing route', async () => {
      const result = await api.optimizeRoute(activeJob.deliveryId);
      setRoute(result.route);
      setActiveJob(result.delivery);
      setDelivery(result.delivery);
      await refreshEvents(result.delivery.deliveryId);
      await refreshDriverData();
    });
  }

  async function handleNextDriverStatus() {
    const nextStatus = NEXT_DRIVER_STATUS[activeJob?.status];
    if (!activeJob?.deliveryId || !nextStatus) return;
    await runTask(`Updating to ${STATUS_LABELS[nextStatus]}`, async () => {
      const result = await api.updateDeliveryStatus(activeJob.deliveryId, nextStatus);
      setActiveJob(result.delivery);
      setDelivery(result.delivery);
      await refreshEvents(result.delivery.deliveryId);
      await refreshDriverData();
      if (nextStatus === 'DELIVERED') {
        setConfirmForm({
          deliveryId: result.delivery.deliveryId,
          confirmationToken: result.delivery.confirmationToken || confirmForm.confirmationToken,
        });
      }
    });
  }

  function openReceiverConfirm(item = selectedDelivery) {
    setConfirmForm({
      deliveryId: item?.deliveryId || confirmForm.deliveryId,
      confirmationToken: item?.confirmationToken || confirmForm.confirmationToken,
    });
    setDelivery(item || delivery);
    setView('confirmDelivery');
  }

  async function handleConfirmDelivery(event) {
    event.preventDefault();
    await runTask('Confirming delivery', async () => {
      const deliveryId = confirmForm.deliveryId.trim();
      if (!deliveryId) throw new Error('Delivery ID is required.');
      const result = await api.confirmDelivery(deliveryId, confirmForm.confirmationToken.trim());
      setCompletedDelivery(result.delivery);
      setDelivery(result.delivery);
      setActiveJob((current) => (current?.deliveryId === result.delivery.deliveryId ? result.delivery : current));
      await refreshEvents(result.delivery.deliveryId);
      if (profile?.role === 'driver') await refreshDriverData();
      if (profile?.role === 'seller_receiver') await refreshSellerData();
      setView('completed');
    });
  }

  if (showSplash) {
    return <SplashScreen />;
  }

  if (!onboardingComplete) {
    return <OnboardingCarousel onComplete={completeOnboarding} onReset={resetOnboarding} showReset={import.meta.env.DEV} />;
  }

  if (view === 'loading') {
    return (
      <Shell error={error} notice={notice} busyLabel={busyLabel}>
        <section className="grid flex-1 place-items-center px-6 text-center">
          <div>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-slate-950 text-white">
              <Truck className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-2xl font-black text-slate-950">Mootive</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">Connecting to Cognito and your deployed API.</p>
          </div>
        </section>
      </Shell>
    );
  }

  if (view === 'auth') {
    return (
      <Shell error={error} notice={notice} busyLabel={busyLabel}>
        <section className="flex flex-1 flex-col overflow-y-auto px-5 py-6">
          <div className="mb-8">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white">
              <Truck className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-3xl font-black text-slate-950">Mootive</h1>
            <p className="mt-2 text-base font-semibold text-slate-500">Use Cognito email and password auth with the deployed backend.</p>
          </div>

          {authMode !== 'confirm' && (
            <div className="mb-5 grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`h-10 rounded-md text-sm font-black ${authMode === 'login' ? 'bg-slate-950 text-white' : 'text-slate-500'}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`h-10 rounded-md text-sm font-black ${authMode === 'signup' ? 'bg-slate-950 text-white' : 'text-slate-500'}`}
              >
                Sign up
              </button>
            </div>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email" icon={Mail} type="email" value={authForm.email} onChange={(event) => patchAuthForm('email', event.target.value)} required autoComplete="email" />
              <Field label="Password" icon={Lock} type="password" value={authForm.password} onChange={(event) => patchAuthForm('password', event.target.value)} required autoComplete="current-password" />
              <Button type="submit" icon={ShieldCheck} disabled={isBusy}>Sign in</Button>
            </form>
          )}

          {authMode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <Field label="Full name" icon={User} value={authForm.name} onChange={(event) => patchAuthForm('name', event.target.value)} required autoComplete="name" />
              <Field label="Email" icon={Mail} type="email" value={authForm.email} onChange={(event) => patchAuthForm('email', event.target.value)} required autoComplete="email" />
              <Field label="Phone" icon={Phone} type="tel" value={authForm.phoneNumber} onChange={(event) => patchAuthForm('phoneNumber', event.target.value)} placeholder="+234..." autoComplete="tel" />
              <Field label="Password" icon={Lock} type="password" value={authForm.password} onChange={(event) => patchAuthForm('password', event.target.value)} required minLength={8} autoComplete="new-password" />
              <Button type="submit" icon={Plus} disabled={isBusy}>Create account</Button>
            </form>
          )}

          {authMode === 'confirm' && (
            <form onSubmit={handleConfirm} className="space-y-4">
              <Field label="Email" icon={Mail} type="email" value={authForm.email} onChange={(event) => patchAuthForm('email', event.target.value)} required />
              <Field label="Confirmation code" icon={ClipboardCheck} value={authForm.code} onChange={(event) => patchAuthForm('code', event.target.value)} required inputMode="numeric" />
              <Button type="submit" icon={Check} disabled={isBusy}>Confirm account</Button>
              <Button variant="secondary" onClick={handleResendCode} disabled={isBusy}>Resend code</Button>
            </form>
          )}

          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={resetOnboarding}
              className="mx-auto mt-8 block text-xs font-bold text-slate-500 underline underline-offset-4"
            >
              Replay onboarding
            </button>
          )}
        </section>
      </Shell>
    );
  }

  if (view === 'role') {
    return (
      <Shell error={error} notice={notice} busyLabel={busyLabel}>
        <TopBar title="Choose role" subtitle={authIdentity?.email || pendingProfile?.email} onLogout={handleLogout} />
        <form onSubmit={handleRoleSubmit} className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => patchRoleForm('role', 'seller_receiver')}
              className={`rounded-lg border p-4 text-left ${roleForm.role === 'seller_receiver' ? 'border-slate-950 bg-white' : 'border-slate-200 bg-white text-slate-500'}`}
            >
              <Package className="h-5 w-5" />
              <p className="mt-3 text-sm font-black">Seller / receiver</p>
            </button>
            <button
              type="button"
              onClick={() => patchRoleForm('role', 'driver')}
              className={`rounded-lg border p-4 text-left ${roleForm.role === 'driver' ? 'border-slate-950 bg-white' : 'border-slate-200 bg-white text-slate-500'}`}
            >
              <Truck className="h-5 w-5" />
              <p className="mt-3 text-sm font-black">Driver</p>
            </button>
          </div>
          <Field label="Full name" icon={User} value={roleForm.name} onChange={(event) => patchRoleForm('name', event.target.value)} required />
          <Field label="Username" value={roleForm.username} onChange={(event) => patchRoleForm('username', event.target.value)} placeholder="tara" />
          <Field label="Phone" icon={Phone} type="tel" value={roleForm.phoneNumber} onChange={(event) => patchRoleForm('phoneNumber', event.target.value)} placeholder="+234..." />

          {roleForm.role === 'driver' && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
              <Field label="Current area" icon={MapPin} value={roleForm.currentArea} onChange={(event) => patchRoleForm('currentArea', event.target.value)} placeholder="Yaba" />
              <SelectField label="Vehicle type" value={roleForm.vehicleType} onChange={(event) => patchRoleForm('vehicleType', event.target.value)}>
                <option value="motorcycle">Motorcycle</option>
                <option value="car">Car</option>
                <option value="van">Van</option>
              </SelectField>
            </div>
          )}

          <Button type="submit" icon={Check} disabled={isBusy}>Continue</Button>
        </form>
      </Shell>
    );
  }

  if (view === 'seller') {
    const list = sellerTab === 'sent' ? sentDeliveries : incomingDeliveries;
    return (
      <Shell error={error} notice={notice} busyLabel={busyLabel}>
        <TopBar
          title={dashboardTitle}
          subtitle={profile?.name}
          onLogout={handleLogout}
          action={(
            <button
              type="button"
              onClick={() => runTask('Refreshing dashboard', refreshSellerData)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700"
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        />
        <section className="flex-1 overflow-y-auto px-5 py-5">
          <Button icon={Plus} onClick={() => setView('createDelivery')}>Create delivery</Button>
          <div className="mt-5 grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setSellerTab('sent')}
              className={`h-10 rounded-md text-sm font-black ${sellerTab === 'sent' ? 'bg-slate-950 text-white' : 'text-slate-500'}`}
            >
              Sent
            </button>
            <button
              type="button"
              onClick={() => setSellerTab('incoming')}
              className={`h-10 rounded-md text-sm font-black ${sellerTab === 'incoming' ? 'bg-slate-950 text-white' : 'text-slate-500'}`}
            >
              Incoming
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {list.length === 0 && (
              <EmptyState
                title={sellerTab === 'sent' ? 'No sent deliveries yet' : 'No receiver deliveries yet'}
                body={sellerTab === 'sent' ? 'Create a delivery to open it for drivers.' : 'Incoming deliveries appear when another seller sends to your account.'}
              />
            )}
            {list.map((item) => (
              <DeliveryCard
                key={item.deliveryId}
                delivery={item}
                actionLabel={sellerTab === 'incoming' && item.status === 'DELIVERED' ? 'Confirm delivery' : 'View delivery'}
                actionIcon={sellerTab === 'incoming' && item.status === 'DELIVERED' ? Check : ChevronRight}
                onClick={() => {
                  if (sellerTab === 'incoming' && item.status === 'DELIVERED') openReceiverConfirm(item);
                  else openDeliveryDetails(item);
                }}
              />
            ))}
          </div>
        </section>
      </Shell>
    );
  }

  if (view === 'createDelivery') {
    return (
      <Shell error={error} notice={notice} busyLabel={busyLabel}>
        <TopBar title="Create delivery" subtitle="POST /deliveries" onBack={() => setView('seller')} onLogout={handleLogout} />
        <form onSubmit={handleCreateDelivery} className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.08em] text-slate-500">Receiver</h2>
            <Field label="Receiver name" icon={User} value={deliveryForm.receiverName} onChange={(event) => patchDeliveryForm('receiverName', event.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Handle" value={deliveryForm.receiverTag} onChange={(event) => patchDeliveryForm('receiverTag', event.target.value)} placeholder="@ifeanyi" />
              <Field label="Phone" icon={Phone} type="tel" value={deliveryForm.receiverPhone} onChange={(event) => patchDeliveryForm('receiverPhone', event.target.value)} placeholder="+234..." />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.08em] text-slate-500">Route</h2>
            <Field label="Pickup address" icon={MapPin} value={deliveryForm.pickupAddress} onChange={(event) => patchDeliveryForm('pickupAddress', event.target.value)} required />
            <Field label="Pickup area" value={deliveryForm.pickupArea} onChange={(event) => patchDeliveryForm('pickupArea', event.target.value)} />
            <Field label="Dropoff address" icon={MapPin} value={deliveryForm.dropoffAddress} onChange={(event) => patchDeliveryForm('dropoffAddress', event.target.value)} required />
            <Field label="Dropoff area" value={deliveryForm.dropoffArea} onChange={(event) => patchDeliveryForm('dropoffArea', event.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pickup lat" inputMode="decimal" value={deliveryForm.pickupLat} onChange={(event) => patchDeliveryForm('pickupLat', event.target.value)} />
              <Field label="Pickup lng" inputMode="decimal" value={deliveryForm.pickupLng} onChange={(event) => patchDeliveryForm('pickupLng', event.target.value)} />
              <Field label="Dropoff lat" inputMode="decimal" value={deliveryForm.dropoffLat} onChange={(event) => patchDeliveryForm('dropoffLat', event.target.value)} />
              <Field label="Dropoff lng" inputMode="decimal" value={deliveryForm.dropoffLng} onChange={(event) => patchDeliveryForm('dropoffLng', event.target.value)} />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.08em] text-slate-500">Package</h2>
            <SelectField label="Package type" value={deliveryForm.packageType} onChange={(event) => patchDeliveryForm('packageType', event.target.value)}>
              <option value="Parcel">Parcel</option>
              <option value="Fashion item">Fashion item</option>
              <option value="Food">Food</option>
              <option value="Electronics">Electronics</option>
              <option value="Documents">Documents</option>
            </SelectField>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Value" inputMode="numeric" value={deliveryForm.packageValue} onChange={(event) => patchDeliveryForm('packageValue', event.target.value)} placeholder="35000" />
              <SelectField label="Urgency" value={deliveryForm.urgency} onChange={(event) => patchDeliveryForm('urgency', event.target.value)}>
                <option value="normal">Normal</option>
                <option value="same day">Same day</option>
                <option value="urgent">Urgent</option>
              </SelectField>
            </div>
            <TextArea label="Delivery note" value={deliveryForm.deliveryNote} onChange={(event) => patchDeliveryForm('deliveryNote', event.target.value)} />
          </section>

          <Button type="submit" icon={Package} disabled={isBusy}>Create delivery</Button>
        </form>
      </Shell>
    );
  }

  if (view === 'findDrivers') {
    const formatPrice = (n) => '₦' + n.toLocaleString('en-NG');
    return (
      <Shell>
        <section className="flex-1 overflow-y-auto px-5 py-6">
          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg mx-auto">
              <Sparkles size={24} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-3">
              {findDriverPhase === 'completed' ? 'Driver found!' : 'Finding nearby drivers'}
            </h2>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <MapPin size={12} className="text-orange-500" />
              <p className="text-xs text-slate-500">{delivery?.pickupArea || delivery?.pickupAddress || 'your area'}</p>
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ease-out ${findDriverPhase === 'completed' ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${findDriverProgress}%` }} />
          </div>

          {findDriverPhase === 'searching' && visibleDrivers.length < SIM_DRIVERS.length && (
            <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
              <Loader2 size={12} className="animate-spin text-orange-500" />
              <span>Checking available riders...</span>
            </div>
          )}

          <div className="space-y-3">
            {SIM_DRIVERS.map((driver) => {
              const isVisible = visibleDrivers.includes(driver.id);
              const isSelected = selectedDriver?.id === driver.id;
              return (
                <div key={driver.id} className={`rounded-2xl border p-4 transition-all duration-500 ${!isVisible ? 'opacity-0 translate-y-4 max-h-0 overflow-hidden p-0 border-transparent' : isSelected ? 'border-emerald-300 bg-emerald-50/60 shadow-md ring-1 ring-emerald-200' : 'border-slate-200 bg-white shadow-sm'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${driver.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>{driver.initials}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">{driver.name}</p>
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

          {findDriverPhase === 'completed' && selectedDriver && (
            <button onClick={() => { setDelivery(prev => prev ? { ...prev, assignedDriverId: selectedDriver.id, recommendedDriverName: selectedDriver.name, aiRecommendation: { ...(prev.aiRecommendation || {}), recommendedDriverName: selectedDriver.name }, estimatedDuration: selectedDriver.eta, totalDeliveryFee: selectedDriver.price, riskScore: 2 } : prev); refreshEvents(delivery?.deliveryId); setView('sellerDelivery'); }} className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md inline-flex items-center justify-center gap-2 active:scale-95 transition mt-5">
              <CheckCircle2 size={16} /> Continue to tracking
            </button>
          )}
        </section>
      </Shell>
    );
  }

  if (view === 'sellerDelivery') {
    return (
      <Shell error={error} notice={notice} busyLabel={busyLabel}>
        <TopBar
          title="Delivery tracking"
          subtitle={selectedDelivery?.deliveryId}
          onBack={() => setView('seller')}
          onLogout={handleLogout}
          action={(
            <button
              type="button"
              onClick={refreshCurrentDelivery}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700"
              aria-label="Refresh delivery"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        />
        <section className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {!selectedDelivery && <EmptyState title="No delivery selected" body="Open a sent or incoming delivery first." />}
          {selectedDelivery && (
            <>
              <StatusBadge status={selectedDelivery.status} />
              <h2 className="text-lg font-bold text-slate-900 mt-1">Delivery tracking</h2>
              <RouteSummaryCard delivery={selectedDelivery} />
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Delivery Progress</h3>
                <DeliveryTimeline delivery={selectedDelivery} events={events} />
              </div>
              <div className="grid grid-cols-1 gap-3 pt-2">
                <Button icon={ShieldCheck} onClick={handleAnalyzeDelivery} disabled={isBusy}>Analyze delivery</Button>
                {selectedDelivery.status === 'DELIVERED' && (
                  <Button icon={Check} variant="success" onClick={() => openReceiverConfirm(selectedDelivery)} disabled={isBusy}>Receiver confirm</Button>
                )}
              </div>
            </>
          )}
        </section>
      </Shell>
    );
  }

  if (view === 'driver') {
    return (
      <Shell error={error} notice={notice} busyLabel={busyLabel}>
        <TopBar
          title={dashboardTitle}
          subtitle={driver ? `${driver.currentArea || 'Lagos'} - ${driver.availabilityStatus}` : profile?.name}
          onLogout={handleLogout}
          action={(
            <button
              type="button"
              onClick={handleDriverRefresh}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700"
              aria-label="Refresh jobs"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        />
        <section className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Open jobs" value={openJobs.length} icon={Package} />
            <Metric label="Accepted" value={acceptedJobs.length} icon={Truck} />
          </div>
          <Button
            icon={driver?.availabilityStatus === 'available' ? Check : Clock3}
            variant={driver?.availabilityStatus === 'available' ? 'success' : 'secondary'}
            onClick={handleAvailabilityToggle}
            disabled={isBusy}
          >
            {driver?.availabilityStatus === 'available' ? 'Available' : 'Go available'}
          </Button>

          {activeJob && (
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-[0.08em] text-slate-500">Active job</h2>
              <DeliveryCard delivery={activeJob} actionLabel="Continue job" actionIcon={Route} onClick={() => setView('driverJob')} />
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-[0.08em] text-slate-500">Open jobs</h2>
            {openJobs.length === 0 && <EmptyState title="No open jobs" body="Create and analyze a seller delivery, then refresh here." icon={Package} />}
            {openJobs.map((job) => (
              <DeliveryCard key={job.deliveryId} delivery={job} actionLabel="Accept job" actionIcon={ChevronRight} onClick={handleAcceptJob} />
            ))}
          </div>
        </section>
      </Shell>
    );
  }

  if (view === 'driverJob') {
    const nextStatus = NEXT_DRIVER_STATUS[activeJob?.status];
    const driverActionLabel = nextStatus ? `Mark ${STATUS_LABELS[nextStatus]}` : null;
    return (
      <Shell error={error} notice={notice} busyLabel={busyLabel}>
        <TopBar
          title="Rider route"
          subtitle={activeJob?.deliveryId}
          onBack={() => setView('driver')}
          onLogout={handleLogout}
          action={(
            <button
              type="button"
              onClick={refreshCurrentDelivery}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700"
              aria-label="Refresh job"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        />
        <section className="flex-1 overflow-y-auto px-5 py-5 flex flex-col">
          {!activeJob && <EmptyState title="No active job" body="Accept an open job first." icon={Truck} />}
          {activeJob && (
            <>
              <StatusBadge status={activeJob.status} />
              <h2 className="text-lg font-bold text-slate-900 mt-2 mb-4">Rider route</h2>
              <RouteSummaryCard delivery={activeJob} />

              {!activeJob.routeId && !busyLabel && (
                <button onClick={handleOptimizeRoute} disabled={isBusy} className="mt-3 w-full py-3 rounded-2xl border border-orange-200 bg-orange-50 text-orange-700 text-xs font-bold active:scale-95 transition">
                  {busyLabel?.includes('Optimizing') ? 'Optimizing...' : 'Optimize route'}
                </button>
              )}

              <div className="mt-5">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Delivery Progress</h3>
                <DeliveryTimeline delivery={activeJob} events={events} />
              </div>

              <div className="mt-auto space-y-2 pt-4">
                {nextStatus && (
                  <button onClick={handleNextDriverStatus} disabled={isBusy} className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm shadow-md inline-flex items-center justify-center gap-2 active:scale-95 transition">
                    <Truck size={16} /> {driverActionLabel}
                  </button>
                )}
                {activeJob.status === 'DELIVERED' && (
                  <Button icon={Check} variant="success" onClick={() => openReceiverConfirm(activeJob)} disabled={isBusy}>Receiver confirm</Button>
                )}
              </div>
            </>
          )}
        </section>
      </Shell>
    );
  }

  if (view === 'confirmDelivery') {
    const canConfirm = selectedDelivery?.status === 'DELIVERED';
    return (
      <Shell error={error} notice={notice} busyLabel={busyLabel}>
        <TopBar
          title="Delivery confirmation"
          subtitle={selectedDelivery?.deliveryId}
          onBack={() => setView(profile?.role === 'driver' ? 'driverJob' : 'seller')}
          onLogout={profile ? handleLogout : undefined}
        />
        <section className="flex-1 overflow-y-auto px-5 py-5 flex flex-col">
          {!selectedDelivery && <EmptyState title="No delivery" body="Open a delivery first." />}
          {selectedDelivery && (
            <>
              <StatusBadge status={selectedDelivery.status} />
              <h2 className="text-lg font-bold text-slate-900 mt-2 mb-4">
                {canConfirm ? 'Confirm your delivery' : 'Your package is on the way'}
              </h2>
              <RouteSummaryCard delivery={selectedDelivery} />
              <div className="mt-5">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Delivery Progress</h3>
                <DeliveryTimeline delivery={selectedDelivery} events={events} />
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg mt-3">{error}</p>}

              <div className="mt-auto space-y-2 pt-4">
                <button onClick={handleConfirmDelivery} disabled={!canConfirm || isBusy} className="w-full py-3.5 rounded-2xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold text-sm shadow-md inline-flex items-center justify-center gap-2 active:scale-95 transition">
                  <CheckCircle2 size={16} /> Confirm Delivery
                </button>
                <button onClick={() => setView('seller')} className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 transition">
                  <AlertTriangle size={13} /> I did not receive this
                </button>
              </div>
            </>
          )}
        </section>
      </Shell>
    );
  }

  if (view === 'completed') {
    const summary = completedDelivery || selectedDelivery;
    return (
      <Shell error={error} notice={notice} busyLabel={busyLabel}>
        <TopBar
          title="Completed"
          subtitle={summary?.deliveryId}
          onBack={() => setView(profile?.role === 'driver' ? 'driver' : 'seller')}
          onLogout={profile ? handleLogout : undefined}
        />
        <section className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-emerald-600 text-white">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-2xl font-black text-slate-950">Delivery completed</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">Receiver confirmation moved this delivery to COMPLETED.</p>
          </div>

          {summary && (
            <>
              <DeliveryCard
                delivery={summary}
                actionLabel="View details"
                onClick={() => openDeliveryDetails(summary, profile?.role === 'driver' ? 'driverJob' : 'sellerDelivery')}
              />
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Fee" value={formatMoney(summary.totalDeliveryFee)} icon={Package} />
                <Metric label="Route" value={summary.estimatedDistance ? `${summary.estimatedDistance} km` : 'Attached'} icon={Route} />
              </div>
            </>
          )}

          <Button icon={profile?.role === 'driver' ? Truck : Package} onClick={() => setView(profile?.role === 'driver' ? 'driver' : 'seller')}>
            Back to dashboard
          </Button>
        </section>
      </Shell>
    );
  }

  return null;
}

export default App;
