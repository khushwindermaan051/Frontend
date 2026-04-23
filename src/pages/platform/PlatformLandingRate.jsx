import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { landingRateAPI } from '../../lib/api';

const PAGE_SIZE = 50;

function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(val) {
  if (!val) return '-';
  const s = String(val);
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (!m) return s;
  const date = new Date(`${m[1]}-${m[2]}-01`);
  return date.toLocaleString(undefined, { month: 'short', year: 'numeric' });
}

export default function PlatformLandingRate() {
  const config = usePlatform();

  const [mode, setMode] = useState('effective');
  const [month, setMonth] = useState(currentMonthISO());
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef(null);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [skus, setSkus] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState({
    sku_code: '',
    sku_name: '',
    landing_rate: '',
    basic_rate: '',
    month: currentMonthISO(),
    isNew: false,
  });

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(0);
    }, 350);
  };

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await landingRateAPI.list(config.slug, {
        mode,
        month: `${month}-01`,
        search: debouncedSearch,
        page,
        page_size: PAGE_SIZE,
      });
      setRows(result.data || []);
      setTotal(result.count || 0);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(e.message || 'Failed to load landing rates');
    }
    setLoading(false);
  }, [config.slug, mode, month, debouncedSearch, page]);

  const loadSkus = useCallback(async () => {
    try {
      const result = await landingRateAPI.listSkus(config.slug);
      setSkus(result.skus || []);
    } catch {
      setSkus([]);
    }
  }, [config.slug]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    loadSkus();
  }, [loadSkus]);

  const skuOptions = useMemo(
    () =>
      skus.map((s) => ({
        value: s.sku_code,
        label: `${s.sku_code} — ${s.sku_name}`,
        name: s.sku_name,
      })),
    [skus],
  );

  const openAdd = () => {
    setForm({
      sku_code: '',
      sku_name: '',
      landing_rate: '',
      basic_rate: '',
      month: currentMonthISO(),
      isNew: false,
    });
    setSaveError('');
    setAddOpen(true);
  };

  const pickSku = (code) => {
    if (code === '__new__') {
      setForm((f) => ({ ...f, isNew: true, sku_code: '', sku_name: '' }));
      return;
    }
    const match = skus.find((s) => s.sku_code === code);
    setForm((f) => ({
      ...f,
      isNew: false,
      sku_code: code,
      sku_name: match?.sku_name || '',
    }));
  };

  const handleSave = async () => {
    setSaveError('');
    if (!form.sku_code.trim() || !form.sku_name.trim()) {
      setSaveError('SKU code and name are required.');
      return;
    }
    if (form.landing_rate === '' || form.basic_rate === '') {
      setSaveError('Landing rate and basic rate are required.');
      return;
    }
    if (!form.month) {
      setSaveError('Month is required.');
      return;
    }
    setSaving(true);
    try {
      await landingRateAPI.add(config.slug, {
        sku_code: form.sku_code.trim(),
        sku_name: form.sku_name.trim(),
        landing_rate: Number(form.landing_rate),
        basic_rate: Number(form.basic_rate),
        month: `${form.month}-01`,
      });
      setAddOpen(false);
      await Promise.all([loadRows(), loadSkus()]);
    } catch (e) {
      setSaveError(e.message || 'Failed to save');
    }
    setSaving(false);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="plat-content">
      <div className="card">
        <div className="lr-toolbar">
          <div className="lr-toolbar-left">
            <div className="lr-mode-tabs">
              <button
                className={`lr-mode-tab ${mode === 'effective' ? 'active' : ''}`}
                onClick={() => {
                  setMode('effective');
                  setPage(0);
                }}
                style={mode === 'effective' ? { borderBottomColor: config.color, color: config.color } : undefined}
              >
                Effective
              </button>
              <button
                className={`lr-mode-tab ${mode === 'history' ? 'active' : ''}`}
                onClick={() => {
                  setMode('history');
                  setPage(0);
                }}
                style={mode === 'history' ? { borderBottomColor: config.color, color: config.color } : undefined}
              >
                History
              </button>
            </div>

            {mode === 'effective' && (
              <label className="lr-field">
                <span>As of month</span>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
            )}

            <input
              type="text"
              className="lr-search"
              placeholder="Search SKU code or name..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <button
            className="lr-add-btn"
            style={{ background: config.color }}
            onClick={openAdd}
          >
            + Add entry
          </button>
        </div>

        <div className="lr-meta">
          <span>
            Platform format: <strong>{config.name}</strong>
          </span>
          <span>·</span>
          <span>
            {mode === 'effective'
              ? `Rates in force for ${formatMonth(`${month}-01`)} (falls back to previous months where newer data is absent)`
              : 'All inserted rows — newest first. Inserts are append-only for audit history.'}
          </span>
        </div>

        {error && <div className="lr-error">{error}</div>}

        {loading ? (
          <div className="plat-empty">
            <div className="loader" /> Loading landing rates...
          </div>
        ) : rows.length === 0 ? (
          <div className="plat-empty">
            No landing rates found for {config.name}. Click "+ Add entry" to insert the first record.
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>SKU Code</th>
                    <th>SKU Name</th>
                    <th>Landing Rate</th>
                    <th>Basic Rate</th>
                    <th>Format</th>
                    <th>Month</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.sku_code}-${r.month}-${i}`}>
                      <td className="row-num">{page * PAGE_SIZE + i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{r.sku_code}</td>
                      <td>{r.sku_name}</td>
                      <td>
                        {r.landing_rate != null
                          ? Number(r.landing_rate).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : '-'}
                      </td>
                      <td>
                        {r.basic_rate != null
                          ? Number(r.basic_rate).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : '-'}
                      </td>
                      <td>{r.format || '-'}</td>
                      <td>{formatMonth(r.month)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pg-btn"
                  disabled={page === 0}
                  onClick={() => setPage(0)}
                >
                  &laquo;
                </button>
                <button
                  className="pg-btn"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  &lsaquo;
                </button>
                <span className="pg-info">
                  {page + 1} / {totalPages}
                  <span className="pg-total"> · {total} rows</span>
                </span>
                <button
                  className="pg-btn"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  &rsaquo;
                </button>
                <button
                  className="pg-btn"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(totalPages - 1)}
                >
                  &raquo;
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {addOpen && (
        <div className="lr-modal-backdrop" onClick={() => !saving && setAddOpen(false)}>
          <div className="lr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lr-modal-header" style={{ borderBottomColor: config.color }}>
              <h3>Add monthly landing rate</h3>
              <button
                className="lr-modal-close"
                onClick={() => !saving && setAddOpen(false)}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <div className="lr-modal-body">
              <div className="lr-form-row">
                <label className="lr-field">
                  <span>SKU</span>
                  <select
                    value={form.isNew ? '__new__' : form.sku_code}
                    onChange={(e) => pickSku(e.target.value)}
                  >
                    <option value="">Select existing SKU…</option>
                    {skuOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                    <option value="__new__">+ Add new SKU…</option>
                  </select>
                </label>
              </div>

              <div className="lr-form-grid">
                <label className="lr-field">
                  <span>SKU code {form.isNew && <em>(new)</em>}</span>
                  <input
                    type="text"
                    value={form.sku_code}
                    disabled={!form.isNew && !!form.sku_code}
                    onChange={(e) => setForm((f) => ({ ...f, sku_code: e.target.value }))}
                    placeholder="e.g. BLK-12345"
                  />
                </label>
                <label className="lr-field">
                  <span>SKU name {form.isNew && <em>(new)</em>}</span>
                  <input
                    type="text"
                    value={form.sku_name}
                    disabled={!form.isNew && !!form.sku_code}
                    onChange={(e) => setForm((f) => ({ ...f, sku_name: e.target.value }))}
                    placeholder="Product name"
                  />
                </label>
                <label className="lr-field">
                  <span>Landing rate</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.landing_rate}
                    onChange={(e) => setForm((f) => ({ ...f, landing_rate: e.target.value }))}
                    placeholder="0.00"
                  />
                </label>
                <label className="lr-field">
                  <span>Basic rate</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.basic_rate}
                    onChange={(e) => setForm((f) => ({ ...f, basic_rate: e.target.value }))}
                    placeholder="0.00"
                  />
                </label>
                <label className="lr-field">
                  <span>Month</span>
                  <input
                    type="month"
                    value={form.month}
                    onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
                  />
                </label>
                <label className="lr-field">
                  <span>Format</span>
                  <input type="text" value={config.name} disabled />
                </label>
              </div>

              {saveError && <div className="lr-error">{saveError}</div>}

              <div className="lr-hint">
                Entries are append-only — saving inserts a new row without overwriting prior
                months. Rows take effect from the chosen month; earlier months keep their
                previously-inserted rates.
              </div>
            </div>

            <div className="lr-modal-footer">
              <button
                className="plat-btn plat-btn-secondary"
                onClick={() => setAddOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="lr-add-btn"
                style={{ background: config.color }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Insert entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
