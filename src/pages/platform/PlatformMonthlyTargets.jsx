import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { monthlyTargetsAPI } from '../../services/api';
import { formatDate, formatNum, formatPct, pctClass } from '../../utils/formatters';

// Platforms that are OUT of scope per spec §8.1. Everyone else is supported.
const OUT_OF_SCOPE = new Set(['amazon', 'jiomart', 'flipkart_grocery']);

const ITEM_HEADS = ['PREMIUM', 'COMMODITY'];

function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonthISO(s) {
  const [y, m] = String(s || '').split('-');
  return { month: Number(m), year: Number(y) };
}

function isCurrentMonth(month, year) {
  const d = new Date();
  return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year);
}

export default function PlatformMonthlyTargets() {
  const config = usePlatform();
  const slug = config.slug;
  const outOfScope = OUT_OF_SCOPE.has(slug);

  const [monthISO, setMonthISO] = useState(currentMonthISO());
  const { month, year } = parseMonthISO(monthISO);
  const onCurrentMonth = isCurrentMonth(month, year);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [saving, setSaving] = useState({}); // keyed by item_head
  const [saveError, setSaveError] = useState({}); // keyed by item_head
  const [draftTargets, setDraftTargets] = useState({}); // keyed by item_head

  const [refreshingId, setRefreshingId] = useState(null);

  // Edit-Target modal state — surfaces the current target, a new-target
  // input, and an optional reason for the audit log in month_target_logs.
  const [editRow, setEditRow] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const byItemHead = useMemo(() => {
    const map = {};
    for (const r of rows) {
      const ih = String(r.item_head || '').toUpperCase();
      if (ih) map[ih] = r;
    }
    return map;
  }, [rows]);

  const loadRows = useCallback(async () => {
    if (outOfScope) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await monthlyTargetsAPI.list(slug, { month, year });
      setRows(res.data || []);
    } catch (e) {
      setRows([]);
      setError(e.message || 'Failed to load monthly targets');
    }
    setLoading(false);
  }, [slug, month, year, outOfScope]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleSetTarget = async (itemHead) => {
    setSaveError((s) => ({ ...s, [itemHead]: '' }));
    const raw = draftTargets[itemHead];
    const targets = raw === '' || raw == null ? NaN : Number(raw);
    if (!Number.isFinite(targets) || targets < 0) {
      setSaveError((s) => ({
        ...s,
        [itemHead]: 'Enter a target (number ≥ 0).',
      }));
      return;
    }
    setSaving((s) => ({ ...s, [itemHead]: true }));
    try {
      await monthlyTargetsAPI.create(slug, {
        item_head: itemHead,
        targets,
        month,
        year,
      });
      setDraftTargets((d) => ({ ...d, [itemHead]: '' }));
      await loadRows();
    } catch (e) {
      // 409: the backend returns the existing row — merge it in so we don't
      // need a reload, and show an informative message.
      if (e.status === 409 && e.payload?.existing) {
        setRows((prev) => {
          const others = prev.filter(
            (r) => String(r.item_head).toUpperCase() !== itemHead,
          );
          return [...others, e.payload.existing];
        });
      }
      setSaveError((s) => ({ ...s, [itemHead]: e.message || 'Save failed' }));
    }
    setSaving((s) => ({ ...s, [itemHead]: false }));
  };

  const handleRefresh = async (rowId) => {
    setRefreshingId(rowId);
    try {
      await monthlyTargetsAPI.refresh(slug, rowId);
      await loadRows();
    } catch (e) {
      setError(e.message || 'Refresh failed');
    }
    setRefreshingId(null);
  };

  const openEdit = (row) => {
    setEditRow(row);
    setEditDraft(String(row.targets ?? ''));
    setEditReason('');
    setEditError('');
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditRow(null);
    setEditDraft('');
    setEditReason('');
    setEditError('');
  };

  const handleEditSave = async () => {
    if (!editRow) return;
    setEditError('');
    const nextRaw = editDraft;
    const next = nextRaw === '' || nextRaw == null ? NaN : Number(nextRaw);
    if (!Number.isFinite(next) || next < 0) {
      setEditError('Enter a target (number ≥ 0).');
      return;
    }
    if (Number(next) === Number(editRow.targets)) {
      setEditError('New target equals the existing value — nothing to update.');
      return;
    }
    setEditSaving(true);
    try {
      await monthlyTargetsAPI.update(slug, editRow.id, {
        targets: next,
        reason: editReason.trim() || undefined,
      });
      setEditSaving(false);
      setEditRow(null);
      setEditDraft('');
      setEditReason('');
      await loadRows();
    } catch (e) {
      setEditError(e.message || 'Update failed');
      setEditSaving(false);
    }
  };

  if (outOfScope) {
    return (
      <div className="plat-content">
        <div className="card">
          <div className="plat-empty">
            Monthly Targets is not available for <strong>{config.name}</strong>.
            <div className="mt-hint">
              In-scope platforms: Blinkit, Swiggy, Zepto, BigBasket, Flipkart,
              Zomato, CityMall. Amazon, JioMart and Flipkart Grocery are
              deliberately out of scope.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="plat-content">
      <div className="card">
        <div className="lr-toolbar">
          <div className="lr-toolbar-left">
            <label className="lr-field">
              <span>Reporting month</span>
              <input
                type="month"
                value={monthISO}
                onChange={(e) => setMonthISO(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="lr-meta">
          <span>
            Platform: <strong>{config.name}</strong>
          </span>
          <span>·</span>
          <span>
            {onCurrentMonth
              ? 'Current month — targets can still be set, live data refreshes from SecMaster / master_po.'
              : 'Historical month — row is frozen; refresh is disabled.'}
          </span>
        </div>

        {error && <div className="lr-error">{error}</div>}

        {loading ? (
          <div className="plat-empty">
            <div className="loader" /> Loading…
          </div>
        ) : (
          ITEM_HEADS.map((ih) => {
            const row = byItemHead[ih];
            return (
              <TargetSection
                key={ih}
                itemHead={ih}
                row={row}
                monthISO={monthISO}
                onCurrentMonth={onCurrentMonth}
                draft={draftTargets[ih] ?? ''}
                onDraftChange={(v) =>
                  setDraftTargets((d) => ({ ...d, [ih]: v }))
                }
                onSave={() => handleSetTarget(ih)}
                saving={!!saving[ih]}
                saveError={saveError[ih] || ''}
                onRefresh={() => row && handleRefresh(row.id)}
                refreshing={refreshingId === row?.id}
                onEdit={() => row && openEdit(row)}
                platformColor={config.color}
              />
            );
          })
        )}
      </div>

      {editRow && (
        <EditTargetModal
          row={editRow}
          draft={editDraft}
          onDraftChange={setEditDraft}
          reason={editReason}
          onReasonChange={setEditReason}
          saving={editSaving}
          error={editError}
          onCancel={closeEdit}
          onSave={handleEditSave}
          platformColor={config.color}
          platformName={config.name}
        />
      )}
    </div>
  );
}

function TargetSection({
  itemHead,
  row,
  onCurrentMonth,
  draft,
  onDraftChange,
  onSave,
  saving,
  saveError,
  onRefresh,
  refreshing,
  onEdit,
  platformColor,
}) {
  const hasRow = !!row;

  return (
    <div className="mt-section">
      <div className="mt-section-head">
        <h3 className="mt-section-title">
          Secondary target sheet for{' '}
          <span style={{ color: platformColor }}>{itemHead}</span>
        </h3>
        {hasRow && onCurrentMonth && (
          <div className="mt-section-actions">
            <button
              className="plat-btn plat-btn-secondary"
              onClick={onEdit}
              title="Correct the target if it was entered wrong. The old value will be saved to the audit log."
            >
              ✎ Edit target
            </button>
            <button
              className="plat-btn plat-btn-secondary"
              onClick={onRefresh}
              disabled={refreshing}
              title="Recompute derived columns from the latest source data"
            >
              {refreshing ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>
        )}
      </div>

      {!hasRow ? (
        <div className="mt-empty-target">
          <p>No target set for this month yet.</p>
          {onCurrentMonth ? (
            <div className="mt-set-target">
              <label className="lr-field">
                <span>Target (litres)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 50000"
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  disabled={saving}
                />
              </label>
              <button
                className="lr-add-btn"
                style={{ background: platformColor }}
                onClick={onSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Set target'}
              </button>
              {saveError && <div className="lr-error">{saveError}</div>}
              <p className="mt-hint">
                Setting the target creates the monthly row. Once saved, the
                target value is locked — use the Refresh button to pull updated
                sales data.
              </p>
            </div>
          ) : (
            <p className="mt-hint">
              Target must be set during the reporting month. This month is
              already closed.
            </p>
          )}
        </div>
      ) : (
        <TargetRow row={row} />
      )}
    </div>
  );
}

function TargetRow({ row }) {
  return (
    <div className="table-wrapper">
      <table className="data-table mt-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Targets</th>
            <th>Done Ltrs</th>
            <th>Done Value</th>
            <th>Achieved %</th>
            <th>Est. LTR</th>
            <th>Est. Value</th>
            <th>Est. LTR %</th>
            <th>Last Month</th>
            <th>Growth</th>
            <th>Growth %</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{formatDate(row.date)}</td>
            <td style={{ fontWeight: 600 }}>{formatNum(row.targets)}</td>
            <td>{formatNum(row.done_ltrs)}</td>
            <td>{formatNum(row.done_value)}</td>
            <td className={pctClass(row.achieved_pct)}>
              {formatPct(row.achieved_pct)}
            </td>
            <td>{formatNum(row.est_ltr)}</td>
            <td>{formatNum(row.est_value)}</td>
            <td className={pctClass(row.est_ltr_pct)}>
              {formatPct(row.est_ltr_pct)}
            </td>
            <td>{formatNum(row.last_month)}</td>
            <td className={Number(row.growth) < 0 ? 'mt-pct-red' : ''}>
              {formatNum(row.growth)}
            </td>
            <td className={pctClass(row.growth_pct, { negativeIsBad: true })}>
              {formatPct(row.growth_pct)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function EditTargetModal({
  row,
  draft,
  onDraftChange,
  reason,
  onReasonChange,
  saving,
  error,
  onCancel,
  onSave,
  platformColor,
  platformName,
}) {
  const monthLabel = new Date(row.year, row.month - 1, 1).toLocaleString(
    undefined,
    { month: 'long', year: 'numeric' },
  );

  return (
    <div className="lr-modal-backdrop" onClick={onCancel}>
      <div className="lr-modal" onClick={(e) => e.stopPropagation()}>
        <div
          className="lr-modal-header"
          style={{ borderBottomColor: platformColor }}
        >
          <h3>Correct target</h3>
          <button
            className="lr-modal-close"
            onClick={onCancel}
            disabled={saving}
          >
            ×
          </button>
        </div>

        <div className="lr-modal-body">
          <div className="mt-edit-meta">
            <span>
              <strong>{platformName}</strong> · {row.item_head} · {monthLabel}
            </span>
          </div>

          <div className="lr-form-grid">
            <label className="lr-field">
              <span>Current target</span>
              <input type="text" value={formatNum(row.targets)} disabled />
            </label>
            <label className="lr-field">
              <span>New target (litres)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                disabled={saving}
                autoFocus
              />
            </label>
          </div>

          <label className="lr-field" style={{ marginTop: 12 }}>
            <span>Reason for correction (optional)</span>
            <input
              type="text"
              placeholder="e.g. Typo in original entry"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              disabled={saving}
            />
          </label>

          {error && <div className="lr-error">{error}</div>}

          <div className="lr-hint">
            The previous value will be saved to <code>month_target_logs</code>{' '}
            for audit. Derived columns (Done Ltrs / Done Value / Achieved % /
            …) will be recomputed from the latest source data. Last-month
            value stays locked.
          </div>
        </div>

        <div className="lr-modal-footer">
          <button
            className="plat-btn plat-btn-secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="lr-add-btn"
            style={{ background: platformColor }}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save corrected target'}
          </button>
        </div>
      </div>
    </div>
  );
}
