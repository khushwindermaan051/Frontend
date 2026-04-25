import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE } from '../services/api';

const POLL_MS = 60_000;

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    let cancelled = false;
    const fetchNotifs = () => {
      fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          if (cancelled) return;
          const list = data.notifications || data || [];
          setNotifications(list);
          setUnread(data.unread_count ?? list.filter((n) => !n.read).length);
        })
        .catch(() => {});
    };
    fetchNotifs();
    const id = setInterval(fetchNotifs, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const markAllRead = useCallback(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/api/notifications/mark-all-read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }, []);

  return { notifications, unread, markAllRead };
}
