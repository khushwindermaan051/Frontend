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
