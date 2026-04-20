import { useEffect, useState, useRef, useCallback } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { useDispatch } from '../../context/DispatchContext';
import { platformAPI } from '../../lib/api';

const PAGE_SIZE = 50;

export default function PlatformTruckLoading() {
  const config = usePlatform();
  const { addDispatch } = useDispatch();
  const [mode, setMode] = useState('full');

  return (
    <>
      <div className="plat-page-header">
        <h1>Truck Loading</h1>
        <p>Load POs into trucks and dispatch for {config.name}</p>
      </div>
      <div className="plat-content">
        <div className="plat-mode-switcher">
          <button
            className={`plat-mode-btn ${mode === 'full' ? 'active' : ''}`}
            onClick={() => setMode('full')}
          >
            <span className="plat-mode-icon">&#128666;</span>
            <span className="plat-mode-label">Full Loading</span>
            <span className="plat-mode-desc">
              Step-by-step with weight tracking
            </span>
          </button>
          <button
            className={`plat-mode-btn ${mode === 'quick' ? 'active' : ''}`}
            onClick={() => setMode('quick')}
          >
            <span className="plat-mode-icon">&#9889;</span>
            <span className="plat-mode-label">Quick Dispatch</span>
            <span className="plat-mode-desc">Bulk select POs & dispatch</span>
          </button>
        </div>

        {mode === 'full' ? (
          <FullLoadingWorkflow config={config} addDispatch={addDispatch} />
        ) : (
          <QuickBulkDispatch config={config} addDispatch={addDispatch} />
        )}
      </div>
    </>
  );
}

/* =========================================================
   Shared: Fetch POs via FastAPI (READ ONLY)
   ========================================================= */
function usePOs(config, debouncedSearch, shouldLoad) {
  const [availablePOs, setAvailablePOs] = useState([]);
  const [poLoading, setPOLoading] = useState(false);

  const loadPOs = useCallback(async () => {
    if (!shouldLoad) return;
    setPOLoading(true);
    try {
      const result = await platformAPI.getPOs(config.slug, {
        page: 0,
        page_size: PAGE_SIZE,
        search: debouncedSearch,
      });
      setAvailablePOs(result.data || []);
    } catch {
      setAvailablePOs([]);
    }
    setPOLoading(false);
  }, [config, debouncedSearch, shouldLoad]);

  useEffect(() => {
    loadPOs();
  }, [loadPOs]);

  const poColumns = availablePOs.length > 0 ? Object.keys(availablePOs[0]) : [];
  const poNameCol =
    poColumns.find((c) => /po_number|po_no|po_id|order/i.test(c)) ||
    poColumns[0];
  const poQtyCol = poColumns.find((c) => /qty|quantity|total_order/i.test(c));

  const getPoKey = (po) =>
    po.id || po[poNameCol] || po[config.matchColumn] || JSON.stringify(po);

  return { availablePOs, poLoading, poNameCol, poQtyCol, getPoKey };
}

/* =========================================================
   OPTION B — Full Loading Workflow (local state only)
   ========================================================= */
function FullLoadingWorkflow({ config, addDispatch }) {
  const [step, setStep] = useState('select'); // select | loading | dispatch | done
  const [truckType, setTruckType] = useState(null);
  const [loadedPOs, setLoadedPOs] = useState([]);
  const [totalWeight, setTotalWeight] = useState(0);

  const [poSearch, setPOSearch] = useState('');
  const searchTimer = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [dispatchForm, setDispatchForm] = useState({
    dispatch_date: new Date().toISOString().split('T')[0],
    dispatch_time: '',
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    notes: '',
  });
  const [dispatchResult, setDispatchResult] = useState(null);

  const handleSearch = (val) => {
    setPOSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  // Read POs from Supabase
  const { availablePOs, poLoading, poNameCol, poQtyCol, getPoKey } = usePOs(
    config,
    debouncedSearch,
    step === 'loading',
  );

  const capacity = truckType?.capacityKg || 0;
  const fillPct =
    capacity > 0 ? Math.min((totalWeight / capacity) * 100, 100) : 0;
  const fillColor = fillPct < 70 ? 'green' : fillPct < 90 ? 'yellow' : 'red';
  const isOverloaded = totalWeight > capacity;

  const startLoading = () => {
    if (!truckType) return;
    setStep('loading');
  };

  const addPOToTruck = (po) => {
    const weight = Number(po[config.weightColumn]) || 0;
    const newWeight = totalWeight + weight;

    if (newWeight > capacity) {
      const ok = window.confirm(
        `Adding this PO will exceed truck capacity!\n\n` +
          `Current: ${totalWeight.toLocaleString()} kg\n` +
          `Adding: ${weight.toLocaleString()} kg\n` +
          `Capacity: ${capacity.toLocaleString()} kg\n` +
          `Over by: ${(newWeight - capacity).toLocaleString()} kg\n\n` +
          `Continue anyway?`,
      );
      if (!ok) return;
    }

    const poKey = getPoKey(po);
    setLoadedPOs((prev) => [
      ...prev,
      {
        po_id: poKey,
        po_name: po[poNameCol] || 'Unknown PO',
        sku_code: po[config.matchColumn] || '',
        weight_kg: weight,
        quantity: po[poQtyCol] ? Number(po[poQtyCol]) : null,
      },
    ]);
    setTotalWeight(newWeight);
  };

  const removePO = (index) => {
    const removed = loadedPOs[index];
    setLoadedPOs((prev) => prev.filter((_, i) => i !== index));
    setTotalWeight((prev) => prev - (removed.weight_kg || 0));
  };

  const completeDispatch = () => {
    const result = {
      platform_slug: config.slug,
      platform: config.name,
      mode: 'full',
      truck_type: truckType?.label,
      capacity_kg: capacity,
      loaded_kg: totalWeight,
      fill_percentage: Math.round(fillPct * 100) / 100,
      po_count: loadedPOs.length,
      po_details: [...loadedPOs],
      status: 'dispatched',
      ...dispatchForm,
    };
    addDispatch(result);
    setDispatchResult({
      truckType: truckType?.label,
      loadedPOs: [...loadedPOs],
      totalWeight,
      capacity,
      fillPct,
      ...dispatchForm,
      platform: config.name,
    });
    setStep('done');
  };

  const resetAll = () => {
    setLoadedPOs([]);
    setTotalWeight(0);
    setStep('select');
    setTruckType(null);
    setDispatchResult(null);
    setDispatchForm({
      dispatch_date: new Date().toISOString().split('T')[0],
      dispatch_time: '',
      vehicle_number: '',
      driver_name: '',
      driver_phone: '',
      notes: '',
    });
  };

  const printSlip = () => {
    const r = dispatchResult;
    if (!r) return;
    const rows = r.loadedPOs
      .map(
        (po, i) =>
          `<tr><td>${i + 1}</td><td>${po.po_name}</td><td>${po.sku_code || '-'}</td><td>${po.quantity ?? '-'}</td><td>${po.weight_kg} kg</td></tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html><html><head><title>Dispatch Slip</title>
    <style>
      body{font-family:Arial,sans-serif;padding:30px;color:#333}
      h2{margin-bottom:4px}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 30px;margin:16px 0;font-size:13px}
      .meta b{display:inline-block;width:110px}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
      th,td{border:1px solid #ccc;padding:8px 10px;text-align:left}
      th{background:#f5f5f5;font-weight:600}
      .footer{margin-top:30px;display:flex;justify-content:space-between;font-size:13px}
      .sig{border-top:1px solid #333;padding-top:4px;width:180px;text-align:center;margin-top:50px}
      @media print{body{padding:15px}}
    </style></head><body>
    <h2>${r.platform} — Dispatch Loading Slip</h2>
    <div class="meta">
      <div><b>Truck Type:</b> ${r.truckType}</div>
      <div><b>Vehicle No:</b> ${r.vehicle_number || '-'}</div>
      <div><b>Dispatch Date:</b> ${r.dispatch_date || '-'}</div>
      <div><b>Dispatch Time:</b> ${r.dispatch_time || '-'}</div>
      <div><b>Driver:</b> ${r.driver_name || '-'}</div>
      <div><b>Driver Phone:</b> ${r.driver_phone || '-'}</div>
      <div><b>Total Load:</b> ${r.totalWeight.toLocaleString()} / ${r.capacity.toLocaleString()} kg (${r.fillPct.toFixed(1)}%)</div>
      <div><b>Total POs:</b> ${r.loadedPOs.length}</div>
    </div>
    ${r.notes ? `<div style="font-size:13px;margin-bottom:10px"><b>Notes:</b> ${r.notes}</div>` : ''}
    <table><thead><tr><th>#</th><th>PO</th><th>SKU</th><th>Qty</th><th>Weight</th></tr></thead><tbody>${rows}</tbody>
    <tfoot><tr><th colspan="4" style="text-align:right">Total Weight</th><th>${r.totalWeight.toLocaleString()} kg</th></tr></tfoot></table>
    <div class="footer"><div class="sig">Loaded By</div><div class="sig">Driver Signature</div><div class="sig">Verified By</div></div>
    </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <>
      {/* Step 1: Select truck */}
      {step === 'select' && (
        <div className="plat-truck-section">
          <h3>Step 1 — Select Truck Type</h3>
          <div className="plat-truck-types">
            {config.truckTypes.map((t) => (
              <button
                key={t.label}
                className={`plat-truck-type-btn ${truckType?.label === t.label ? 'selected' : ''}`}
                onClick={() => setTruckType(t)}
              >
                <span className="plat-truck-type-label">{t.label}</span>
                <span className="plat-truck-type-cap">
                  {t.capacityKg.toLocaleString()} kg capacity
                </span>
              </button>
            ))}
          </div>
          <button
            className="plat-btn plat-btn-primary"
            disabled={!truckType}
            onClick={startLoading}
          >
            Start Loading
          </button>
        </div>
      )}

      {/* Step 2: Loading POs */}
      {step === 'loading' && (
        <>
          <div className="plat-truck-section">
            <h3>Step 2 — Load POs into {truckType?.label} Truck</h3>

            <div className="plat-truck-fill">
              <div className="plat-truck-fill-header">
                <span>
                  {totalWeight.toLocaleString()} / {capacity.toLocaleString()}{' '}
                  kg
                </span>
                <span className="plat-truck-fill-pct">
                  {fillPct.toFixed(1)}%
                </span>
              </div>
              <div className="plat-truck-fill-bar">
                <div
                  className={`plat-truck-fill-progress ${fillColor}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              {isOverloaded && (
                <div className="plat-overload-warning">
                  &#9888; Overloaded by{' '}
                  {(totalWeight - capacity).toLocaleString()} kg!
                </div>
              )}
            </div>

            {loadedPOs.length > 0 && (
              <>
                <h4
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#636e72',
                    marginBottom: '10px',
                  }}
                >
                  Loaded POs ({loadedPOs.length}) —{' '}
                  {totalWeight.toLocaleString()} kg
                </h4>
                {loadedPOs.map((po, i) => (
                  <div key={i} className="plat-loaded-item">
                    <div className="plat-truck-po-info">
                      <div className="plat-truck-po-name">{po.po_name}</div>
                      <div className="plat-truck-po-weight">
                        {po.sku_code && <span>SKU: {po.sku_code} | </span>}
                        {po.quantity != null && (
                          <span>Qty: {po.quantity} | </span>
                        )}
                        {po.weight_kg} kg
                      </div>
                    </div>
                    <button
                      className="plat-loaded-remove"
                      onClick={() => removePO(i)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                className="plat-btn plat-btn-primary"
                onClick={() => setStep('dispatch')}
                disabled={loadedPOs.length === 0}
              >
                Complete Loading &rarr;
              </button>
              <button
                className="plat-btn plat-btn-secondary"
                onClick={resetAll}
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Available POs (read from Supabase) */}
          <div className="plat-truck-section">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: 0 }}>Available POs</h3>
              <input
                type="text"
                placeholder="Search PO, SKU..."
                value={poSearch}
                onChange={(e) => handleSearch(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1.5px solid #e0e3e8',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  width: '220px',
                }}
              />
            </div>
            {poLoading ? (
              <div className="plat-empty">
                <div className="loader" /> Loading POs...
              </div>
            ) : availablePOs.length === 0 ? (
              <div className="plat-empty">No POs available</div>
            ) : (
              availablePOs.map((po, i) => {
                const poKey = getPoKey(po);
                const alreadyLoaded = loadedPOs.some((l) => l.po_id === poKey);
                const weight = Number(po[config.weightColumn]) || 0;
                return (
                  <div key={poKey ?? i} className="plat-truck-po-item">
                    <div className="plat-truck-po-info">
                      <div className="plat-truck-po-name">
                        {po[poNameCol] || `PO #${i + 1}`}
                      </div>
                      <div className="plat-truck-po-weight">
                        {po[config.matchColumn] && (
                          <span>SKU: {po[config.matchColumn]} | </span>
                        )}
                        {poQtyCol && <span>Qty: {po[poQtyCol]} | </span>}
                        {weight} {po[config.unitColumn] || 'kg'}
                      </div>
                    </div>
                    <div className="plat-truck-po-actions">
                      {alreadyLoaded ? (
                        <span className="plat-status dispatched">Added</span>
                      ) : (
                        <button
                          className="plat-btn-add"
                          onClick={() => addPOToTruck(po)}
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Step 3: Dispatch details */}
      {step === 'dispatch' && (
        <div className="plat-truck-section">
          <h3>Step 3 — Dispatch Details</h3>
          <p
            style={{ fontSize: '13px', color: '#95a5a6', marginBottom: '16px' }}
          >
            Truck: {truckType?.label} | {loadedPOs.length} POs |{' '}
            {totalWeight.toLocaleString()} kg ({fillPct.toFixed(1)}% full)
            {isOverloaded && (
              <span style={{ color: '#e74c3c', fontWeight: 600 }}>
                {' '}
                — OVERLOADED
              </span>
            )}
          </p>
          <div className="plat-dispatch-form">
            <div className="plat-form-group">
              <label>Dispatch Date</label>
              <input
                type="date"
                value={dispatchForm.dispatch_date}
                onChange={(e) =>
                  setDispatchForm({
                    ...dispatchForm,
                    dispatch_date: e.target.value,
                  })
                }
              />
            </div>
            <div className="plat-form-group">
              <label>Dispatch Time</label>
              <input
                type="time"
                value={dispatchForm.dispatch_time}
                onChange={(e) =>
                  setDispatchForm({
                    ...dispatchForm,
                    dispatch_time: e.target.value,
                  })
                }
              />
            </div>
            <div className="plat-form-group">
              <label>Vehicle Number</label>
              <input
                type="text"
                placeholder="e.g. MH 12 AB 1234"
                value={dispatchForm.vehicle_number}
                onChange={(e) =>
                  setDispatchForm({
                    ...dispatchForm,
                    vehicle_number: e.target.value,
                  })
                }
              />
            </div>
            <div className="plat-form-group">
              <label>Driver Name</label>
              <input
                type="text"
                placeholder="Driver name"
                value={dispatchForm.driver_name}
                onChange={(e) =>
                  setDispatchForm({
                    ...dispatchForm,
                    driver_name: e.target.value,
                  })
                }
              />
            </div>
            <div className="plat-form-group">
              <label>Driver Phone</label>
              <input
                type="text"
                placeholder="Phone number"
                value={dispatchForm.driver_phone}
                onChange={(e) =>
                  setDispatchForm({
                    ...dispatchForm,
                    driver_phone: e.target.value,
                  })
                }
              />
            </div>
            <div className="plat-form-group full">
              <label>Notes</label>
              <textarea
                placeholder="Any additional notes..."
                value={dispatchForm.notes}
                onChange={(e) =>
                  setDispatchForm({ ...dispatchForm, notes: e.target.value })
                }
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
            <button
              className="plat-btn plat-btn-primary"
              onClick={completeDispatch}
              disabled={!dispatchForm.vehicle_number}
            >
              Dispatch Truck
            </button>
            <button
              className="plat-btn plat-btn-secondary"
              onClick={() => setStep('loading')}
            >
              &larr; Back
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && dispatchResult && (
        <div className="plat-truck-section" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>&#9989;</div>
          <h3 style={{ fontSize: '20px', marginBottom: '6px' }}>
            Truck Dispatched!
          </h3>
          <p
            style={{ color: '#95a5a6', fontSize: '13px', marginBottom: '20px' }}
          >
            {dispatchResult.loadedPOs.length} POs |{' '}
            {dispatchResult.totalWeight.toLocaleString()} kg | Vehicle:{' '}
            {dispatchResult.vehicle_number}
          </p>
          <div
            style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}
          >
            <button className="plat-btn plat-btn-primary" onClick={printSlip}>
              Print Loading Slip
            </button>
            <button className="plat-btn plat-btn-secondary" onClick={resetAll}>
              New Loading
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   OPTION C — Quick Bulk Dispatch (local state only)
   ========================================================= */
function QuickBulkDispatch({ config, addDispatch }) {
  const [truckType, setTruckType] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [poSearch, setPOSearch] = useState('');
  const searchTimer = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);

  const handleSearch = (val) => {
    setPOSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  // Read POs from Supabase
  const { availablePOs, poLoading, poNameCol, poQtyCol, getPoKey } = usePOs(
    config,
    debouncedSearch,
    true,
  );

  const togglePO = (key) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === availablePOs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availablePOs.map((po) => getPoKey(po))));
    }
  };

  const selectedPOs = availablePOs.filter((po) =>
    selectedIds.has(getPoKey(po)),
  );
  const totalWeight = selectedPOs.reduce(
    (sum, po) => sum + (Number(po[config.weightColumn]) || 0),
    0,
  );
  const capacity = truckType?.capacityKg || 0;

  const handleDispatch = () => {
    if (!truckType || selectedPOs.length === 0 || !vehicle) return;
    const fillPct =
      capacity > 0 ? Math.min((totalWeight / capacity) * 100, 100) : 0;
    const poDetails = selectedPOs.map((po) => ({
      po_name: po[poNameCol] || 'Unknown',
      sku_code: po[config.matchColumn] || '',
      weight_kg: Number(po[config.weightColumn]) || 0,
      quantity: po[poQtyCol] ? Number(po[poQtyCol]) : null,
    }));

    // Save to dispatch history
    addDispatch({
      platform_slug: config.slug,
      platform: config.name,
      mode: 'quick',
      truck_type: truckType.label,
      capacity_kg: capacity,
      loaded_kg: totalWeight,
      fill_percentage: Math.round(fillPct * 100) / 100,
      po_count: selectedPOs.length,
      po_details: poDetails,
      status: 'dispatched',
      dispatch_date: new Date().toISOString().split('T')[0],
      dispatch_time: new Date().toTimeString().slice(0, 5),
      vehicle_number: vehicle,
      driver_name: driverName,
      driver_phone: driverPhone,
      notes,
    });

    setDispatchResult({
      truckType: truckType.label,
      loadedPOs: poDetails,
      totalWeight,
      capacity,
      fillPct,
      vehicle_number: vehicle,
      driver_name: driverName,
      driver_phone: driverPhone,
      notes,
      platform: config.name,
    });
    setDone(true);
  };

  const resetAll = () => {
    setTruckType(null);
    setSelectedIds(new Set());
    setVehicle('');
    setDriverName('');
    setDriverPhone('');
    setNotes('');
    setDone(false);
    setDispatchResult(null);
  };

  const printSlip = () => {
    const r = dispatchResult;
    if (!r) return;
    const rows = r.loadedPOs
      .map(
        (po, i) =>
          `<tr><td>${i + 1}</td><td>${po.po_name}</td><td>${po.sku_code || '-'}</td><td>${po.quantity ?? '-'}</td><td>${po.weight_kg} kg</td></tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html><html><head><title>Dispatch Slip</title>
    <style>
      body{font-family:Arial,sans-serif;padding:30px;color:#333}
      h2{margin-bottom:4px}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 30px;margin:16px 0;font-size:13px}
      .meta b{display:inline-block;width:110px}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
      th,td{border:1px solid #ccc;padding:8px 10px;text-align:left}
      th{background:#f5f5f5;font-weight:600}
      .footer{margin-top:30px;display:flex;justify-content:space-between;font-size:13px}
      .sig{border-top:1px solid #333;padding-top:4px;width:180px;text-align:center;margin-top:50px}
      @media print{body{padding:15px}}
    </style></head><body>
    <h2>${r.platform} — Quick Dispatch Slip</h2>
    <div class="meta">
      <div><b>Truck Type:</b> ${r.truckType}</div>
      <div><b>Vehicle No:</b> ${r.vehicle_number || '-'}</div>
      <div><b>Driver:</b> ${r.driver_name || '-'}</div>
      <div><b>Driver Phone:</b> ${r.driver_phone || '-'}</div>
      <div><b>Total Load:</b> ${r.totalWeight.toLocaleString()} / ${r.capacity.toLocaleString()} kg (${r.fillPct.toFixed(1)}%)</div>
      <div><b>Total POs:</b> ${r.loadedPOs.length}</div>
    </div>
    ${r.notes ? `<div style="font-size:13px;margin-bottom:10px"><b>Notes:</b> ${r.notes}</div>` : ''}
    <table><thead><tr><th>#</th><th>PO</th><th>SKU</th><th>Qty</th><th>Weight</th></tr></thead><tbody>${rows}</tbody>
    <tfoot><tr><th colspan="4" style="text-align:right">Total Weight</th><th>${r.totalWeight.toLocaleString()} kg</th></tr></tfoot></table>
    <div class="footer"><div class="sig">Loaded By</div><div class="sig">Driver Signature</div><div class="sig">Verified By</div></div>
    </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
  };

  if (done && dispatchResult) {
    return (
      <div className="plat-truck-section" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>&#9889;</div>
        <h3 style={{ fontSize: '20px', marginBottom: '6px' }}>
          Quick Dispatch Complete!
        </h3>
        <p style={{ color: '#95a5a6', fontSize: '13px', marginBottom: '20px' }}>
          {dispatchResult.loadedPOs.length} POs |{' '}
          {dispatchResult.totalWeight.toLocaleString()} kg | Vehicle:{' '}
          {dispatchResult.vehicle_number}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button className="plat-btn plat-btn-primary" onClick={printSlip}>
            Print Dispatch Slip
          </button>
          <button className="plat-btn plat-btn-secondary" onClick={resetAll}>
            New Dispatch
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="plat-truck-section">
        <h3>Truck &amp; Driver</h3>
        <div className="plat-truck-types" style={{ marginBottom: '16px' }}>
          {config.truckTypes.map((t) => (
            <button
              key={t.label}
              className={`plat-truck-type-btn ${truckType?.label === t.label ? 'selected' : ''}`}
              onClick={() => setTruckType(t)}
            >
              <span className="plat-truck-type-label">{t.label}</span>
              <span className="plat-truck-type-cap">
                {t.capacityKg.toLocaleString()} kg
              </span>
            </button>
          ))}
        </div>
        <div className="plat-dispatch-form">
          <div className="plat-form-group">
            <label>Vehicle Number *</label>
            <input
              type="text"
              placeholder="e.g. MH 12 AB 1234"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
            />
          </div>
          <div className="plat-form-group">
            <label>Driver Name</label>
            <input
              type="text"
              placeholder="Driver name"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
            />
          </div>
          <div className="plat-form-group">
            <label>Driver Phone</label>
            <input
              type="text"
              placeholder="Phone number"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
            />
          </div>
          <div className="plat-form-group">
            <label>Notes</label>
            <input
              type="text"
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="plat-truck-section">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ margin: 0 }}>
            Select POs
            {selectedIds.size > 0 && (
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 400,
                  color: '#636e72',
                  marginLeft: '10px',
                }}
              >
                {selectedIds.size} selected — {totalWeight.toLocaleString()} kg
                {capacity > 0 && totalWeight > capacity && (
                  <span style={{ color: '#e74c3c', fontWeight: 600 }}>
                    {' '}
                    (overloaded!)
                  </span>
                )}
              </span>
            )}
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search PO, SKU..."
              value={poSearch}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1.5px solid #e0e3e8',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'inherit',
                width: '200px',
              }}
            />
            <button
              className="plat-btn plat-btn-secondary"
              onClick={toggleAll}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              {selectedIds.size === availablePOs.length
                ? 'Deselect All'
                : 'Select All'}
            </button>
          </div>
        </div>

        {poLoading ? (
          <div className="plat-empty">
            <div className="loader" /> Loading POs...
          </div>
        ) : availablePOs.length === 0 ? (
          <div className="plat-empty">No POs available</div>
        ) : (
          availablePOs.map((po, i) => {
            const poKey = getPoKey(po);
            const isSelected = selectedIds.has(poKey);
            const weight = Number(po[config.weightColumn]) || 0;
            return (
              <div
                key={poKey ?? i}
                className="plat-truck-po-item"
                style={{
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(39,174,96,0.04)' : undefined,
                  borderColor: isSelected ? 'rgba(39,174,96,0.3)' : undefined,
                }}
                onClick={() => togglePO(poKey)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => togglePO(poKey)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    accentColor: 'var(--platform-color, #667eea)',
                  }}
                />
                <div className="plat-truck-po-info">
                  <div className="plat-truck-po-name">
                    {po[poNameCol] || `PO #${i + 1}`}
                  </div>
                  <div className="plat-truck-po-weight">
                    {po[config.matchColumn] && (
                      <span>SKU: {po[config.matchColumn]} | </span>
                    )}
                    {poQtyCol && <span>Qty: {po[poQtyCol]} | </span>}
                    {weight} {po[config.unitColumn] || 'kg'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        className="plat-truck-section"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: '13px', color: '#636e72' }}>
          {selectedIds.size} POs | {totalWeight.toLocaleString()} kg
          {capacity > 0 && <span> / {capacity.toLocaleString()} kg</span>}
        </div>
        <button
          className="plat-btn plat-btn-primary"
          disabled={!truckType || selectedIds.size === 0 || !vehicle}
          onClick={handleDispatch}
        >
          Dispatch {selectedIds.size} POs
        </button>
      </div>
    </>
  );
}
