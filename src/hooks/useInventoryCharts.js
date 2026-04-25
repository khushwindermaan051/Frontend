import { useEffect, useState } from 'react';
import { dashboardAPI } from '../services/api';

const CACHE_TTL = 5 * 60 * 1000;
const CHARTS_KEY = 'dash_charts';

function readCache() {
  try {
    const raw = sessionStorage.getItem(CHARTS_KEY);
    if (!raw) return null;
    const { data, time } = JSON.parse(raw);
    return Date.now() - time < CACHE_TTL ? data : null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CHARTS_KEY, JSON.stringify({ data, time: Date.now() }));
  } catch {
    /* ignore quota / private mode */
  }
}

export function useInventoryCharts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }
    dashboardAPI
      .getInventoryCharts()
      .then((d) => {
        setData(d);
        writeCache(d);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
