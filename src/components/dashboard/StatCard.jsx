import { memo } from 'react';

function StatCardImpl({ value, label, accentColor }) {
  return (
    <div
      className="summary-card"
      style={accentColor ? { borderTopColor: accentColor } : undefined}
    >
      <span className="summary-value">{value}</span>
      <span className="summary-label">{label}</span>
    </div>
  );
}

export default memo(StatCardImpl);
