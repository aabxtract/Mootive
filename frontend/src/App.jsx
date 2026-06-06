import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Route,
  ShieldCheck,
  Truck,
  User,
} from 'lucide-react';
import * as api from './lib/api';
import * as auth from './lib/auth';

const PENDING_PROFILE_KEY = 'mootive.pendingProfile';

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
  if (status === 'COMPLETED' || status === 'CONFIRMED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'DELIVERED' || status === 'IN_TRANSIT' || status === 'PICKED_UP') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (status === 'ISSUE_REPORTED') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (status === 'OPEN_FOR_DRIVERS' || status === 'DRIVER_ACCEPTED' || status === 'ROUTE_OPTIMIZED') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function Shell({ children, error, notice, busyLabel }) {
  return (
    <div className="min-h-screen bg-[#e8edf3] text-slate-950">
      <main className="mx-auto flex h-screen w-full max-w-[430px] flex-col bg-[#f8fafc] shadow-xl sm:my-4 sm:h-[calc(100vh-2rem)] sm:rounded-lg sm:border sm:border-white/80">
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
    primary: 'bg-slate-950 text-white border-slate-950',
    secondary: 'bg-white text-slate-900 border-slate-200',
    success: 'bg-emerald-600 text-white border-emerald-600',
    warning: 'bg-amber-500 text-slate-950 border-amber-500',
    ghost: 'bg-transparent text-slate-700 border-transparent',
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
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isBusy = Boolean(busyLabel);
  const selectedDelivery = delivery || activeJob;

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

  useEffect(() => {
    let alive = true;

    async function boot() {
      setBusyLabel('Checking session');
      setError('');
      try {
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
    await runTask('Creating delivery', async () => {
      if (!deliveryForm.receiverTag.trim() && !deliveryForm.receiverPhone.trim()) {
        throw new Error('Add a receiver handle or phone number.');
      }
      const result = await api.createDelivery({
        receiverName: deliveryForm.receiverName.trim(),
        receiverTag: deliveryForm.receiverTag.trim(),
        receiverPhone: normalizePhone(deliveryForm.receiverPhone),
        pickupAddress: deliveryForm.pickupAddress.trim(),
        pickupArea: deliveryForm.pickupArea.trim(),
        pickupLat: parseCoord(deliveryForm.pickupLat, DEFAULT_COORDS.pickupLat),
        pickupLng: parseCoord(deliveryForm.pickupLng, DEFAULT_COORDS.pickupLng),
        dropoffAddress: deliveryForm.dropoffAddress.trim(),
        dropoffArea: deliveryForm.dropoffArea.trim(),
        dropoffLat: parseCoord(deliveryForm.dropoffLat, DEFAULT_COORDS.dropoffLat),
        dropoffLng: parseCoord(deliveryForm.dropoffLng, DEFAULT_COORDS.dropoffLng),
        packageType: deliveryForm.packageType,
        packageValue: Number(deliveryForm.packageValue) || 0,
        urgency: deliveryForm.urgency,
        deliveryNote: deliveryForm.deliveryNote.trim(),
      });
      setDelivery(result.delivery);
      setDeliveryForm(DELIVERY_FORM_DEFAULTS);
      setConfirmForm({
        deliveryId: result.delivery.deliveryId,
        confirmationToken: result.receiver?.confirmationToken || result.delivery.confirmationToken || '',
      });
      await refreshSellerData();
      await refreshEvents(result.delivery.deliveryId);
      setView('sellerDelivery');
      setNotice('Delivery created and ready to analyze.');
    });
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

  if (view === 'sellerDelivery') {
    return (
      <Shell error={error} notice={notice} busyLabel={busyLabel}>
        <TopBar
          title="Delivery details"
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
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">Current status</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">{STATUS_LABELS[selectedDelivery.status] || selectedDelivery.status}</h2>
                  </div>
                  <StatusBadge status={selectedDelivery.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <InfoRow label="Pickup" value={selectedDelivery.pickupAddress} />
                  <InfoRow label="Dropoff" value={selectedDelivery.dropoffAddress} />
                  <InfoRow label="Fee" value={formatMoney(selectedDelivery.totalDeliveryFee)} />
                  <InfoRow label="Receiver" value={selectedDelivery.receiverName || selectedDelivery.receiverPhone || selectedDelivery.receiverTag} />
                </div>
              </div>

              <MapPreview delivery={selectedDelivery} />

              <div className="grid grid-cols-1 gap-3">
                <Button icon={ShieldCheck} onClick={handleAnalyzeDelivery} disabled={isBusy}>Analyze delivery</Button>
                {selectedDelivery.status === 'DELIVERED' && (
                  <Button icon={Check} variant="success" onClick={() => openReceiverConfirm(selectedDelivery)} disabled={isBusy}>Receiver confirm</Button>
                )}
              </div>

              {selectedDelivery.aiRecommendation && (
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-black text-slate-950">AI analysis</h3>
                  <div className="mt-3 space-y-3 text-sm font-semibold text-slate-600">
                    <p>{selectedDelivery.aiRecommendation.explanations?.driverRecommendation || 'Driver scoring attached.'}</p>
                    <p>{selectedDelivery.aiRecommendation.explanations?.fairPrice || 'Fair price calculated.'}</p>
                    <p>{selectedDelivery.aiRecommendation.explanations?.risk || 'Risk assessed.'}</p>
                  </div>
                </div>
              )}

              {(selectedDelivery.confirmationToken || confirmForm.confirmationToken) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-amber-700">Receiver token</p>
                  <p className="mt-2 break-all text-sm font-black text-slate-950">{selectedDelivery.confirmationToken || confirmForm.confirmationToken}</p>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-[0.08em] text-slate-500">Events</h3>
                {events.length === 0 && <EmptyState title="No events loaded" body="Refresh the delivery to load event history." icon={Clock3} />}
                {events.map((item) => (
                  <div key={`${item.eventType}-${item.createdAt}`} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-sm font-black text-slate-950">{STATUS_LABELS[item.eventType] || item.eventType}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{item.message}</p>
                  </div>
                ))}
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
    return (
      <Shell error={error} notice={notice} busyLabel={busyLabel}>
        <TopBar
          title="Driver job"
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
        <section className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {!activeJob && <EmptyState title="No active job" body="Accept an open job first." icon={Truck} />}
          {activeJob && (
            <>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">Job status</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">{STATUS_LABELS[activeJob.status] || activeJob.status}</h2>
                  </div>
                  <StatusBadge status={activeJob.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <InfoRow label="Pickup" value={activeJob.pickupAddress} />
                  <InfoRow label="Dropoff" value={activeJob.dropoffAddress} />
                  <InfoRow label="Distance" value={activeJob.estimatedDistance ? `${activeJob.estimatedDistance} km` : 'Optimize first'} />
                  <InfoRow label="ETA" value={activeJob.estimatedDuration ? `${activeJob.estimatedDuration} min` : 'Optimize first'} />
                </div>
              </div>

              <MapPreview delivery={activeJob} />

              {(route || activeJob.routeSummary) && (
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-black text-slate-950">Optimized route</h3>
                  <p className="mt-2 text-sm font-semibold text-slate-600">{route?.routeSummary || activeJob.routeSummary}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <Button icon={Route} onClick={handleOptimizeRoute} disabled={isBusy || activeJob.status === 'COMPLETED'}>Optimize route</Button>
                {nextStatus && (
                  <Button icon={Truck} variant="warning" onClick={handleNextDriverStatus} disabled={isBusy}>
                    Mark {STATUS_LABELS[nextStatus]}
                  </Button>
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
    return (
      <Shell error={error} notice={notice} busyLabel={busyLabel}>
        <TopBar
          title="Receiver confirm"
          subtitle="POST /confirm"
          onBack={() => setView(profile?.role === 'driver' ? 'driverJob' : 'seller')}
          onLogout={profile ? handleLogout : undefined}
        />
        <form onSubmit={handleConfirmDelivery} className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-black text-slate-950">Confirm after delivery is marked delivered.</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">Use the SMS token for unregistered receivers, or leave token blank when signed in as the registered receiver.</p>
          </div>
          <Field
            label="Delivery ID"
            icon={Package}
            value={confirmForm.deliveryId}
            onChange={(event) => setConfirmForm((current) => ({ ...current, deliveryId: event.target.value }))}
            required
          />
          <Field
            label="Confirmation token"
            icon={ClipboardCheck}
            value={confirmForm.confirmationToken}
            onChange={(event) => setConfirmForm((current) => ({ ...current, confirmationToken: event.target.value }))}
            placeholder="CONFIRM-..."
          />
          <Button type="submit" icon={Check} variant="success" disabled={isBusy}>Confirm delivery</Button>
        </form>
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
