import { useParams, useNavigate, Outlet, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PlatformContext from '../context/PlatformContext';
import { getPlatformConfig } from '../config/platforms';
import { Bell, Settings, Sun, Moon, Monitor, ChevronRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const PAGE_LABELS = {
  '': 'Dashboard',
  po: 'PO & Stock',
  'truck-loading': 'Truck Loading',
  dispatches: 'Dispatches',
  distributors: 'Distributors',
};

export default function PlatformLayout() {
  const { slug } = useParams();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const config = getPlatformConfig(slug);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const notifRef = useRef(null);

  // Derive current page label from URL
  const subPath = location.pathname.replace(`/platform/${slug}`, '').replace(/^\//, '');
  const pageLabel = PAGE_LABELS[subPath] ?? subPath;

  // Fetch notifications
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

  // Close notif on outside click
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

  if (!config) {
    return (
      <div className="plat-not-found">
        <h2>Platform not found</h2>
        <p>No platform configured for "{slug}"</p>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  const navItems = [
    { to: `/platform/${slug}`, label: 'Dashboard', end: true },
    { to: `/platform/${slug}/po`, label: 'PO & Stock' },
    { to: `/platform/${slug}/truck-loading`, label: 'Truck Loading' },
    { to: `/platform/${slug}/dispatches`, label: 'Dispatches' },
    { to: `/platform/${slug}/distributors`, label: 'Distributors' },
  ];

  return (
    <PlatformContext.Provider value={config}>
      <div className="app-layout" style={{ '--platform-color': config.color }}>
        <aside className="sidebar plat-sidebar">
          <div
            className="sidebar-brand"
            onClick={() => navigate(`/platform/${slug}`)}
            style={{ cursor: 'pointer' }}
          >
            {config.logo ? (
              <img
                className="brand-logo-img"
                src={config.logo}
                alt={config.name}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="brand-logo"
              style={{ background: config.color, display: config.logo ? 'none' : 'flex' }}
            >
              {config.icon}
            </div>
            <div className="brand-info">
              <span className="brand-name">{config.name}</span>
              <span className="brand-sub">Platform App</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `plat-nav-item ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}

          </nav>

          <button
            className="sidebar-settings-btn"
            onClick={() => navigate('/dashboard', { state: { openSettings: true } })}
            title="Settings"
          >
            <span className="sidebar-settings-icon"><Settings size={15} /></span>
            <span className="nav-label">Settings</span>
          </button>
        </aside>

        <div className="main-area">
          {/* Topbar */}
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
              <span className="plat-topbar-platform">
                {config.name}
              </span>
              {pageLabel && pageLabel !== 'Dashboard' && (
                <>
                  <span className="plat-topbar-sep"><ChevronRight size={14} /></span>
                  <span className="topbar-section">{pageLabel}</span>
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

          <Outlet />
        </div>
      </div>
    </PlatformContext.Provider>
  );
}
