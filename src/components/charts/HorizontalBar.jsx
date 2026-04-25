import { memo } from 'react';

function HorizontalBarImpl({ label, value, max, color, labelClassName = 'chart-bar-label' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="chart-bar-row">
      <div className={labelClassName}>{label}</div>
      <div className="chart-bar-track">
        <div
          className="chart-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="chart-bar-value">{value.toLocaleString()}</div>
    </div>
  );
}

export default memo(HorizontalBarImpl);
