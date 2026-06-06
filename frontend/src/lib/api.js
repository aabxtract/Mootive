import { env, authToken } from './auth';

async function request(method, path, body, { auth = true } = {}) {
  if (!env.apiUrl) throw new Error('API base URL not set. Add VITE_API_BASE_URL to frontend/.env.');
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await authToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${env.apiUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const get   = (path, opts)        => request('GET', path, undefined, opts);
const post  = (path, body, opts)  => request('POST', path, body, opts);
const patch = (path, body, opts)  => request('PATCH', path, body, opts);

// Users
export const createUserProfile      = (p)       => post('/users/profile', p);
export const getMe                  = ()        => get('/users/me');
export const updateProfile          = (p)       => patch('/users/me', p);
export const checkUser              = (tag)     => get(`/users/check?tag=${encodeURIComponent(tag)}`);

// Drivers
export const createDriverProfile    = (p)       => post('/drivers/profile', p);
export const createRiderProfile     = createDriverProfile;
export const getDriverMe            = ()        => get('/drivers/me');
export const updateAvailability     = (p)       => patch('/drivers/availability', p);
export const updateRiderAvailability = updateAvailability;
export const getOpenJobs            = ()        => get('/drivers/jobs/open');
export const getAcceptedJobs        = ()        => get('/drivers/jobs/accepted');
export const acceptJob              = (id)      => post(`/drivers/jobs/${encodeURIComponent(id)}/accept`, {});

// Deliveries
export const createDelivery         = (p)       => post('/deliveries', p);
export const getDelivery            = (id)      => get(`/deliveries/${encodeURIComponent(id)}`);
export const getSentDeliveries      = ()        => get('/deliveries/sent');
export const getIncomingDeliveries  = ()        => get('/deliveries/incoming');
export const analyzeDelivery        = (id)      => post(`/deliveries/${encodeURIComponent(id)}/analyze`, {});
export const optimizeRoute          = (id)      => post(`/deliveries/${encodeURIComponent(id)}/optimize-route`, {});
export const updateDeliveryStatus   = (id, s)   => post(`/deliveries/${encodeURIComponent(id)}/status`, { status: s });
export const getDeliveryEvents      = (id)      => get(`/deliveries/${encodeURIComponent(id)}/events`);
export const reportIssue            = (id, r)   => post(`/deliveries/${encodeURIComponent(id)}/report-issue`, { reason: r });

// Confirm — supports both auth'd receiver and unregistered token holder
export const confirmDelivery = (id, confirmationToken) =>
  confirmationToken
    ? post(`/deliveries/${encodeURIComponent(id)}/confirm`, { confirmationToken }, { auth: false })
    : post(`/deliveries/${encodeURIComponent(id)}/confirm`, {});

export const health = () => get('/health', { auth: false });
