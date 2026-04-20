import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlatform } from '../../context/PlatformContext';
import { platformAPI } from '../../lib/api';

export default function PlatformDashboard() {
  const config = usePlatform();
  const [stats, setStats] = useState({
    inventory: 0,
    sells: 0,
    openPOs: 0,
    activeTrucks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    platformAPI
      .getStats(config.slug)
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [config]);

  return (
    <>
      <div className="plat-page-header">
        <h1>{config.name} Dashboard</h1>
        <p>Overview of {config.name} platform operations</p>
      </div>
      <div className="plat-content">
        <div className="plat-cards">
          <Link to={`/platform/${config.slug}/po`} className="plat-card">
            <span className="plat-card-value">
              {loading ? '...' : stats.openPOs.toLocaleString()}
            </span>
            <span className="plat-card-label">Purchase Orders</span>
          </Link>
          <div className="plat-card">
            <span className="plat-card-value">
              {loading ? '...' : stats.inventory.toLocaleString()}
            </span>
            <span className="plat-card-label">Inventory Items</span>
          </div>
          <div className="plat-card">
            <span className="plat-card-value">
              {loading ? '...' : stats.sells.toLocaleString()}
            </span>
            <span className="plat-card-label">Secondary Sells</span>
          </div>
          <Link
            to={`/platform/${config.slug}/truck-loading`}
            className="plat-card"
          >
            <span className="plat-card-value">
              {loading ? '...' : stats.activeTrucks}
            </span>
            <span className="plat-card-label">Active Truck Loadings</span>
          </Link>
        </div>

        <div className="plat-quick-links">
          <Link to={`/platform/${config.slug}/po`} className="plat-quick-link">
            <span className="plat-quick-link-icon">&#128230;</span>
            PO &amp; Stock Management
          </Link>
          <Link
            to={`/platform/${config.slug}/truck-loading`}
            className="plat-quick-link"
          >
            <span className="plat-quick-link-icon">&#128666;</span>
            Truck Loading
          </Link>
          <Link
            to={`/platform/${config.slug}/dispatches`}
            className="plat-quick-link"
          >
            <span className="plat-quick-link-icon">&#128203;</span>
            Dispatch History
          </Link>
        </div>
      </div>
    </>
  );
}
