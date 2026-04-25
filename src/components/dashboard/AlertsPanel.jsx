import { useMemo } from 'react';
import { formatLabel } from '../../utils/formatters';

const ALERT_DAYS = 7;

export default function AlertsPanel({ alerts, loading, onTableClick, getSectionKey }) {
  const summary = useMemo(() => {
    const expired = alerts.filter((a) => a.type === 'expired').reduce((s, a) => s + a.count, 0);
    const expiring = alerts.filter((a) => a.type === 'expiring').reduce((s, a) => s + a.count, 0);

    const grouped = {};
    alerts.forEach((a) => {
      if (!grouped[a.table]) {
        grouped[a.table] = { table: a.table, expired: 0, expiring: 0, columns: [] };
      }
      if (a.type === 'expired') grouped[a.table].expired += a.count;
      else grouped[a.table].expiring += a.count;
      if (!grouped[a.table].columns.includes(a.column)) {
        grouped[a.table].columns.push(a.column);
      }
    });
    return { expired, expiring, tableAlerts: Object.values(grouped) };
  }, [alerts]);

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

  const { expired, expiring, tableAlerts } = summary;

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
          <div className="alert-summary-row">
            <div className="alert-summary-block expired">
              <span className="asb-count">{expired.toLocaleString()}</span>
              <span className="asb-label">Expired</span>
            </div>
            <div className="alert-summary-block warning">
              <span className="asb-count">{expiring.toLocaleString()}</span>
              <span className="asb-label">Expiring Soon</span>
            </div>
            <div className="alert-summary-block info">
              <span className="asb-count">{ALERT_DAYS}</span>
              <span className="asb-label">Day Window</span>
            </div>
          </div>

          <div className="alert-blocks-grid">
            {tableAlerts.map((ta) => {
              const hasExpired = ta.expired > 0;
              const hasExpiring = ta.expiring > 0;
              const total = ta.expired + ta.expiring;
              return (
                <button
                  key={ta.table}
                  className={`alert-block ${hasExpired ? 'expired' : 'warning'}`}
                  onClick={() => onTableClick(getSectionKey(ta.table), ta.table)}
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
                  <span className="ab-col">{ta.columns.map(formatLabel).join(', ')}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
