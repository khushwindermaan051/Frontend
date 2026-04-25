export default function ChartCard({ title, full = false, children }) {
  return (
    <div className={`chart-card ${full ? 'chart-card-full' : ''}`}>
      <div className="chart-card-title">{title}</div>
      <div className="chart-bars">{children}</div>
    </div>
  );
}
