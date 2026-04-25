import { useRef, useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { timeAgo } from '../../utils/formatters';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const { notifications, unread, markAllRead } = useNotifications();

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="notif-wrapper" ref={wrapperRef}>
      <button
        className={`notif-bell-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span className="notif-panel-title">Notifications</span>
            {unread > 0 && (
              <button className="notif-mark-read" onClick={markAllRead}>
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
                  <div className="notif-item-time">
                    {timeAgo(n.created_at || n.timestamp)}
                  </div>
                  {!n.read && <span className="notif-dot" />}
                </div>
              ))
            )}
          </div>
          <div className="notif-panel-footer">
            <button className="notif-view-all" onClick={() => setOpen(false)}>
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
