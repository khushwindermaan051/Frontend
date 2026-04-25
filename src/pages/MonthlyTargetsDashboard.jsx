import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Bell, ChevronRight, Monitor, Moon, Settings, Sun, Users } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { monthlyTargetsAPI, notificationsAPI } from '../lib/api';
import jivoLogo from '../assets/logos/jivo.jpg';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonthISO(s) {
  const [y, m] = String(s || '').split('-');
  return { month: Number(m), year: Number(y) };
}

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatNum(val, digits = 0) {
  if (val == null) return '—';
  const n = Number(val);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPct(val) {
  if (val == null) return '—';
  const n = Number(val);
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function pctClass(val, { negativeIsBad = false } = {}) {
  if (val == null) return '';
  const pct = Number(val) * 100;
  if (!Number.isFinite(pct)) return '';
  if (negativeIsBad && pct < 0) return 'mt-pct-red';
  if (pct >= 100) return 'mt-pct-green';
  if (pct >= 60) return 'mt-pct-amber';
  return 'mt-pct-red';
}

function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function MonthlyTargetsDashboard() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [monthISO, setMonthISO] = useState(currentMonthISO());
  const { month, year } = parseMonthISO(monthISO);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const notifRef = useRef(null);

  const [collapsed, setCollapsed] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const isOpen = !collapsed || hoverOpen;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const fetchNotifs = () => {
      notificationsAPI
        .getAll()
        .then((d) => {
          const list = d.notifications || d || [];
          setNotifications(list);
          setNotifUnread(d.unread_count ?? list.filter((n) => !n.read).length);
        })
        .catch(() => {});
    };
    fetchNotifs();
    const id = setInterval(fetchNotifs, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = () => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/api/notifications/mark-all-read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setNotifUnread(0);
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await monthlyTargetsAPI.dashboard({ month, year });
        if (!cancelled) setData(res);
      } catch (e) {
        if (cancelled) return;
        setData(null);
        setError(e.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  const exportCSV = () => {
    if (!data) return;
    const header = [
      'SECTION',
      'FORMAT',
      'TYPE',
      'DATE',
      'TARGETS',
      'DONE LTRS',
      'DONE VALUE',
      'ACHIEVED %',
      'EST.LTR',
      'EST.VALUE',
      'EST. LTR%',
      'LAST MONTH',
      'GROWTH',
      'GROWTH %',
    ];
    const out = [header];
    for (const section of ['premium', 'commodity']) {
      const block = data[section];
      if (!block) continue;
      for (const r of block.rows) {
        out.push([
          section.toUpperCase(),
          r.format,
          r.type,
          formatDate(r.date),
          r.targets ?? '',
          r.done_ltrs ?? '',
          r.done_value ?? '',
          r.achieved_pct ?? '',
          r.est_ltr ?? '',
          r.est_value ?? '',
          r.est_ltr_pct ?? '',
          r.last_month ?? '',
          r.growth ?? '',
          r.growth_pct ?? '',
        ]);
      }
      out.push([
        section.toUpperCase() + ' TOTAL',
        '',
        '',
        '',
        block.total.targets,
        block.total.done_ltrs,
        block.total.done_value,
        block.total.achieved_pct,
        block.total.est_ltr,
        block.total.est_value,
        block.total.est_ltr_pct,
        block.total.last_month,
        block.total.growth,
        block.total.growth_pct,
      ]);
    }
    downloadCSV(`monthly-targets-${monthISO}.csv`, out);
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside
        className={`sidebar dist-sidebar ${collapsed && !hoverOpen ? 'collapsed' : ''} ${hoverOpen ? 'hover-open' : ''}`}
        onMouseEnter={() => collapsed && setHoverOpen(true)}
        onMouseLeave={() => setHoverOpen(false)}
      >
        <div
          className="sidebar-brand"
          onClick={() => navigate('/dashboard')}
          style={{ cursor: 'pointer' }}
        >
          <img className="brand-logo-img" src={jivoLogo} alt="Jivo" />
          {isOpen && (
            <div className="brand-info">
              <span className="brand-name">Jivo</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <button
            className="plat-nav-item"
            onClick={() => navigate('/distributors')}
            title={!isOpen ? 'Distributors' : ''}
          >
            <span className="nav-icon"><Users size={15} /></span>
            {isOpen && <span className="nav-label">Distributors</span>}
          </button>
          <button
            className="plat-nav-item active"
            title={!isOpen ? 'Monthly Targets' : ''}
          >
            <span className="nav-icon"><BarChart3 size={15} /></span>
            {isOpen && <span className="nav-label">Monthly Targets</span>}
          </button>
          <div className="nav-divider" />
        </nav>

        <button
          className="sidebar-settings-btn"
          onClick={() =>
            navigate('/dashboard', { state: { openSettings: true } })
          }
          title={!isOpen ? 'Settings' : 'Settings'}
        >
          <span className="sidebar-settings-icon">
            <Settings size={15} />
          </span>
          {isOpen && <span className="nav-label">Settings</span>}
        </button>

        <button
          className="collapse-btn"
          onClick={() => {
            setCollapsed(!collapsed);
            setHoverOpen(false);
          }}
        >
          {collapsed && !hoverOpen ? '›' : '‹'}
        </button>
      </aside>

      {/* Main area */}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="plat-topbar-dashboard-btn"
              onClick={() => navigate('/dashboard')}
              title="Go to Main Dashboard"
            >
              Dashboard
            </button>
            <span className="plat-topbar-sep">
              <ChevronRight size={14} />
            </span>
            <span className="topbar-section">Monthly Targets</span>
          </div>

          <div className="topbar-actions">
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
                      <button
                        className="notif-mark-read"
                        onClick={handleMarkAllRead}
                      >
                        ✓ Mark all read
                      </button>
                    )}
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">No notifications</div>
                    ) : (
                      notifications.slice(0, 8).map((n, i) => (
                        <div
                          key={i}
                          className={`notif-item ${!n.read ? 'unread' : ''}`}
                        >
                          <div className="notif-item-title">
                            {n.title || n.message}
                          </div>
                          {n.body && (
                            <div className="notif-item-body">{n.body}</div>
                          )}
                          <div className="notif-item-time">
                            {timeAgo(n.created_at || n.timestamp)}
                          </div>
                          {!n.read && <span className="notif-dot" />}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="notif-panel-footer">
                    <button
                      className="notif-view-all"
                      onClick={() => setNotifOpen(false)}
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="mt-dash-page">
          <div className="mt-dash-inner">
            <div className="mt-dash-header">
              <h1 className="mt-dash-title">Monthly Targets — All Platforms</h1>
              <div className="mt-dash-controls">
                <label className="lr-field">
                  <span>Month</span>
                  <input
                    type="month"
                    value={monthISO}
                    onChange={(e) => setMonthISO(e.target.value)}
                  />
                </label>
                <button
                  className="plat-btn plat-btn-secondary"
                  onClick={exportCSV}
                  disabled={!data || loading}
                >
                  Export CSV
                </button>
              </div>
            </div>

            {error && <div className="lr-error">{error}</div>}

            {loading && !data ? (
              <div className="plat-empty">
                <div className="loader" /> Loading…
              </div>
            ) : !data ? (
              <div className="plat-empty">No data.</div>
            ) : (
              <>
                <DashboardSection
                  title="SECONDARY TARGET SHEET FOR PREMIUM"
                  block={data.premium}
                  monthISO={monthISO}
                />
                <div style={{ height: 24 }} />
                <DashboardSection
                  title="SECONDARY TARGET SHEET FOR COMMODITY"
                  block={data.commodity}
                  monthISO={monthISO}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSection({ title, block, monthISO }) {
  if (!block) return null;

  return (
    <div className="card mt-card">
      <div className="mt-section-title-bar">{title}</div>

      <div className="table-wrapper">
        <table className="data-table mt-table mt-dashboard-table">
          <thead>
            <tr>
              <th className="mt-sticky-col">FORMAT</th>
              <th>TYPE</th>
              <th>DATE</th>
              <th>TARGETS</th>
              <th>DONE LTRS</th>
              <th>DONE VALUE</th>
              <th>ACHIEVED %</th>
              <th>Est.LTR</th>
              <th>Est.Value</th>
              <th>Est. LTR%</th>
              <th>LAST MONTH</th>
              <th>GROWTH</th>
              <th>GROWTH %</th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r) => (
              <tr key={`${r.slug}-${r.item_head}-${monthISO}`}>
                <td className="mt-sticky-col" style={{ fontWeight: 600 }}>
                  {r.platform_name || r.format}
                </td>
                <td>{r.type}</td>
                <td>{formatDate(r.date)}</td>
                <td>
                  {r.targets == null ? (
                    <span className="mt-no-target">No target</span>
                  ) : (
                    formatNum(r.targets)
                  )}
                </td>
                <td>{formatNum(r.done_ltrs)}</td>
                <td>{formatNum(r.done_value)}</td>
                <td className={pctClass(r.achieved_pct)}>
                  {formatPct(r.achieved_pct)}
                </td>
                <td>{formatNum(r.est_ltr)}</td>
                <td>{formatNum(r.est_value)}</td>
                <td className={pctClass(r.est_ltr_pct)}>
                  {formatPct(r.est_ltr_pct)}
                </td>
                <td>{formatNum(r.last_month)}</td>
                <td className={Number(r.growth) < 0 ? 'mt-pct-red' : ''}>
                  {formatNum(r.growth)}
                </td>
                <td className={pctClass(r.growth_pct, { negativeIsBad: true })}>
                  {formatPct(r.growth_pct)}
                </td>
              </tr>
            ))}
            <tr className="mt-grand-total-row">
              <td className="mt-sticky-col" style={{ fontWeight: 700 }}>
                GRAND TOTAL
              </td>
              <td />
              <td />
              <td>{formatNum(block.total.targets)}</td>
              <td>{formatNum(block.total.done_ltrs)}</td>
              <td>{formatNum(block.total.done_value)}</td>
              <td className={pctClass(block.total.achieved_pct)}>
                {formatPct(block.total.achieved_pct)}
              </td>
              <td>{formatNum(block.total.est_ltr)}</td>
              <td>{formatNum(block.total.est_value)}</td>
              <td className={pctClass(block.total.est_ltr_pct)}>
                {formatPct(block.total.est_ltr_pct)}
              </td>
              <td>{formatNum(block.total.last_month)}</td>
              <td
                className={Number(block.total.growth) < 0 ? 'mt-pct-red' : ''}
              >
                {formatNum(block.total.growth)}
              </td>
              <td
                className={pctClass(block.total.growth_pct, {
                  negativeIsBad: true,
                })}
              >
                {formatPct(block.total.growth_pct)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
