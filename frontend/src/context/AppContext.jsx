import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as api from '../lib/api';
import * as auth from '../lib/auth';

const AppContext = createContext(null);

const VIEWS = {
  landing: 'landing',
  signup: 'signup',
  confirm: 'confirm',
  login: 'login',
  roleSetup: 'roleSetup',
  driverProfileSetup: 'driverProfileSetup',
  sellerHome: 'sellerHome',
  driverHome: 'driverHome',
  createDelivery: 'createDelivery',
  findingDrivers: 'findingDrivers',
  senderTracking: 'senderTracking',
  incoming: 'incoming',
  receiverConfirm: 'receiverConfirm',
  completed: 'completed',
  reportIssue: 'reportIssue',
  availableJobs: 'availableJobs',
  jobDetail: 'jobDetail',
  driverRoute: 'driverRoute',
  completedJobs: 'completedJobs',
};

export function AppProvider({ children }) {
  const [view, setView] = useState(VIEWS.landing);
  const [stack, setStack] = useState([]);

  const navigate = (v) => { setStack(s => [...s, view]); setView(v); };
  const back = () => setStack(s => { const n = [...s]; const prev = n.pop() ?? VIEWS.landing; setView(prev); return n; });
  const reset = (v = VIEWS.landing) => { setView(v); setStack([]); };

  // Auth
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await api.getMe();
      setProfile(res.user);
      return res.user;
    } catch (e) {
      if (e.status === 404 || e.status === 401) { setProfile(null); return null; }
      throw e;
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        auth.configureAmplify();
        const u = await auth.currentAuthUser();
        if (u) {
          setAuthUser(u);
          const p = await refreshProfile();
          if (p?.role === 'driver') setView(VIEWS.driverHome);
          else if (p?.role === 'seller_receiver') setView(VIEWS.sellerHome);
          else setView(VIEWS.roleSetup);
        }
      } catch (e) {
        console.warn('boot:', e.message);
      } finally {
        setBootLoading(false);
      }
    })();
  }, [refreshProfile]);

  const afterLogin = async () => {
    const u = await auth.currentAuthUser();
    setAuthUser(u);
    const p = await refreshProfile();
    if (p?.role === 'driver') reset(VIEWS.driverHome);
    else if (p?.role === 'seller_receiver') reset(VIEWS.sellerHome);
    else reset(VIEWS.roleSetup);
  };

  const doLogout = async () => {
    await auth.logout();
    setAuthUser(null);
    setProfile(null);
    setDelivery(null);
    setDeliveryForm(emptyForm());
    reset(VIEWS.landing);
  };

  // Delivery form (seller)
  const emptyForm = () => ({
    pickupAddress: '', pickupArea: '', pickupNote: '',
    pickupLat: null, pickupLng: null,
    dropoffAddress: '', dropoffArea: '',
    dropoffLat: null, dropoffLng: null,
    receiverTag: '', receiverName: '', receiverPhone: '',
    packageType: 'Fashion item', packageValue: '', urgency: 'normal',
    deliveryNote: '',
  });
  const [deliveryForm, setDeliveryForm] = useState(emptyForm());
  const updateForm = (patch) => setDeliveryForm(f => ({ ...f, ...patch }));

  const [receiverLookup, setReceiverLookup] = useState({ state: 'idle', data: null });
  const checkReceiverTag = async (tag) => {
    if (!tag || tag.length < 2) { setReceiverLookup({ state: 'idle', data: null }); return; }
    setReceiverLookup({ state: 'checking', data: null });
    try {
      const res = await api.checkUser(tag);
      setReceiverLookup({ state: res.receiverFound ? 'found' : 'not_found', data: res });
      if (res.receiverFound) updateForm({ receiverName: res.name, receiverPhone: res.phoneNumber });
    } catch (e) {
      setReceiverLookup({ state: 'error', data: { message: e.message } });
    }
  };

  // Active delivery (sender side)
  const [delivery, setDelivery] = useState(null);
  const [deliveryEvents, setDeliveryEvents] = useState([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  const submitDelivery = async () => {
    setDeliveryLoading(true);
    try {
      const payload = {
        pickupAddress: deliveryForm.pickupAddress,
        pickupArea: deliveryForm.pickupArea,
        pickupLat: deliveryForm.pickupLat,
        pickupLng: deliveryForm.pickupLng,
        dropoffAddress: deliveryForm.dropoffAddress,
        dropoffArea: deliveryForm.dropoffArea,
        dropoffLat: deliveryForm.dropoffLat,
        dropoffLng: deliveryForm.dropoffLng,
        receiverTag: deliveryForm.receiverTag,
        receiverName: deliveryForm.receiverName,
        receiverPhone: deliveryForm.receiverPhone,
        packageType: deliveryForm.packageType,
        packageValue: Number(deliveryForm.packageValue) || 0,
        urgency: deliveryForm.urgency,
        deliveryNote: deliveryForm.deliveryNote || deliveryForm.pickupNote,
      };
      const res = await api.createDelivery(payload);
      setDelivery(res.delivery);
      return res;
    } finally {
      setDeliveryLoading(false);
    }
  };

  const refreshDelivery = async (id = delivery?.deliveryId) => {
    if (!id) return null;
    const res = await api.getDelivery(id);
    setDelivery(res.delivery);
    const ev = await api.getDeliveryEvents(id).catch(() => ({ events: [] }));
    setDeliveryEvents(ev.events || []);
    return res.delivery;
  };

  // Incoming (receiver side)
  const [incoming, setIncoming] = useState([]);
  const loadIncoming = async () => {
    const res = await api.getIncomingDeliveries();
    setIncoming(res.deliveries || []);
  };

  // Driver state
  const [driverProfile, setDriverProfile] = useState(null);
  const [openJobs, setOpenJobs] = useState([]);
  const [acceptedJobs, setAcceptedJobs] = useState([]);

  const refreshDriverProfile = async () => {
    try {
      const res = await api.getDriverMe();
      setDriverProfile(res.driver);
      return res.driver;
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  };

  const loadOpenJobs = async () => {
    const res = await api.getOpenJobs();
    setOpenJobs(res.deliveries || []);
  };

  const loadAcceptedJobs = async () => {
    const res = await api.getAcceptedJobs();
    setAcceptedJobs(res.deliveries || []);
  };

  const toggleAvailability = async ({ available, lat, lng }) => {
    const res = await api.updateAvailability({ available, lat, lng });
    setDriverProfile(res.driver);
    return res.driver;
  };

  const claimJob = async (deliveryId) => {
    const res = await api.acceptJob(deliveryId);
    setDelivery(res.delivery);
    return res;
  };

  const callOptimizeRoute = async (deliveryId) => {
    const res = await api.optimizeRoute(deliveryId);
    setDelivery(res.delivery);
    return res;
  };

  const advanceStatus = async (deliveryId, status) => {
    const res = await api.updateDeliveryStatus(deliveryId, status);
    setDelivery(res.delivery);
    return res.delivery;
  };

  const value = {
    VIEWS, view, navigate, back, reset,
    bootLoading, authUser, profile, setProfile, refreshProfile, afterLogin, doLogout,
    deliveryForm, updateForm, emptyForm, setDeliveryForm,
    receiverLookup, checkReceiverTag,
    delivery, setDelivery, deliveryEvents, deliveryLoading,
    submitDelivery, refreshDelivery,
    incoming, loadIncoming,
    driverProfile, setDriverProfile, refreshDriverProfile,
    openJobs, loadOpenJobs, acceptedJobs, loadAcceptedJobs,
    toggleAvailability, claimJob, callOptimizeRoute, advanceStatus,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
