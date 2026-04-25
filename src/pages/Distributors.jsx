import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { sapAPI } from '../lib/api';
import { Bell, Settings, Sun, Moon, Monitor, ChevronRight, Users, BarChart3 } from 'lucide-react';
import jivoLogo from '../assets/logos/jivo.jpg';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const PAGE_SIZE = 50;

export default function Distributors() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

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
      fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
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

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
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

  const [distributors, setDistributors] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const searchTimer = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Detail panel
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState('info');
  const [orders, setOrders] = useState({ data: [], count: 0 });
  const [invoices, setInvoices] = useState({ data: [], count: 0 });
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(0);
    }, 400);
  };

  const loadDistributors = useCallback(async () => {
    setLoading(true);
    try {
      const result = await sapAPI.getDistributors({
        search: debouncedSearch,
        page,
        page_size: PAGE_SIZE,
      });
      setDistributors(result.data || []);
      setTotal(result.count || 0);
    } catch {
      setDistributors([]);
      setTotal(0);
    }
    setLoading(false);
  }, [debouncedSearch, page]);

  useEffect(() => {
    loadDistributors();
  }, [loadDistributors]);

  // Load detail
  const selectDistributor = async (d) => {
    setSelected(d.CardCode);
    setDetailTab('info');
    setDetailLoading(true);
    setOrders({ data: [], count: 0 });
    setInvoices({ data: [], count: 0 });
    try {
      const result = await sapAPI.getDistributor(d.CardCode);
      setDetail(result);
    } catch {
      setDetail(null);
    }
    setDetailLoading(false);
  };

  // Load orders when tab switches
  useEffect(() => {
    if (detailTab !== 'orders' || !selected) return;
    setOrdersLoading(true);
    sapAPI
      .getDistributorOrders(selected, { page: 0, page_size: 50 })
      .then((r) => setOrders(r))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [detailTab, selected]);

  // Load invoices when tab switches
  useEffect(() => {
    if (detailTab !== 'invoices' || !selected) return;
    setInvoicesLoading(true);
    sapAPI
      .getDistributorInvoices(selected, { page: 0, page_size: 50 })
      .then((r) => setInvoices(r))
      .catch(() => {})
      .finally(() => setInvoicesLoading(false));
  }, [detailTab, selected]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
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
            className="plat-nav-item active"
            title={!isOpen ? 'Distributors' : ''}
          >
            <span className="nav-icon"><Users size={15} /></span>
            {isOpen && <span className="nav-label">Distributors</span>}
          </button>
          <button
            className="plat-nav-item"
            onClick={() => navigate('/monthly-targets')}
            title={!isOpen ? 'Monthly Targets' : ''}
          >
            <span className="nav-icon"><BarChart3 size={15} /></span>
            {isOpen && <span className="nav-label">Monthly Targets</span>}
          </button>
          <div className="nav-divider" />
        </nav>

        <button
          className="sidebar-settings-btn"
          onClick={() => navigate('/dashboard', { state: { openSettings: true } })}
          title="Settings"
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
            <span className="plat-topbar-sep"><ChevronRight size={14} /></span>
            <span className="topbar-section">Distributors</span>
          </div>

          <div className="topbar-actions">
            <div className="theme-toggle">
              <button
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
                title="Light theme"
              ><Sun size={14} /></button>
              <button
                className={`theme-btn ${theme === 'default' ? 'active' : ''}`}
                onClick={() => setTheme('default')}
                title="System default"
              ><Monitor size={14} /></button>
              <button
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
                title="Dark theme"
              ><Moon size={14} /></button>
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

        <div className="plat-content">
          <div className="dist-layout">
            {/* Left: List */}
            <div className="dist-list-panel">
              <div className="dist-list-header">
                <input
                  type="text"
                  placeholder="Search name, code, phone, city..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="dist-search"
                />
              </div>

              <div className="dist-list-body">
                {loading ? (
                  <div className="plat-empty">
                    <div className="loader" /> Loading distributors...
                  </div>
                ) : distributors.length === 0 ? (
                  <div className="plat-empty">No distributors found</div>
                ) : (
                  distributors.map((d) => (
                    <div
                      key={d.CardCode}
                      className={`dist-item ${selected === d.CardCode ? 'selected' : ''}`}
                      onClick={() => selectDistributor(d)}
                    >
                      <div
                        className="dist-item-avatar"
                        style={{
                          background: d.Active === 'Y' ? '#00b894' : '#b2bec3',
                        }}
                      >
                        {(d.CardName || '?')[0]}
                      </div>
                      <div className="dist-item-info">
                        <div className="dist-item-name">{d.CardName}</div>
                        <div className="dist-item-sub">
                          {d.CardCode}
                          {d.City && <span> &middot; {d.City}</span>}
                          {d.State && <span>, {d.State}</span>}
                        </div>
                      </div>
                      <div className="dist-item-balance">
                        {d.Balance != null && (
                          <span
                            className={d.Balance < 0 ? 'negative' : 'positive'}
                          >
                            {d.Currency || 'INR'}{' '}
                            {Number(d.Balance).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {totalPages > 1 && (
                <div className="pagination" style={{ padding: '10px 16px' }}>
                  <button
                    className="pg-btn"
                    disabled={page === 0}
                    onClick={() => setPage(0)}
                  >
                    &laquo;
                  </button>
                  <button
                    className="pg-btn"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    &lsaquo;
                  </button>
                  <span className="pg-info">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    className="pg-btn"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(page + 1)}
                  >
                    &rsaquo;
                  </button>
                  <button
                    className="pg-btn"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(totalPages - 1)}
                  >
                    &raquo;
                  </button>
                </div>
              )}
            </div>

            {/* Right: Detail */}
            <div className="dist-detail-panel">
              {!selected ? (
                <div className="plat-empty" style={{ padding: '60px 20px' }}>
                  Select a distributor to view details
                </div>
              ) : detailLoading ? (
                <div className="plat-empty">
                  <div className="loader" /> Loading details...
                </div>
              ) : !detail ? (
                <div className="plat-empty">Failed to load details</div>
              ) : (
                <>
                  {/* Header */}
                  <div className="dist-detail-header">
                    <div
                      className="dist-detail-avatar"
                      style={{
                        background:
                          detail.distributor.Active === 'Y'
                            ? '#00b894'
                            : '#b2bec3',
                      }}
                    >
                      {(detail.distributor.CardName || '?')[0]}
                    </div>
                    <div>
                      <h2 className="dist-detail-name">
                        {detail.distributor.CardName}
                      </h2>
                      <div className="dist-detail-code">
                        {detail.distributor.CardCode}
                      </div>
                    </div>
                    <div className="dist-detail-status">
                      <span
                        className={`plat-status ${detail.distributor.Active === 'Y' ? 'dispatched' : 'loading'}`}
                      >
                        {detail.distributor.Active === 'Y'
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="dist-tabs">
                    {[
                      'info',
                      'addresses',
                      'contacts',
                      'orders',
                      'invoices',
                    ].map((tab) => (
                      <button
                        key={tab}
                        className={`dist-tab ${detailTab === tab ? 'active' : ''}`}
                        onClick={() => setDetailTab(tab)}
                      >
                        {tab === 'info'
                          ? 'Details'
                          : tab[0].toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="dist-tab-content">
                    {detailTab === 'info' && (
                      <InfoTab data={detail.distributor} />
                    )}
                    {detailTab === 'addresses' && (
                      <AddressesTab addresses={detail.addresses} />
                    )}
                    {detailTab === 'contacts' && (
                      <ContactsTab contacts={detail.contacts} />
                    )}
                    {detailTab === 'orders' && (
                      <DocsTab
                        data={orders}
                        loading={ordersLoading}
                        type="Purchase Order"
                      />
                    )}
                    {detailTab === 'invoices' && (
                      <DocsTab
                        data={invoices}
                        loading={invoicesLoading}
                        type="AP Invoice"
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Tab Components ─── */

function InfoTab({ data }) {
  const fields = [
    ['Card Code', data.CardCode],
    ['Name', data.CardName],
    ['GSTIN', data.GSTIN],
    ['Phone', data.Phone1],
    ['Phone 2', data.Phone2],
    ['Mobile', data.Cellular],
    ['Email', data.Email],
    ['Fax', data.Fax],
    ['Address', data.Address],
    ['City', data.City],
    ['State', data.State],
    ['Zip Code', data.ZipCode],
    ['Country', data.Country],
    ['Currency', data.Currency],
    [
      'Balance',
      data.Balance != null
        ? `${data.Currency || 'INR'} ${Number(data.Balance).toLocaleString()}`
        : null,
    ],
    [
      'Credit Line',
      data.CreditLine != null
        ? `${data.Currency || 'INR'} ${Number(data.CreditLine).toLocaleString()}`
        : null,
    ],
    ['Created', data.CreateDate?.split('T')[0]],
    ['Updated', data.UpdateDate?.split('T')[0]],
  ];

  return (
    <div className="dist-info-grid">
      {fields.map(
        ([label, val]) =>
          val != null &&
          val !== '' && (
            <div key={label} className="plat-stock-row">
              <span className="plat-stock-label">{label}</span>
              <span className="plat-stock-val neutral">{String(val)}</span>
            </div>
          ),
      )}
    </div>
  );
}

function AddressesTab({ addresses }) {
  if (!addresses || addresses.length === 0) {
    return <div className="plat-empty">No addresses found</div>;
  }
  return (
    <div className="dist-cards-grid">
      {addresses.map((a, i) => (
        <div key={i} className="dist-address-card">
          <div className="dist-address-type">
            {a.AdresType === 'S'
              ? 'Ship To'
              : a.AdresType === 'B'
                ? 'Bill To'
                : a.AdresType}
          </div>
          <div className="dist-address-label">{a.Address}</div>
          <div className="dist-address-detail">
            {[a.Street, a.Block, a.City, a.State, a.ZipCode, a.Country]
              .filter(Boolean)
              .join(', ')}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactsTab({ contacts }) {
  if (!contacts || contacts.length === 0) {
    return <div className="plat-empty">No contacts found</div>;
  }
  return (
    <div className="dist-cards-grid">
      {contacts.map((c, i) => (
        <div key={i} className="dist-address-card">
          <div className="dist-address-type">{c.Position || 'Contact'}</div>
          <div className="dist-address-label">
            {[c.FirstName, c.LastName].filter(Boolean).join(' ') || c.Name}
          </div>
          <div className="dist-address-detail">
            {c.Tel1 && <span>Phone: {c.Tel1} </span>}
            {c.Email && <span>Email: {c.Email}</span>}
          </div>
          <span
            className={`plat-status ${c.Active === 'Y' ? 'dispatched' : 'loading'}`}
            style={{ marginTop: '6px', display: 'inline-block' }}
          >
            {c.Active === 'Y' ? 'Active' : 'Inactive'}
          </span>
        </div>
      ))}
    </div>
  );
}

function DocsTab({ data, loading, type }) {
  if (loading) {
    return (
      <div className="plat-empty">
        <div className="loader" /> Loading {type}s...
      </div>
    );
  }
  if (!data.data || data.data.length === 0) {
    return <div className="plat-empty">No {type.toLowerCase()}s found</div>;
  }
  return (
    <>
      <div style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '10px' }}>
        {data.count} {type.toLowerCase()}(s) found
      </div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Doc #</th>
              <th>Date</th>
              <th>Due Date</th>
              <th>Total</th>
              <th>Currency</th>
              <th>Status</th>
              <th>Vendor Ref</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((doc) => (
              <tr key={doc.DocEntry}>
                <td style={{ fontWeight: 600 }}>{doc.DocNum}</td>
                <td>{doc.DocDate?.split('T')[0]}</td>
                <td>{doc.DocDueDate?.split('T')[0]}</td>
                <td style={{ fontWeight: 600 }}>
                  {Number(doc.DocTotal || 0).toLocaleString()}
                </td>
                <td>{doc.DocCur}</td>
                <td>
                  <span
                    className={`plat-status ${doc.DocStatus === 'O' ? 'loading' : 'dispatched'}`}
                  >
                    {doc.DocStatus === 'O' ? 'Open' : 'Closed'}
                  </span>
                </td>
                <td>{doc.VendorRef || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
