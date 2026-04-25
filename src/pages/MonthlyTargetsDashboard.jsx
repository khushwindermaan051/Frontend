import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Users } from 'lucide-react';
import { monthlyTargetsAPI } from '../services/api';
import { formatDate, formatNum, formatPct, pctClass } from '../utils/formatters';
import { Sidebar, NavItem, JivoBrand } from '../components/layout/Sidebar';
import { Topbar, BreadcrumbLink, BreadcrumbSep, BreadcrumbCurrent } from '../components/layout/Topbar';

function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonthISO(s) {
  const [y, m] = String(s || '').split('-');
  return { month: Number(m), year: Number(y) };
}

function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function MonthlyTargetsDashboard() {
  const navigate = useNavigate();
  const [monthISO, setMonthISO] = useState(currentMonthISO());
  const { month, year } = parseMonthISO(monthISO);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await monthlyTargetsAPI.dashboard({ month, year });
        if (!cancelled) setData(res);
      } catch (e) {
        if (cancelled) return;
        setData(null);
        setError(e.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  const exportCSV = () => {
    if (!data) return;
    const header = [
      'SECTION',
      'FORMAT',
      'TYPE',
      'DATE',
      'TARGETS',
      'DONE LTRS',
      'DONE VALUE',
      'ACHIEVED %',
      'EST.LTR',
      'EST.VALUE',
      'EST. LTR%',
      'LAST MONTH',
      'GROWTH',
      'GROWTH %',
    ];
    const out = [header];
    for (const section of ['premium', 'commodity']) {
      const block = data[section];
      if (!block) continue;
      for (const r of block.rows) {
        out.push([
          section.toUpperCase(),
          r.format,
          r.type,
          formatDate(r.date),
          r.targets ?? '',
          r.done_ltrs ?? '',
          r.done_value ?? '',
          r.achieved_pct ?? '',
          r.est_ltr ?? '',
          r.est_value ?? '',
          r.est_ltr_pct ?? '',
          r.last_month ?? '',
          r.growth ?? '',
          r.growth_pct ?? '',
        ]);
      }
      out.push([
        section.toUpperCase() + ' TOTAL',
        '',
        '',
        '',
        block.total.targets,
        block.total.done_ltrs,
        block.total.done_value,
        block.total.achieved_pct,
        block.total.est_ltr,
        block.total.est_value,
        block.total.est_ltr_pct,
        block.total.last_month,
        block.total.growth,
        block.total.growth_pct,
      ]);
    }
    downloadCSV(`monthly-targets-${monthISO}.csv`, out);
  };

  return (
    <div className="app-layout">
      <Sidebar
        brand={<JivoBrand onClick={() => navigate('/dashboard')} />}
        variant="dist-sidebar"
      >
        <NavItem
          icon={<Users size={15} />}
          label="Distributors"
          onClick={() => navigate('/distributors')}
          className="plat-nav-item"
        />
        <NavItem
          icon={<BarChart3 size={15} />}
          label="Monthly Targets"
          active
          className="plat-nav-item"
        />
        <div className="nav-divider" />
      </Sidebar>

      <div className="main-area">
        <Topbar>
          <BreadcrumbLink onClick={() => navigate('/dashboard')} title="Go to Main Dashboard">
            Dashboard
          </BreadcrumbLink>
          <BreadcrumbSep />
          <BreadcrumbCurrent>Monthly Targets</BreadcrumbCurrent>
        </Topbar>

        <div className="mt-dash-page">
          <div className="mt-dash-inner">
            <div className="mt-dash-header">
              <h1 className="mt-dash-title">Monthly Targets — All Platforms</h1>
              <div className="mt-dash-controls">
                <label className="lr-field">
                  <span>Month</span>
                  <input
                    type="month"
                    value={monthISO}
                    onChange={(e) => setMonthISO(e.target.value)}
                  />
                </label>
                <button
                  className="plat-btn plat-btn-secondary"
                  onClick={exportCSV}
                  disabled={!data || loading}
                >
                  Export CSV
                </button>
              </div>
            </div>

            {error && <div className="lr-error">{error}</div>}

            {loading && !data ? (
              <div className="plat-empty">
                <div className="loader" /> Loading…
              </div>
            ) : !data ? (
              <div className="plat-empty">No data.</div>
            ) : (
              <>
                <DashboardSection
                  title="SECONDARY TARGET SHEET FOR PREMIUM"
                  block={data.premium}
                  monthISO={monthISO}
                />
                <div style={{ height: 24 }} />
                <DashboardSection
                  title="SECONDARY TARGET SHEET FOR COMMODITY"
                  block={data.commodity}
                  monthISO={monthISO}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSection({ title, block, monthISO }) {
  if (!block) return null;

  return (
    <div className="card mt-card">
      <div className="mt-section-title-bar">{title}</div>

      <div className="table-wrapper">
        <table className="data-table mt-table mt-dashboard-table">
          <thead>
            <tr>
              <th className="mt-sticky-col">FORMAT</th>
              <th>TYPE</th>
              <th>DATE</th>
              <th>TARGETS</th>
              <th>DONE LTRS</th>
              <th>DONE VALUE</th>
              <th>ACHIEVED %</th>
              <th>Est.LTR</th>
              <th>Est.Value</th>
              <th>Est. LTR%</th>
              <th>LAST MONTH</th>
              <th>GROWTH</th>
              <th>GROWTH %</th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r) => (
              <tr key={`${r.slug}-${r.item_head}-${monthISO}`}>
                <td className="mt-sticky-col" style={{ fontWeight: 600 }}>
                  {r.platform_name || r.format}
                </td>
                <td>{r.type}</td>
                <td>{formatDate(r.date)}</td>
                <td>
                  {r.targets == null ? (
                    <span className="mt-no-target">No target</span>
                  ) : (
                    formatNum(r.targets)
                  )}
                </td>
                <td>{formatNum(r.done_ltrs)}</td>
                <td>{formatNum(r.done_value)}</td>
                <td className={pctClass(r.achieved_pct)}>
                  {formatPct(r.achieved_pct)}
                </td>
                <td>{formatNum(r.est_ltr)}</td>
                <td>{formatNum(r.est_value)}</td>
                <td className={pctClass(r.est_ltr_pct)}>
                  {formatPct(r.est_ltr_pct)}
                </td>
                <td>{formatNum(r.last_month)}</td>
                <td className={Number(r.growth) < 0 ? 'mt-pct-red' : ''}>
                  {formatNum(r.growth)}
                </td>
                <td className={pctClass(r.growth_pct, { negativeIsBad: true })}>
                  {formatPct(r.growth_pct)}
                </td>
              </tr>
            ))}
            <tr className="mt-grand-total-row">
              <td className="mt-sticky-col" style={{ fontWeight: 700 }}>
                GRAND TOTAL
              </td>
              <td />
              <td />
              <td>{formatNum(block.total.targets)}</td>
              <td>{formatNum(block.total.done_ltrs)}</td>
              <td>{formatNum(block.total.done_value)}</td>
              <td className={pctClass(block.total.achieved_pct)}>
                {formatPct(block.total.achieved_pct)}
              </td>
              <td>{formatNum(block.total.est_ltr)}</td>
              <td>{formatNum(block.total.est_value)}</td>
              <td className={pctClass(block.total.est_ltr_pct)}>
                {formatPct(block.total.est_ltr_pct)}
              </td>
              <td>{formatNum(block.total.last_month)}</td>
              <td
                className={Number(block.total.growth) < 0 ? 'mt-pct-red' : ''}
              >
                {formatNum(block.total.growth)}
              </td>
              <td
                className={pctClass(block.total.growth_pct, {
                  negativeIsBad: true,
                })}
              >
                {formatPct(block.total.growth_pct)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
