import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useEffect, useRef, useState } from 'react';
import { Bell, Sun, Moon, Monitor, Settings, ChevronRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function UploadPage({ title, src }) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
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

  return (
    <div className="app-layout">
      {/* Minimal sidebar — just settings button */}
      <aside className="sidebar collapsed">
        <div className="sidebar-brand" style={{ justifyContent: 'center', padding: '20px 14px' }}>
          <div className="brand-logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>M</div>
        </div>
        <nav className="sidebar-nav" />
        <button
          className="sidebar-settings-btn"
          onClick={() => navigate('/dashboard', { state: { openSettings: true } })}
          title="Settings"
        >
          <span className="sidebar-settings-icon"><Settings size={15} /></span>
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
            <span className="plat-topbar-platform">{title}</span>
          </div>

          <div className="topbar-actions">
            <div className="theme-toggle">
              <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} title="Light"><Sun size={14} /></button>
              <button className={`theme-btn ${theme === 'default' ? 'active' : ''}`} onClick={() => setTheme('default')} title="System"><Monitor size={14} /></button>
              <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title="Dark"><Moon size={14} /></button>
            </div>

            <div className="notif-wrapper" ref={notifRef}>
              <button
                className={`notif-bell-btn ${notifOpen ? 'active' : ''}`}
                onClick={() => setNotifOpen((o) => !o)}
                title="Notifications"
              >
                <Bell size={17} />
                {notifUnread > 0 && (
                  <span className="notif-badge">{notifUnread > 99 ? '99+' : notifUnread}</span>
                )}
              </button>

              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-panel-header">
                    <span className="notif-panel-title">Notifications</span>
                    {notifUnread > 0 && (
                      <button className="notif-mark-read" onClick={handleMarkAllRead}>✓ Mark all read</button>
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
                    <button className="notif-view-all" onClick={() => setNotifOpen(false)}>View all notifications</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Upload content in iframe */}
        <iframe
          src={src}
          className="upload-iframe"
          title={title}
        />
      </div>
    </div>
  );
}
