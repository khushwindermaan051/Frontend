import { useMemo } from 'react';
import { useInventoryCharts } from '../../hooks/useInventoryCharts';
import { formatLabel } from '../../utils/formatters';
import HorizontalBar from './HorizontalBar';
import ChartCard from './ChartCard';

export default function InventoryCharts() {
  const { data, loading } = useInventoryCharts();

  const summary = useMemo(() => {
    if (!data) return null;
    const { platform_totals, city_distribution, top_products } = data;
    return {
      platform_totals,
      city_distribution,
      top_products,
      maxPlatformQty: Math.max(...platform_totals.map((p) => p.total_qty), 1),
      maxCityQty: Math.max(...city_distribution.map((c) => c.qty), 1),
      maxProductQty: Math.max(...top_products.map((p) => p.qty), 1),
      totalStock: platform_totals.reduce((s, p) => s + p.total_qty, 0),
      totalSKUs: platform_totals.reduce((s, p) => s + p.sku_count, 0),
    };
  }, [data]);

  if (loading) {
    return (
      <div className="charts-panel">
        <div className="charts-panel-header">
          <h3>Inventory Overview</h3>
        </div>
        <div className="alerts-loading">
          <div className="loader" /> Loading inventory data...
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const {
    platform_totals,
    city_distribution,
    top_products,
    maxPlatformQty,
    maxCityQty,
    maxProductQty,
    totalStock,
    totalSKUs,
  } = summary;

  return (
    <div className="charts-panel">
      <div className="charts-panel-header">
        <h3>Inventory Overview</h3>
        <div className="charts-summary-badges">
          <span className="charts-badge">{totalStock.toLocaleString()} total units</span>
          <span className="charts-badge">{totalSKUs.toLocaleString()} SKU entries</span>
        </div>
      </div>

      <div className="charts-grid">
        <ChartCard title="Stock by Platform">
          {platform_totals.map((p) => (
            <HorizontalBar
              key={p.platform}
              label={
                <>
                  <span className="chart-bar-dot" style={{ background: p.color }} />
                  {formatLabel(p.platform)}
                </>
              }
              value={p.total_qty}
              max={maxPlatformQty}
              color={p.color}
            />
          ))}
        </ChartCard>

        <ChartCard title="Stock by City (Top 15)">
          {city_distribution.length === 0 ? (
            <div className="plat-empty" style={{ padding: '20px' }}>
              No city data available
            </div>
          ) : (
            city_distribution.map((c, i) => (
              <HorizontalBar
                key={c.city}
                labelClassName="chart-bar-label chart-bar-label-city"
                label={
                  <>
                    <span className="chart-bar-rank">{i + 1}</span>
                    {c.city}
                  </>
                }
                value={c.qty}
                max={maxCityQty}
                color={`hsl(${220 + i * 8}, 65%, ${50 + i * 2}%)`}
              />
            ))
          )}
        </ChartCard>

        <ChartCard title="Top Products by Stock" full>
          {top_products.map((p, i) => (
            <HorizontalBar
              key={`${p.platform}-${i}`}
              labelClassName="chart-bar-label chart-bar-label-product"
              label={
                <>
                  <span className="chart-bar-platform-tag" style={{ background: p.color }}>
                    {p.platform[0].toUpperCase()}
                  </span>
                  <span className="chart-bar-product-name">{p.product}</span>
                </>
              }
              value={p.qty}
              max={maxProductQty}
              color={p.color}
            />
          ))}
        </ChartCard>
      </div>
    </div>
  );
}
