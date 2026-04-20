import { useState } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { useDispatch } from '../../context/DispatchContext';

const PAGE_SIZE = 20;

export default function PlatformDispatches() {
  const config = usePlatform();
  const { getByPlatform, deleteDispatch, clearAll } = useDispatch();

  const allDispatches = getByPlatform(config.slug);
  const total = allDispatches.length;

  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const dispatches = allDispatches.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  const handleDelete = (id) => {
    if (window.confirm('Delete this dispatch record?')) {
      deleteDispatch(id);
    }
  };

  const handleClearAll = () => {
    if (window.confirm(`Delete all dispatch records for ${config.name}?`)) {
      clearAll(config.slug);
      setPage(0);
    }
  };

  return (
    <>
      <div className="plat-page-header">
        <h1>Dispatch History</h1>
        <p>
          {total} total dispatches for {config.name}
        </p>
      </div>
      <div className="plat-content">
        <div className="card">
          {total > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '12px 16px 0',
              }}
            >
              <button
                className="plat-btn plat-btn-secondary"
                style={{
                  fontSize: '11px',
                  padding: '4px 12px',
                  color: '#e74c3c',
                  borderColor: 'rgba(231,76,60,0.3)',
                }}
                onClick={handleClearAll}
              >
                Clear All
              </button>
            </div>
          )}

          {dispatches.length === 0 ? (
            <div className="table-status">No dispatches yet</div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Mode</th>
                      <th>Truck</th>
                      <th>Vehicle</th>
                      <th>Driver</th>
                      <th>Load</th>
                      <th>Fill</th>
                      <th>POs</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatches.map((d, i) => (
                      <>
                        <tr
                          key={d.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() =>
                            setExpanded(expanded === d.id ? null : d.id)
                          }
                        >
                          <td className="row-num">
                            {page * PAGE_SIZE + i + 1}
                          </td>
                          <td>
                            {d.dispatch_date ||
                              d.created_at?.split('T')[0] ||
                              '-'}
                          </td>
                          <td>
                            <span
                              className={`plat-status ${d.mode === 'quick' ? 'loading' : 'dispatched'}`}
                            >
                              {d.mode === 'quick' ? 'Quick' : 'Full'}
                            </span>
                          </td>
                          <td>{d.truck_type || '-'}</td>
                          <td>{d.vehicle_number || '-'}</td>
                          <td>{d.driver_name || '-'}</td>
                          <td>{d.loaded_kg?.toLocaleString() || 0} kg</td>
                          <td>{d.fill_percentage?.toFixed(1) || 0}%</td>
                          <td>{d.po_count || (d.po_details || []).length}</td>
                          <td>
                            <span className={`plat-status ${d.status}`}>
                              {d.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="plat-loaded-remove"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(d.id);
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                        {expanded === d.id && (
                          <tr key={`${d.id}-details`}>
                            <td
                              colSpan={11}
                              style={{
                                background: '#f8f9fc',
                                padding: '14px 20px',
                              }}
                            >
                              <div
                                style={{ fontSize: '12px', color: '#636e72' }}
                              >
                                <strong>Time:</strong> {d.dispatch_time || '-'}{' '}
                                |<strong> Phone:</strong>{' '}
                                {d.driver_phone || '-'} |
                                <strong> Notes:</strong> {d.notes || '-'} |
                                <strong> Created:</strong>{' '}
                                {d.created_at
                                  ? new Date(d.created_at).toLocaleString()
                                  : '-'}
                              </div>
                              {(d.po_details || []).length > 0 && (
                                <div style={{ marginTop: '10px' }}>
                                  <strong
                                    style={{
                                      fontSize: '12px',
                                      color: '#636e72',
                                    }}
                                  >
                                    Loaded POs:
                                  </strong>
                                  {d.po_details.map((po, j) => (
                                    <div
                                      key={j}
                                      style={{
                                        fontSize: '12px',
                                        padding: '4px 0',
                                        color: '#636e72',
                                      }}
                                    >
                                      {po.po_name} —{' '}
                                      {po.sku_code && `SKU: ${po.sku_code} | `}
                                      {po.quantity != null
                                        ? `Qty: ${po.quantity} | `
                                        : ''}
                                      {po.weight_kg} kg
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
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
                    <span className="pg-total">
                      {' '}
                      &middot; {total} dispatches
                    </span>
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

          <div
            style={{
              padding: '12px 16px',
              fontSize: '11px',
              color: '#b2bec3',
              borderTop: '1px solid #eef0f4',
            }}
          >
            Dispatch history is stored locally in your browser. Data will
            persist across sessions but is not synced to server.
          </div>
        </div>
      </div>
    </>
  );
}
