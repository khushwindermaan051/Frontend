import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getAllPlatforms } from '../config/platforms';
import { dashboardAPI } from '../lib/api';
import {
  LayoutDashboard, Users, Upload, FileUp, Settings, Bell,
  Sun, Moon, Monitor, User, Shield, ChevronRight, ChevronDown,
  LogOut, ArrowRight, BarChart3,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Session cache helpers (5-min TTL) ───
const CACHE_TTL = 5 * 60 * 1000;
const COUNTS_KEY = 'dash_counts';
const ALERTS_KEY = 'dash_alerts';
const CHARTS_KEY = 'dash_charts';

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, time } = JSON.parse(raw);
    return Date.now() - time < CACHE_TTL ? data : null;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, time: Date.now() }));
  } catch {}
}

const SECTIONS = {
  primary: {
    label: 'Primary Sells',
    color: '#667eea',
    tables: ['master_po', 'test_master_po'],
  },
  secondary: {
    label: 'Secondary Sells',
    color: '#764ba2',
    tables: [
      'amazon_sec_daily',
      'amazon_sec_range',
      'bigbasketSec',
      'blinkitSec',
      'fk_grocery',
      'flipkartSec',
      'jiomartSec',
      'swiggySec',
      'zeptoSec',
    ],
  },
  inventory: {
    label: 'Inventory',
    color: '#00b894',
    tables: [
      'amazon_inventory',
      'bigbasket_inventory',
      'blinkit_inventory',
      'jiomart_inventory',
      'swiggy_inventory',
      'zepto_inventory',
    ],
  },
};

const ALL_TABLES = Object.values(SECTIONS).flatMap((s) => s.tables);
const PAGE_SIZE = 100;

function formatLabel(name) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isDateValue(val) {
  if (!val || typeof val !== 'string') return false;
  return /^\d{4}-\d{2}/.test(val);
}

async function fetchCount(tableName) {
  try {
    const res = await dashboardAPI.getTableCount(tableName);
    return res.count || 0;
  } catch {
    return 0;
  }
}

const ALERT_DAYS = 7;

async function fetchExpiryAlerts(tableName) {
  try {
    const res = await dashboardAPI.getExpiryAlerts(tableName);
    return res.alerts || [];
  } catch {
    return [];
  }
}

function daysUntil(dateStr) {
  const diff = Math.ceil(
    (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24),
  );
  return diff;
}

// ─── Alerts Panel ───
function AlertsPanel({ alerts, loading, onTableClick }) {
  if (loading) {
    return (
      <div className="alerts-panel">
        <div className="alerts-header">
          <h3>Expiry &amp; Delivery Alerts</h3>
        </div>
        <div className="alerts-loading">
          <div className="loader" /> Scanning tables...
        </div>
      </div>
    );
  }

  const totalExpired = alerts
    .filter((a) => a.type === 'expired')
    .reduce((s, a) => s + a.count, 0);
  const totalExpiring = alerts
    .filter((a) => a.type === 'expiring')
    .reduce((s, a) => s + a.count, 0);

  // Group alerts by table — one block per table
  const grouped = {};
  alerts.forEach((a) => {
    if (!grouped[a.table])
      grouped[a.table] = {
        table: a.table,
        expired: 0,
        expiring: 0,
        columns: [],
      };
    if (a.type === 'expired') grouped[a.table].expired += a.count;
    else grouped[a.table].expiring += a.count;
    if (!grouped[a.table].columns.includes(a.column))
      grouped[a.table].columns.push(a.column);
  });
  const tableAlerts = Object.values(grouped);

  return (
    <div className="alerts-panel">
      <div className="alerts-header">
        <h3>Expiry &amp; Delivery Alerts</h3>
        {alerts.length === 0 ? (
          <span className="alerts-badge ok">All Clear</span>
        ) : (
          <span className="alerts-badge danger">
            {tableAlerts.length} table{tableAlerts.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <p className="alerts-empty">
          No upcoming expiry or delivery dates in the next {ALERT_DAYS} days.
        </p>
      ) : (
        <>
          {/* Summary blocks */}
          <div className="alert-summary-row">
            <div className="alert-summary-block expired">
              <span className="asb-count">{totalExpired.toLocaleString()}</span>
              <span className="asb-label">Expired</span>
            </div>
            <div className="alert-summary-block warning">
              <span className="asb-count">
                {totalExpiring.toLocaleString()}
              </span>
              <span className="asb-label">Expiring Soon</span>
            </div>
            <div className="alert-summary-block info">
              <span className="asb-count">{ALERT_DAYS}</span>
              <span className="asb-label">Day Window</span>
            </div>
          </div>

          {/* One block per table */}
          <div className="alert-blocks-grid">
            {tableAlerts.map((ta) => {
              const hasExpired = ta.expired > 0;
              const hasExpiring = ta.expiring > 0;
              const total = ta.expired + ta.expiring;
              return (
                <button
                  key={ta.table}
                  className={`alert-block ${hasExpired ? 'expired' : 'warning'}`}
                  onClick={() =>
                    onTableClick(getSectionKey(ta.table), ta.table)
                  }
                >
                  <div className="ab-top">
                    {hasExpired && (
                      <span className="ab-type expired">
                        EXPIRED {ta.expired.toLocaleString()}
                      </span>
                    )}
                    {hasExpiring && (
                      <span className="ab-type warning">
                        EXPIRING {ta.expiring.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <span className="ab-count">{total.toLocaleString()}</span>
                  <span className="ab-table">{formatLabel(ta.table)}</span>
                  <span className="ab-col">
                    {ta.columns.map(formatLabel).join(', ')}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function getSectionKey(tableName) {
  for (const [key, section] of Object.entries(SECTIONS)) {
    if (section.tables.includes(tableName)) return key;
  }
  return 'primary';
}

// ─── Inventory Charts ───
function InventoryCharts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = readCache(CHARTS_KEY);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }
    dashboardAPI
      .getInventoryCharts()
      .then((d) => {
        setData(d);
        writeCache(CHARTS_KEY, d);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="charts-panel">
        <div className="charts-panel-header">
          <h3>Inventory Overview</h3>
        </div>
        <div className="alerts-loading">
          <div className="loader" /> Loading inventory data...
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { platform_totals, city_distribution, top_products } = data;
  const maxPlatformQty = Math.max(
    ...platform_totals.map((p) => p.total_qty),
    1,
  );
  const maxCityQty = Math.max(...city_distribution.map((c) => c.qty), 1);
  const maxProductQty = Math.max(...top_products.map((p) => p.qty), 1);
  const totalStock = platform_totals.reduce((s, p) => s + p.total_qty, 0);
  const totalSKUs = platform_totals.reduce((s, p) => s + p.sku_count, 0);

  return (
    <div className="charts-panel">
      <div className="charts-panel-header">
        <h3>Inventory Overview</h3>
        <div className="charts-summary-badges">
          <span className="charts-badge">
            {totalStock.toLocaleString()} total units
          </span>
          <span className="charts-badge">
            {totalSKUs.toLocaleString()} SKU entries
          </span>
        </div>
      </div>

      <div className="charts-grid">
        {/* Platform-wise Stock */}
        <div className="chart-card">
          <div className="chart-card-title">Stock by Platform</div>
          <div className="chart-bars">
            {platform_totals.map((p) => (
              <div key={p.platform} className="chart-bar-row">
                <div className="chart-bar-label">
                  <span
                    className="chart-bar-dot"
                    style={{ background: p.color }}
                  />
                  {formatLabel(p.platform)}
                </div>
                <div className="chart-bar-track">
                  <div
                    className="chart-bar-fill"
                    style={{
                      width: `${(p.total_qty / maxPlatformQty) * 100}%`,
                      background: p.color,
                    }}
                  />
                </div>
                <div className="chart-bar-value">
                  {p.total_qty.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* City-wise Distribution */}
        <div className="chart-card">
          <div className="chart-card-title">Stock by City (Top 15)</div>
          <div className="chart-bars">
            {city_distribution.length === 0 ? (
              <div className="plat-empty" style={{ padding: '20px' }}>
                No city data available
              </div>
            ) : (
              city_distribution.map((c, i) => (
                <div key={c.city} className="chart-bar-row">
                  <div className="chart-bar-label chart-bar-label-city">
                    <span className="chart-bar-rank">{i + 1}</span>
                    {c.city}
                  </div>
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill"
                      style={{
                        width: `${(c.qty / maxCityQty) * 100}%`,
                        background: `hsl(${220 + i * 8}, 65%, ${50 + i * 2}%)`,
                      }}
                    />
                  </div>
                  <div className="chart-bar-value">
                    {c.qty.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="chart-card chart-card-full">
          <div className="chart-card-title">Top Products by Stock</div>
          <div className="chart-bars">
            {top_products.map((p, i) => (
              <div key={`${p.platform}-${i}`} className="chart-bar-row">
                <div className="chart-bar-label chart-bar-label-product">
                  <span
                    className="chart-bar-platform-tag"
                    style={{ background: p.color }}
                  >
                    {p.platform[0].toUpperCase()}
                  </span>
                  <span className="chart-bar-product-name">{p.product}</span>
                </div>
                <div className="chart-bar-track">
                  <div
                    className="chart-bar-fill"
                    style={{
                      width: `${(p.qty / maxProductQty) * 100}%`,
                      background: p.color,
                    }}
                  />
                </div>
                <div className="chart-bar-value">{p.qty.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Home ───
function OverviewHome({
  tableCounts,
  onTableClick,
  loadingCounts,
  alerts,
  loadingAlerts,
}) {
  const totalRecords = Object.values(tableCounts).reduce((a, b) => a + b, 0);
  const totalTables = ALL_TABLES.length;

  return (
    <div className="overview">
      {/* Alerts */}
      <AlertsPanel
        alerts={alerts}
        loading={loadingAlerts}
        onTableClick={onTableClick}
      />

      {/* Inventory Charts */}
      <InventoryCharts />

      {/* Summary cards */}
      <div className="summary-row">
        <div className="summary-card">
          <span className="summary-value">{totalTables}</span>
          <span className="summary-label">Total Tables</span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{totalRecords.toLocaleString()}</span>
          <span className="summary-label">Total Records</span>
        </div>
        {Object.entries(SECTIONS).map(([key, section]) => {
          const count = section.tables.reduce(
            (sum, t) => sum + (tableCounts[t] || 0),
            0,
          );
          return (
            <div
              key={key}
              className="summary-card"
              style={{ borderTopColor: section.color }}
            >
              <span className="summary-value">{count.toLocaleString()}</span>
              <span className="summary-label">{section.label}</span>
            </div>
          );
        })}
      </div>

      {/* Section blocks */}
      {Object.entries(SECTIONS).map(([key, section]) => (
        <div key={key} className="overview-section">
          <div className="overview-section-header">
            <div
              className="overview-section-dot"
              style={{ background: section.color }}
            />
            <h3>{section.label}</h3>
            <span className="overview-section-count">
              {section.tables.length} tables
            </span>
          </div>
          <div className="overview-table-grid">
            {section.tables.map((table) => (
              <button
                key={table}
                className="overview-table-card"
                onClick={() => onTableClick(key, table)}
              >
                <span className="otc-name">{formatLabel(table)}</span>
                <span className="otc-count">
                  {loadingCounts
                    ? '...'
                    : (tableCounts[table] || 0).toLocaleString()}
                  <span className="otc-rows"> rows</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PaginatedTable with Filters ───
function PaginatedTable({ tableName }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [columns, setColumns] = useState([]);
  const [dateColumns, setDateColumns] = useState([]);
  const [textColumns, setTextColumns] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [dateCol, setDateCol] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showExpiry, setShowExpiry] = useState(false);
  const [expiryCol, setExpiryCol] = useState('');

  // Detect columns on first load via backend API
  useEffect(() => {
    dashboardAPI.getTableColumns(tableName).then((res) => {
      if (res.columns && res.columns.length > 0) {
        const cols = res.columns;
        const sample = res.sample || {};
        setColumns(cols);

        const dateCols = cols.filter((c) => {
          const val = sample[c];
          return isDateValue(val) || /date|expir|created|updated/i.test(c);
        });
        setDateColumns(dateCols);

        const txtCols = cols.filter((c) => {
          const val = sample[c];
          return typeof val === 'string' && !isDateValue(val);
        });
        setTextColumns(txtCols);

        if (dateCols.length > 0 && !dateCol) setDateCol(dateCols[0]);

        const expCol = dateCols.find((c) => /expir/i.test(c));
        if (expCol) setExpiryCol(expCol);
      }
    });
  }, [tableName]);

  const loadPage = useCallback(
    (p) => {
      setLoading(true);
      setError(null);

      const opts = {
        page: p,
        page_size: PAGE_SIZE,
      };

      if (search && textColumns.length > 0) {
        opts.search = search;
        opts.search_columns = textColumns.join(',');
      }

      if (dateCol) {
        opts.date_column = dateCol;
        if (filterYear) opts.year = filterYear;
        if (filterMonth) opts.month = filterMonth;
        if (filterDate) opts.date = filterDate;
      }

      dashboardAPI
        .getTableData(tableName, opts)
        .then((res) => {
          if (res.error) {
            setError(res.error);
            setLoading(false);
            return;
          }
          setData(res.data || []);
          setTotal(res.count || 0);
          setPage(p);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    },
    [
      tableName,
      search,
      textColumns,
      dateCol,
      filterYear,
      filterMonth,
      filterDate,
    ],
  );

  useEffect(() => {
    loadPage(0);
  }, [loadPage]);

  // Polling for updates (replaces Supabase Realtime)
  useEffect(() => {
    const interval = setInterval(() => {
      loadPage(page);
    }, 30000); // refresh every 30 seconds
    return () => clearInterval(interval);
  }, [tableName, page, loadPage]);

  const clearFilters = () => {
    setSearch('');
    setFilterYear('');
    setFilterMonth('');
    setFilterDate('');
    setShowExpiry(false);
  };

  const hasFilters = search || filterYear || filterMonth || filterDate;

  // Expiry data
  const expiryRows =
    showExpiry && expiryCol
      ? data.filter((row) => {
          const val = row[expiryCol];
          if (!val) return false;
          return new Date(val) <= new Date();
        })
      : null;

  const displayData = expiryRows || data;
  const displayColumns =
    columns.length > 0 ? columns : data.length > 0 ? Object.keys(data[0]) : [];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 5; y--) years.push(y);

  const months = [
    { val: 1, label: 'Jan' },
    { val: 2, label: 'Feb' },
    { val: 3, label: 'Mar' },
    { val: 4, label: 'Apr' },
    { val: 5, label: 'May' },
    { val: 6, label: 'Jun' },
    { val: 7, label: 'Jul' },
    { val: 8, label: 'Aug' },
    { val: 9, label: 'Sep' },
    { val: 10, label: 'Oct' },
    { val: 11, label: 'Nov' },
    { val: 12, label: 'Dec' },
  ];

  return (
    <>
      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-row">
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Search PO, product, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {dateColumns.length > 0 && (
            <>
              <div className="filter-group">
                <label>Date Column</label>
                <select
                  className="filter-select"
                  value={dateCol}
                  onChange={(e) => setDateCol(e.target.value)}
                >
                  {dateColumns.map((c) => (
                    <option key={c} value={c}>
                      {formatLabel(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Year</label>
                <select
                  className="filter-select"
                  value={filterYear}
                  onChange={(e) => {
                    setFilterYear(e.target.value);
                    setFilterDate('');
                  }}
                >
                  <option value="">All</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Month</label>
                <select
                  className="filter-select"
                  value={filterMonth}
                  onChange={(e) => {
                    setFilterMonth(e.target.value);
                    setFilterDate('');
                  }}
                >
                  <option value="">All</option>
                  {months.map((m) => (
                    <option key={m.val} value={m.val}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Exact Date</label>
                <input
                  type="date"
                  className="filter-input"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    setFilterYear('');
                    setFilterMonth('');
                  }}
                />
              </div>
            </>
          )}

          {expiryCol && (
            <div className="filter-group">
              <label>Expiry</label>
              <button
                className={`filter-expiry-btn ${showExpiry ? 'active' : ''}`}
                onClick={() => setShowExpiry(!showExpiry)}
              >
                {showExpiry ? 'Showing Expired' : 'Show Expired'}
              </button>
            </div>
          )}

          {hasFilters && (
            <div className="filter-group">
              <label>&nbsp;</label>
              <button className="filter-clear-btn" onClick={clearFilters}>
                Clear All
              </button>
            </div>
          )}
        </div>

        {hasFilters && (
          <div className="filter-info">
            Showing {displayData.length} of {total.toLocaleString()} filtered
            results
            {showExpiry && expiryRows && (
              <span> &middot; {expiryRows.length} expired</span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="table-status">
          <div className="loader" />
          Loading...
        </div>
      ) : error ? (
        <div className="table-status error">Error: {error}</div>
      ) : displayData.length === 0 ? (
        <div className="table-status">No data found</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th className="row-num">#</th>
                {displayColumns.map((col) => (
                  <th
                    key={col}
                    className={
                      col === expiryCol && showExpiry ? 'expiry-col' : ''
                    }
                  >
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, i) => {
                const isExpired =
                  expiryCol &&
                  row[expiryCol] &&
                  new Date(row[expiryCol]) <= new Date();
                return (
                  <tr
                    key={row.id ?? i}
                    className={isExpired ? 'row-expired' : ''}
                  >
                    <td className="row-num">{page * PAGE_SIZE + i + 1}</td>
                    {displayColumns.map((col) => (
                      <td
                        key={col}
                        className={
                          col === expiryCol
                            ? isExpired
                              ? 'cell-expired'
                              : 'cell-expiry'
                            : ''
                        }
                      >
                        {row[col] === null ? (
                          <span className="null-val">NULL</span>
                        ) : typeof row[col] === 'object' ? (
                          JSON.stringify(row[col])
                        ) : (
                          String(row[col])
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!showExpiry && totalPages > 1 && (
        <div className="pagination">
          <button
            className="pg-btn"
            disabled={page === 0}
            onClick={() => loadPage(0)}
          >
            &laquo;
          </button>
          <button
            className="pg-btn"
            disabled={page === 0}
            onClick={() => loadPage(page - 1)}
          >
            &lsaquo;
          </button>
          <span className="pg-info">
            {page + 1} / {totalPages}
            <span className="pg-total">
              {' '}
              &middot; {total.toLocaleString()} rows
            </span>
          </span>
          <button
            className="pg-btn"
            disabled={page >= totalPages - 1}
            onClick={() => loadPage(page + 1)}
          >
            &rsaquo;
          </button>
          <button
            className="pg-btn"
            disabled={page >= totalPages - 1}
            onClick={() => loadPage(totalPages - 1)}
          >
            &raquo;
          </button>
        </div>
      )}
    </>
  );
}

// ─── Main Dashboard ───
export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState('home'); // 'home' | 'table' | 'settings'
  const [activeSection, setActiveSection] = useState('primary');
  const [activeTable, setActiveTable] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [tableCounts, setTableCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const notifRef = useRef(null);

  // Settings view state
  const [settingsTab, setSettingsTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [expandedPerms, setExpandedPerms] = useState({});

  // Change password modal
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [changePwdForm, setChangePwdForm] = useState({ current: '', next: '', confirm: '' });
  const [changePwdError, setChangePwdError] = useState('');
  const [changePwdSuccess, setChangePwdSuccess] = useState('');
  const [changePwdLoading, setChangePwdLoading] = useState(false);
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });

  const isOpen = !collapsed || hoverOpen;

  // Open settings view if navigated here from platform with openSettings flag
  useEffect(() => {
    if (location.state?.openSettings) {
      setView('settings');
      setSettingsTab('profile');
      // Clear state so refresh doesn't re-open settings
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  // Fetch all table counts on mount — use batch endpoint, cache result
  useEffect(() => {
    const cached = readCache(COUNTS_KEY);
    if (cached) {
      setTableCounts(cached);
      setLoadingCounts(false);
    }
    // Fetch fresh in background (or blocking if no cache)
    dashboardAPI
      .getTableCounts()
      .then((res) => {
        // Backend returns { table: count, ... } or { counts: { ... } }
        const counts = (res && typeof res.counts === 'object') ? res.counts : res;
        if (counts && typeof counts === 'object') {
          setTableCounts(counts);
          writeCache(COUNTS_KEY, counts);
        }
      })
      .catch(() => {
        // Fallback to individual calls only if batch fails and no cache
        if (!cached) {
          Promise.all(
            ALL_TABLES.map((t) => fetchCount(t).then((c) => ({ table: t, count: c }))),
          ).then((results) => {
            const counts = Object.fromEntries(results.map(({ table, count }) => [table, count]));
            setTableCounts(counts);
            writeCache(COUNTS_KEY, counts);
          });
        }
      })
      .finally(() => setLoadingCounts(false));
  }, []);

  // Fetch expiry/delivery alerts on mount — cache result
  useEffect(() => {
    const cached = readCache(ALERTS_KEY);
    if (cached) {
      setAlerts(cached);
      setLoadingAlerts(false);
    }
    Promise.all(ALL_TABLES.map((table) => fetchExpiryAlerts(table)))
      .then((results) => {
        const flat = results.flat();
        setAlerts(flat);
        writeCache(ALERTS_KEY, flat);
      })
      .catch(() => {})
      .finally(() => setLoadingAlerts(false));
  }, []);

  // Fetch notifications
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const fetchNotifs = () => {
      fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.ok ? r.json() : Promise.reject())
        .then((data) => {
          const list = data.notifications || data || [];
          setNotifications(list);
          setNotifUnread(data.unread_count ?? list.filter((n) => !n.read).length);
        })
        .catch(() => {});
    };
    fetchNotifs();
    const id = setInterval(fetchNotifs, 60000);
    return () => clearInterval(id);
  }, []);

  // Close notif dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch profile when entering settings
  useEffect(() => {
    if (view !== 'settings') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingProfile(true);
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setProfile(data.user))
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [view]);

  // Fetch permissions when switching to permissions tab in settings
  useEffect(() => {
    if (view !== 'settings' || settingsTab !== 'permissions') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingPerms(true);
    fetch(`${API_BASE}/api/auth/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setPermissions(data.permissions || data || []))
      .catch(() => setPermissions([]))
      .finally(() => setLoadingPerms(false));
  }, [view, settingsTab]);

  const handleMarkAllRead = () => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/api/notifications/mark-all-read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setNotifUnread(0);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleTableClick = (section, table) => {
    setActiveSection(section);
    setActiveTable(table);
    setView('table');
    setCollapsed(true);
    setHoverOpen(false);
  };

  const goHome = () => {
    setView('home');
    setActiveTable('');
    setCollapsed(false);
  };

  const goSettings = () => {
    setView('settings');
    setSettingsTab('profile');
    setCollapsed(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePwdError('');
    setChangePwdSuccess('');
    if (!changePwdForm.current) { setChangePwdError('Current password is required.'); return; }
    if (changePwdForm.next.length < 6) { setChangePwdError('New password must be at least 6 characters.'); return; }
    if (changePwdForm.next !== changePwdForm.confirm) { setChangePwdError('New passwords do not match.'); return; }
    setChangePwdLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: changePwdForm.current, new_password: changePwdForm.next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setChangePwdError(data.detail || 'Failed to change password.'); return; }
      setChangePwdSuccess('Password changed successfully.');
      setChangePwdForm({ current: '', next: '', confirm: '' });
      setTimeout(() => { setChangePwdOpen(false); setChangePwdSuccess(''); }, 1800);
    } catch {
      setChangePwdError('Network error. Please try again.');
    } finally {
      setChangePwdLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch { return dateStr; }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const handleSidebarEnter = () => {
    if (collapsed) setHoverOpen(true);
  };
  const handleSidebarLeave = () => {
    setHoverOpen(false);
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside
        className={`sidebar ${collapsed && !hoverOpen ? 'collapsed' : ''} ${hoverOpen ? 'hover-open' : ''}`}
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
      >
        <div
          className="sidebar-brand"
          onClick={goHome}
          style={{ cursor: 'pointer' }}
        >
          <div className="brand-logo">M</div>
          {isOpen && (
            <div className="brand-info">
              <span className="brand-name">MPEMS</span>
              <span className="brand-sub">Dashboard</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {/* Home link */}
          <button
            className={`nav-home ${view === 'home' ? 'active' : ''}`}
            onClick={goHome}
            title={!isOpen ? 'Dashboard' : ''}
          >
            <span className="nav-icon"><LayoutDashboard size={15} /></span>
            {isOpen && <span className="nav-label">Dashboard</span>}
          </button>

          <div className="nav-divider" />

          {/* SAP section */}
          {isOpen && <div className="nav-section-title">SAP B1</div>}
          <Link
            to="/distributors"
            className="nav-platform-link"
            title={!isOpen ? 'Distributors' : ''}
          >
            <span className="nav-icon"><Users size={15} /></span>
            {isOpen && <span className="nav-label">Distributors</span>}
          </Link>

          <div className="nav-divider" />

          {/* Platform Apps in sidebar */}
          {isOpen && <div className="nav-section-title">Platform Apps</div>}
          {getAllPlatforms().map((p) => (
            <Link
              key={p.slug}
              to={`/platform/${p.slug}`}
              className="nav-platform-link"
              title={!isOpen ? p.name : ''}
            >
              <img
                className="nav-platform-logo"
                src={p.logo}
                alt={p.name}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <span
                className="nav-icon nav-platform-fallback"
                style={{ background: p.color, color: '#fff', display: 'none' }}
              >
                {p.icon}
              </span>
              {isOpen && <span className="nav-label">{p.name}</span>}
            </Link>
          ))}

          <div className="nav-divider" />

          {/* Data Upload Tools */}
          {isOpen && <div className="nav-section-title">Data Upload</div>}
          <Link
            to="/upload/inventory"
            className="nav-platform-link"
            title={!isOpen ? 'Inventory Upload' : ''}
          >
            <span className="nav-icon"><Upload size={15} /></span>
            {isOpen && <span className="nav-label">Inventory Upload</span>}
          </Link>
          <Link
            to="/upload/secondary"
            className="nav-platform-link"
            title={!isOpen ? 'Secondary Upload' : ''}
          >
            <span className="nav-icon"><FileUp size={15} /></span>
            {isOpen && <span className="nav-label">Secondary Upload</span>}
          </Link>
        </nav>

        {/* Settings gear button */}
        <button
          className={`sidebar-settings-btn ${view === 'settings' ? 'active' : ''}`}
          onClick={goSettings}
          title={!isOpen ? 'Settings' : ''}
        >
          <span className="sidebar-settings-icon"><Settings size={15} /></span>
          {isOpen && <span className="nav-label">Settings</span>}
        </button>

        <button
          className="collapse-btn"
          onClick={() => {
            setCollapsed(!collapsed);
            setHoverOpen(false);
          }}
        >
          {collapsed && !hoverOpen ? '\u203A' : '\u2039'}
        </button>
      </aside>

      {/* Main Content */}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            {view === 'home' ? (
              <h1>Dashboard</h1>
            ) : view === 'settings' ? (
              <>
                <button className="back-btn" onClick={goHome} title="Back to Dashboard">&larr;</button>
                <h1>Settings</h1>
              </>
            ) : (
              <>
                <button
                  className="back-btn"
                  onClick={goHome}
                  title="Back to Dashboard"
                >
                  &larr;
                </button>
                <h1>{formatLabel(activeTable)}</h1>
                <span className="topbar-section">
                  {SECTIONS[activeSection].label}
                </span>
              </>
            )}
          </div>

          <div className="topbar-actions">
            {/* Theme toggle */}
            <div className="theme-toggle">
              <button
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
                title="Light theme"
              >
                <Sun size={14} />
              </button>
              <button
                className={`theme-btn ${theme === 'default' ? 'active' : ''}`}
                onClick={() => setTheme('default')}
                title="System default"
              >
                <Monitor size={14} />
              </button>
              <button
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
                title="Dark theme"
              >
                <Moon size={14} />
              </button>
            </div>

            {/* Notification bell */}
            <div className="notif-wrapper" ref={notifRef}>
              <button
                className={`notif-bell-btn ${notifOpen ? 'active' : ''}`}
                onClick={() => setNotifOpen((o) => !o)}
                title="Notifications"
              >
                <Bell size={17} />
                {notifUnread > 0 && (
                  <span className="notif-badge">
                    {notifUnread > 99 ? '99+' : notifUnread}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-panel-header">
                    <span className="notif-panel-title">Notifications</span>
                    {notifUnread > 0 && (
                      <button className="notif-mark-read" onClick={handleMarkAllRead}>
                        ✓ Mark all read
                      </button>
                    )}
                  </div>

                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">No notifications</div>
                    ) : (
                      notifications.slice(0, 8).map((n, i) => (
                        <div key={i} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                          <div className="notif-item-title">{n.title || n.message}</div>
                          {n.body && <div className="notif-item-body">{n.body}</div>}
                          <div className="notif-item-time">{timeAgo(n.created_at || n.timestamp)}</div>
                          {!n.read && <span className="notif-dot" />}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="notif-panel-footer">
                    <button className="notif-view-all" onClick={() => setNotifOpen(false)}>
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content">
          {view === 'home' ? (
            <OverviewHome
              tableCounts={tableCounts}
              loadingCounts={loadingCounts}
              onTableClick={handleTableClick}
              alerts={alerts}
              loadingAlerts={loadingAlerts}
            />
          ) : view === 'settings' ? (
            <div className="settings-page">
              {/* Breadcrumb */}
              <div className="settings-breadcrumb">
                <button className="settings-breadcrumb-link" onClick={goHome}>Home</button>
                <span className="settings-breadcrumb-sep">›</span>
                <span className="settings-breadcrumb-cur">Settings</span>
              </div>

              <div className="settings-header">
                <h1 className="settings-title">Settings</h1>
                <p className="settings-sub">Manage your profile and view permissions</p>
              </div>

              {/* Tabs */}
              <div className="settings-tabs">
                <button
                  className={`settings-tab ${settingsTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('profile')}
                >
                  <User size={14} /> Profile
                </button>
                <button
                  className={`settings-tab ${settingsTab === 'permissions' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('permissions')}
                >
                  <Shield size={14} /> Permissions
                </button>
              </div>

              {/* Profile Tab */}
              {settingsTab === 'profile' && (
                <div className="settings-card">
                  {loadingProfile ? (
                    <div className="settings-loading">Loading...</div>
                  ) : (() => {
                    const u = profile || user;
                    return (
                      <>
                        <div className="settings-profile-row">
                          <div className="settings-avatar-lg">
                            {(u?.employee_name || u?.email || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                          </div>

                          <div className="settings-profile-fields">
                            {u?.employee_code && (
                              <div className="settings-field">
                                <span className="settings-field-label">employee_code</span>
                                <span className="settings-field-value">{u.employee_code}</span>
                              </div>
                            )}
                            <div className="settings-field">
                              <span className="settings-field-label">employee name</span>
                              <span className="settings-field-value">
                                {u?.employee_name || u?.name || u?.email?.split('@')[0] || '—'}
                              </span>
                            </div>
                            <div className="settings-field">
                              <span className="settings-field-label">email</span>
                              <span className="settings-field-value">{u?.email || '—'}</span>
                            </div>
                            <div className="settings-field-row">
                              <span className={`settings-status-badge ${(u?.status || 'active').toLowerCase()}`}>
                                {u?.status || 'Active'}
                              </span>
                            </div>
                            <div className="settings-field">
                              <span className="settings-field-label">Joined On:</span>
                              <span className="settings-field-value settings-field-bold">
                                {formatDate(u?.joined_on || u?.created_at)}
                              </span>
                            </div>
                          </div>

                          <div className="settings-profile-actions">
                            <button className="settings-change-pwd-btn" onClick={() => { setChangePwdOpen(true); setChangePwdError(''); setChangePwdSuccess(''); }}>Change Password</button>
                            <button className="settings-logout-btn" onClick={handleSignOut}>Logout</button>
                          </div>
                        </div>

                        {u?.roles?.length > 0 && (
                          <div className="settings-roles">
                            <h3 className="settings-roles-title">Roles</h3>
                            <div className="settings-roles-grid">
                              {u.roles.map((role, idx) => (
                                <div
                                  key={idx}
                                  className={`settings-role-card ${role.is_current ? 'current' : ''}`}
                                >
                                  {role.is_current && (
                                    <span className="settings-role-badge">Current</span>
                                  )}
                                  <div className="settings-role-name">{role.role || role.name}</div>
                                  <div className="settings-role-company">{role.company}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Permissions Tab */}
              {settingsTab === 'permissions' && (
                <div className="settings-card settings-perms-card">
                  {loadingPerms ? (
                    <div className="settings-loading">Loading permissions...</div>
                  ) : permissions.length === 0 ? (
                    <div className="settings-empty">No permissions data available.</div>
                  ) : (
                    permissions.map((perm, idx) => {
                      const key = perm.module || idx;
                      return (
                        <div key={key} className="settings-perm-row">
                          <button
                            className="settings-perm-header"
                            onClick={() => setExpandedPerms((p) => ({ ...p, [key]: !p[key] }))}
                          >
                            <div className="settings-perm-left">
                              <span className="settings-perm-icon"><Shield size={15} /></span>
                              <span className="settings-perm-name">{perm.module}</span>
                            </div>
                            <div className="settings-perm-right">
                              <span className="settings-perm-count">
                                {perm.count ?? perm.permissions?.length ?? 0}
                              </span>
                              <span className={`settings-perm-chevron ${expandedPerms[key] ? 'open' : ''}`}>›</span>
                            </div>
                          </button>
                          {expandedPerms[key] && perm.permissions?.length > 0 && (
                            <div className="settings-perm-items">
                              {perm.permissions.map((p, i) => (
                                <div key={i} className="settings-perm-item">{p}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Change Password Modal */}
              {changePwdOpen && (
                <div className="cpwd-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setChangePwdOpen(false); setChangePwdError(''); } }}>
                  <div className="cpwd-modal">
                    <div className="cpwd-header">
                      <h2 className="cpwd-title">Change Password</h2>
                      <button className="cpwd-close" onClick={() => { setChangePwdOpen(false); setChangePwdError(''); }}>✕</button>
                    </div>

                    <form onSubmit={handleChangePassword} className="cpwd-form">
                      {changePwdError && <div className="cpwd-error">{changePwdError}</div>}
                      {changePwdSuccess && <div className="cpwd-success">{changePwdSuccess}</div>}

                      <div className="cpwd-field">
                        <label className="cpwd-label">Current Password</label>
                        <div className="cpwd-input-wrap">
                          <input
                            type={showPwd.current ? 'text' : 'password'}
                            className="cpwd-input"
                            placeholder="Enter current password"
                            value={changePwdForm.current}
                            onChange={(e) => setChangePwdForm((f) => ({ ...f, current: e.target.value }))}
                            autoComplete="current-password"
                          />
                          <button type="button" className="cpwd-eye" onClick={() => setShowPwd((s) => ({ ...s, current: !s.current }))}>
                            {showPwd.current ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <div className="cpwd-field">
                        <label className="cpwd-label">New Password</label>
                        <div className="cpwd-input-wrap">
                          <input
                            type={showPwd.next ? 'text' : 'password'}
                            className="cpwd-input"
                            placeholder="Min. 6 characters"
                            value={changePwdForm.next}
                            onChange={(e) => setChangePwdForm((f) => ({ ...f, next: e.target.value }))}
                            autoComplete="new-password"
                          />
                          <button type="button" className="cpwd-eye" onClick={() => setShowPwd((s) => ({ ...s, next: !s.next }))}>
                            {showPwd.next ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <div className="cpwd-field">
                        <label className="cpwd-label">Confirm New Password</label>
                        <div className="cpwd-input-wrap">
                          <input
                            type={showPwd.confirm ? 'text' : 'password'}
                            className="cpwd-input"
                            placeholder="Repeat new password"
                            value={changePwdForm.confirm}
                            onChange={(e) => setChangePwdForm((f) => ({ ...f, confirm: e.target.value }))}
                            autoComplete="new-password"
                          />
                          <button type="button" className="cpwd-eye" onClick={() => setShowPwd((s) => ({ ...s, confirm: !s.confirm }))}>
                            {showPwd.confirm ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <div className="cpwd-actions">
                        <button type="button" className="cpwd-cancel" onClick={() => { setChangePwdOpen(false); setChangePwdError(''); }}>Cancel</button>
                        <button type="submit" className="cpwd-submit" disabled={changePwdLoading}>
                          {changePwdLoading ? 'Saving…' : 'Update Password'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <PaginatedTable
                key={`${activeSection}-${activeTable}`}
                tableName={activeTable}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
