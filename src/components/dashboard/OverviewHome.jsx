import { useMemo } from 'react';
import { formatLabel } from '../../utils/formatters';
import StatCard from './StatCard';
import AlertsPanel from './AlertsPanel';
import InventoryCharts from '../charts/InventoryCharts';

export default function OverviewHome({
  sections,
  allTables,
  tableCounts,
  loadingCounts,
  alerts,
  loadingAlerts,
  onTableClick,
  getSectionKey,
}) {
  const totalRecords = useMemo(
    () => Object.values(tableCounts).reduce((a, b) => a + b, 0),
    [tableCounts],
  );

  return (
    <div className="overview">
      <AlertsPanel
        alerts={alerts}
        loading={loadingAlerts}
        onTableClick={onTableClick}
        getSectionKey={getSectionKey}
      />

      <InventoryCharts />

      <div className="summary-row">
        <StatCard value={allTables.length} label="Total Tables" />
        <StatCard value={totalRecords.toLocaleString()} label="Total Records" />
        {Object.entries(sections).map(([key, section]) => {
          const count = section.tables.reduce(
            (sum, t) => sum + (tableCounts[t] || 0),
            0,
          );
          return (
            <StatCard
              key={key}
              value={count.toLocaleString()}
              label={section.label}
              accentColor={section.color}
            />
          );
        })}
      </div>

      {Object.entries(sections).map(([key, section]) => (
        <div key={key} className="overview-section">
          <div className="overview-section-header">
            <div className="overview-section-dot" style={{ background: section.color }} />
            <h3>{section.label}</h3>
            <span className="overview-section-count">{section.tables.length} tables</span>
          </div>
          <div className="overview-table-grid">
            {section.tables.map((table) => (
              <button
                key={table}
                className="overview-table-card"
                onClick={() => onTableClick(key, table)}
              >
                <span className="otc-name">{formatLabel(table)}</span>
                <span className="otc-count">
                  {loadingCounts ? '...' : (tableCounts[table] || 0).toLocaleString()}
                  <span className="otc-rows"> rows</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
