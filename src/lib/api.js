const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── In-memory response cache (cleared on page refresh) ───
const _cache = new Map();

function _cacheGet(key, ttlMs) {
  const hit = _cache.get(key);
  return hit && Date.now() - hit.ts < ttlMs ? hit.data : null;
}

function _cacheSet(key, data) {
  _cache.set(key, { data, ts: Date.now() });
}

export function invalidateCache(prefix) {
  for (const k of _cache.keys()) {
    if (k.includes(prefix)) _cache.delete(k);
  }
}

function buildUrl(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  return url.toString();
}

async function fetchRaw(urlStr) {
  const token = localStorage.getItem('token');
  const res = await fetch(urlStr, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API request failed');
  }
  return res.json();
}

async function fetchAPI(path, params = {}) {
  return fetchRaw(buildUrl(path, params));
}

async function cachedFetchAPI(path, params = {}, ttlMs = 2 * 60 * 1000) {
  const url = buildUrl(path, params);
  const hit = _cacheGet(url, ttlMs);
  if (hit !== null) return hit;
  const data = await fetchRaw(url);
  _cacheSet(url, data);
  return data;
}

async function postAPI(path, body = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.error || 'API request failed');
  }
  return res.json();
}

// ─── Dashboard ───
export const dashboardAPI = {
  getTableCounts: () => fetchAPI('/api/dashboard/table-counts'),
  getTableCount: (table) => fetchAPI(`/api/dashboard/table-count/${table}`),
  getTableData: (table, opts = {}) =>
    fetchAPI(`/api/dashboard/table-data/${table}`, opts),
  getTableColumns: (table) => fetchAPI(`/api/dashboard/table-columns/${table}`),
  getExpiryAlerts: (table) => fetchAPI(`/api/dashboard/expiry-alerts/${table}`),
  getInventoryCharts: () => fetchAPI('/api/dashboard/inventory-charts'),
};

// ─── Platform ───
const STATS_TTL = 5 * 60 * 1000;

export const platformAPI = {
  getStats: (slug) =>
    cachedFetchAPI(`/api/platform/${slug}/stats`, {}, STATS_TTL),
  // Synchronous cache peek — returns null if no cache or expired
  peekStats: (slug) =>
    _cacheGet(buildUrl(`/api/platform/${slug}/stats`), STATS_TTL),
  getPOs: (slug, opts = {}) =>
    cachedFetchAPI(`/api/platform/${slug}/pos`, opts, 2 * 60 * 1000),
  getInventoryMatch: (slug, sku) =>
    cachedFetchAPI(`/api/platform/${slug}/inventory-match`, { sku }, 5 * 60 * 1000),
};

// ─── Auth ───
export const authAPI = {
  me: () => fetchAPI('/api/auth/me'),
  getPermissions: () => fetchAPI('/api/auth/permissions'),
  changePassword: (current_password, new_password) =>
    postAPI('/api/auth/change-password', { current_password, new_password }),
};

// ─── Notifications ───
export const notificationsAPI = {
  getAll: () => cachedFetchAPI('/api/notifications', {}, 60 * 1000),
  markAllRead: () => postAPI('/api/notifications/mark-all-read'),
};

// ─── Monthly Landing Rate ───
export const landingRateAPI = {
  list: (slug, opts = {}) =>
    cachedFetchAPI(`/api/platform/${slug}/landing-rate`, opts, 2 * 60 * 1000),
  listSkus: (slug) =>
    cachedFetchAPI(`/api/platform/${slug}/landing-rate/skus`, {}, 10 * 60 * 1000),
  add: async (slug, body) => {
    const result = await postAPI(`/api/platform/${slug}/landing-rate/add`, body);
    invalidateCache(`/api/platform/${slug}/landing-rate`);
    return result;
  },
};

// ─── SAP ───
export const sapAPI = {
  getDistributors: (opts = {}) => fetchAPI('/api/sap/distributors', opts),
  getDistributor: (cardCode) => fetchAPI(`/api/sap/distributors/${cardCode}`),
  getDistributorOrders: (cardCode, opts = {}) =>
    cachedFetchAPI(`/api/sap/distributor-orders/${cardCode}`, opts, 5 * 60 * 1000),
  getDistributorInvoices: (cardCode, opts = {}) =>
    cachedFetchAPI(`/api/sap/distributor-invoices/${cardCode}`, opts, 5 * 60 * 1000),
  getItems: (opts = {}) => fetchAPI('/api/sap/items', opts),
  getStockByWarehouse: (itemCode) =>
    fetchAPI('/api/sap/stock-by-warehouse', { item_code: itemCode }),
  getSalesInvoices: (opts = {}) => fetchAPI('/api/sap/sales-invoices', opts),
  getCustomerSalesInvoices: (cardCode, opts = {}) =>
    cachedFetchAPI(`/api/sap/sales-invoices/${cardCode}`, opts, 5 * 60 * 1000),
  getSalesInvoiceLines: (docEntry) =>
    fetchAPI(`/api/sap/sales-invoice-lines/${docEntry}`),
  getPlatformSalesInvoices: (slug, opts = {}) =>
    fetchAPI(`/api/sap/platform-sales-invoices/${slug}`, opts),
  getPlatformDistributors: (slug, opts = {}) =>
    cachedFetchAPI(`/api/sap/platform-distributors/${slug}`, opts, 2 * 60 * 1000),
  getPlatformDistributorDetail: (slug, cardCode) =>
    cachedFetchAPI(
      `/api/sap/platform-distributors/${slug}/${cardCode}`,
      {},
      5 * 60 * 1000,
    ),
};
