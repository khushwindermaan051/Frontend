import { useEffect, useState } from 'react';
import { dashboardAPI } from '../services/api';

const CACHE_TTL = 5 * 60 * 1000;
const COUNTS_KEY = 'dash_counts';
const ALERTS_KEY = 'dash_alerts';

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
  } catch {
    /* ignore quota / private mode */
  }
}

async function fetchCount(table) {
  try {
    const res = await dashboardAPI.getTableCount(table);
    return res.count || 0;
  } catch {
    return 0;
  }
}

async function fetchExpiryAlerts(table) {
  try {
    const res = await dashboardAPI.getExpiryAlerts(table);
    return res.alerts || [];
  } catch {
    return [];
  }
}

// Loads table-counts + expiry alerts for the dashboard home view.
// Reads from sessionStorage first (instant paint), then revalidates.
// Falls back to per-table counts if the batch endpoint fails.
export function useDashboardData(allTables) {
  const [tableCounts, setTableCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  useEffect(() => {
    const cached = readCache(COUNTS_KEY);
    if (cached) {
      setTableCounts(cached);
      setLoadingCounts(false);
    }
    dashboardAPI
      .getTableCounts()
      .then((res) => {
        const counts = res && typeof res.counts === 'object' ? res.counts : res;
        if (counts && typeof counts === 'object') {
          setTableCounts(counts);
          writeCache(COUNTS_KEY, counts);
        }
      })
      .catch(() => {
        if (cached) return;
        Promise.all(
          allTables.map((t) => fetchCount(t).then((c) => ({ table: t, count: c }))),
        ).then((results) => {
          const counts = Object.fromEntries(results.map(({ table, count }) => [table, count]));
          setTableCounts(counts);
          writeCache(COUNTS_KEY, counts);
        });
      })
      .finally(() => setLoadingCounts(false));
  }, [allTables]);

  useEffect(() => {
    const cached = readCache(ALERTS_KEY);
    if (cached) {
      setAlerts(cached);
      setLoadingAlerts(false);
    }
    Promise.all(allTables.map((t) => fetchExpiryAlerts(t)))
      .then((results) => {
        const flat = results.flat();
        setAlerts(flat);
        writeCache(ALERTS_KEY, flat);
      })
      .catch(() => {})
      .finally(() => setLoadingAlerts(false));
  }, [allTables]);

  return { tableCounts, loadingCounts, alerts, loadingAlerts };
}
