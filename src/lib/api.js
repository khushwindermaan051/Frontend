const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchAPI(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      url.searchParams.set(key, val);
    }
  });
  const token = localStorage.getItem('token');
  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API request failed');
  }
  return res.json();
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
    const e = new Error(err.detail || err.error || 'API request failed');
    e.status = res.status;
    e.payload = err;
    throw e;
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
export const platformAPI = {
  getStats: (slug) => fetchAPI(`/api/platform/${slug}/stats`),
  getPOs: (slug, opts = {}) => fetchAPI(`/api/platform/${slug}/pos`, opts),
  getInventoryMatch: (slug, sku) =>
    fetchAPI(`/api/platform/${slug}/inventory-match`, { sku }),
};

// ─── Monthly Targets ───
// Replicates the "ALL PLATFORM SECONDARY SALES" sheet.
// - `list` returns rows for a platform (optionally filtered by month/year).
// - `create` is INSERT-only; throws on 409 if a target for that month exists.
// - `refresh` recomputes derived columns on a current-month row only.
// - `dashboard` rolls up every in-scope platform for a given month/year.
export const monthlyTargetsAPI = {
  list: (slug, opts = {}) =>
    fetchAPI(`/api/platform/${slug}/month-targets`, opts),
  create: (slug, body) =>
    postAPI(`/api/platform/${slug}/month-targets/add`, body),
  refresh: (slug, id) =>
    postAPI(`/api/platform/${slug}/month-targets/${id}/refresh`, {}),
  // Correct a wrong target. Body: { targets: <new_number>, reason?: <string> }.
  // Server snapshots the old row into month_target_logs before UPDATE.
  update: (slug, id, body) =>
    postAPI(`/api/platform/${slug}/month-targets/${id}/update`, body),
  dashboard: (opts = {}) =>
    fetchAPI('/api/platform/month-targets/dashboard', opts),
};

// ─── Monthly Landing Rate ───
// Platforms supported: blinkit, zepto, swiggy, bigbasket.
// `mode=effective` returns the rate in force for the given month
// (falls back to the most recent prior row for each sku); `mode=history`
// returns every inserted row. Adds are INSERT-only — previous rows remain
// as an audit trail.
export const landingRateAPI = {
  list: (slug, opts = {}) =>
    fetchAPI(`/api/platform/${slug}/landing-rate`, opts),
  listSkus: (slug) => fetchAPI(`/api/platform/${slug}/landing-rate/skus`),
  add: (slug, body) => postAPI(`/api/platform/${slug}/landing-rate/add`, body),
};

// ─── SAP ───
export const sapAPI = {
  getDistributors: (opts = {}) => fetchAPI('/api/sap/distributors', opts),
  getDistributor: (cardCode) => fetchAPI(`/api/sap/distributors/${cardCode}`),
  getDistributorOrders: (cardCode, opts = {}) =>
    fetchAPI(`/api/sap/distributor-orders/${cardCode}`, opts),
  getDistributorInvoices: (cardCode, opts = {}) =>
    fetchAPI(`/api/sap/distributor-invoices/${cardCode}`, opts),
  getItems: (opts = {}) => fetchAPI('/api/sap/items', opts),
  getStockByWarehouse: (itemCode) =>
    fetchAPI('/api/sap/stock-by-warehouse', { item_code: itemCode }),
  getSalesInvoices: (opts = {}) => fetchAPI('/api/sap/sales-invoices', opts),
  getCustomerSalesInvoices: (cardCode, opts = {}) =>
    fetchAPI(`/api/sap/sales-invoices/${cardCode}`, opts),
  getSalesInvoiceLines: (docEntry) =>
    fetchAPI(`/api/sap/sales-invoice-lines/${docEntry}`),
  getPlatformSalesInvoices: (slug, opts = {}) =>
    fetchAPI(`/api/sap/platform-sales-invoices/${slug}`, opts),
  getPlatformDistributors: (slug, opts = {}) =>
    fetchAPI(`/api/sap/platform-distributors/${slug}`, opts),
  getPlatformDistributorDetail: (slug, cardCode) =>
    fetchAPI(`/api/sap/platform-distributors/${slug}/${cardCode}`),
};
