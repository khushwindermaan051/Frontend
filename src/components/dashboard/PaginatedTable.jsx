import { useEffect, useState, useCallback } from 'react';
import { dashboardAPI } from '../../services/api';
import { formatLabel } from '../../utils/formatters';

const PAGE_SIZE = 100;
const POLL_MS = 30_000;

function isDateValue(val) {
  if (!val || typeof val !== 'string') return false;
  return /^\d{4}-\d{2}/.test(val);
}

const MONTHS = [
  { val: 1, label: 'Jan' }, { val: 2, label: 'Feb' }, { val: 3, label: 'Mar' },
  { val: 4, label: 'Apr' }, { val: 5, label: 'May' }, { val: 6, label: 'Jun' },
  { val: 7, label: 'Jul' }, { val: 8, label: 'Aug' }, { val: 9, label: 'Sep' },
  { val: 10, label: 'Oct' }, { val: 11, label: 'Nov' }, { val: 12, label: 'Dec' },
];

function buildYears() {
  const out = [];
  const cur = new Date().getFullYear();
  for (let y = cur; y >= cur - 5; y--) out.push(y);
  return out;
}

export default function PaginatedTable({ tableName }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [columns, setColumns] = useState([]);
  const [dateColumns, setDateColumns] = useState([]);
  const [textColumns, setTextColumns] = useState([]);

  const [search, setSearch] = useState('');
  const [dateCol, setDateCol] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showExpiry, setShowExpiry] = useState(false);
  const [expiryCol, setExpiryCol] = useState('');

  useEffect(() => {
    dashboardAPI.getTableColumns(tableName).then((res) => {
      if (!res.columns || res.columns.length === 0) return;
      const cols = res.columns;
      const sample = res.sample || {};
      setColumns(cols);

      const dateCols = cols.filter((c) => {
        const val = sample[c];
        return isDateValue(val) || /date|expir|created|updated/i.test(c);
      });
      setDateColumns(dateCols);

      const txtCols = cols.filter((c) => {
        const val = sample[c];
        return typeof val === 'string' && !isDateValue(val);
      });
      setTextColumns(txtCols);

      if (dateCols.length > 0) setDateCol((cur) => cur || dateCols[0]);
      const expCol = dateCols.find((c) => /expir/i.test(c));
      if (expCol) setExpiryCol(expCol);
    });
  }, [tableName]);

  const loadPage = useCallback(
    (p) => {
      setLoading(true);
      setError(null);

      const opts = { page: p, page_size: PAGE_SIZE };

      if (search && textColumns.length > 0) {
        opts.search = search;
        opts.search_columns = textColumns.join(',');
      }

      if (dateCol) {
        opts.date_column = dateCol;
        if (filterYear) opts.year = filterYear;
        if (filterMonth) opts.month = filterMonth;
        if (filterDate) opts.date = filterDate;
      }

      dashboardAPI
        .getTableData(tableName, opts)
        .then((res) => {
          if (res.error) {
            setError(res.error);
            setLoading(false);
            return;
          }
          setData(res.data || []);
          setTotal(res.count || 0);
          setPage(p);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    },
    [tableName, search, textColumns, dateCol, filterYear, filterMonth, filterDate],
  );

  useEffect(() => { loadPage(0); }, [loadPage]);

  // Replaces Supabase Realtime — polls fresh data every 30s.
  useEffect(() => {
    const id = setInterval(() => loadPage(page), POLL_MS);
    return () => clearInterval(id);
  }, [tableName, page, loadPage]);

  const clearFilters = () => {
    setSearch('');
    setFilterYear('');
    setFilterMonth('');
    setFilterDate('');
    setShowExpiry(false);
  };

  const hasFilters = search || filterYear || filterMonth || filterDate;

  const expiryRows = showExpiry && expiryCol
    ? data.filter((row) => {
      const val = row[expiryCol];
      if (!val) return false;
      return new Date(val) <= new Date();
    })
    : null;

  const displayData = expiryRows || data;
  const displayColumns = columns.length > 0
    ? columns
    : data.length > 0 ? Object.keys(data[0]) : [];
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const years = buildYears();

  return (
    <>
      <div className="filter-bar">
        <div className="filter-row">
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Search PO, product, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {dateColumns.length > 0 && (
            <>
              <div className="filter-group">
                <label>Date Column</label>
                <select
                  className="filter-select"
                  value={dateCol}
                  onChange={(e) => setDateCol(e.target.value)}
                >
                  {dateColumns.map((c) => (
                    <option key={c} value={c}>{formatLabel(c)}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Year</label>
                <select
                  className="filter-select"
                  value={filterYear}
                  onChange={(e) => { setFilterYear(e.target.value); setFilterDate(''); }}
                >
                  <option value="">All</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label>Month</label>
                <select
                  className="filter-select"
                  value={filterMonth}
                  onChange={(e) => { setFilterMonth(e.target.value); setFilterDate(''); }}
                >
                  <option value="">All</option>
                  {MONTHS.map((m) => <option key={m.val} value={m.val}>{m.label}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label>Exact Date</label>
                <input
                  type="date"
                  className="filter-input"
                  value={filterDate}
                  onChange={(e) => { setFilterDate(e.target.value); setFilterYear(''); setFilterMonth(''); }}
                />
              </div>
            </>
          )}

          {expiryCol && (
            <div className="filter-group">
              <label>Expiry</label>
              <button
                className={`filter-expiry-btn ${showExpiry ? 'active' : ''}`}
                onClick={() => setShowExpiry(!showExpiry)}
              >
                {showExpiry ? 'Showing Expired' : 'Show Expired'}
              </button>
            </div>
          )}

          {hasFilters && (
            <div className="filter-group">
              <label>&nbsp;</label>
              <button className="filter-clear-btn" onClick={clearFilters}>Clear All</button>
            </div>
          )}
        </div>

        {hasFilters && (
          <div className="filter-info">
            Showing {displayData.length} of {total.toLocaleString()} filtered results
            {showExpiry && expiryRows && <span> &middot; {expiryRows.length} expired</span>}
          </div>
        )}
      </div>

      {loading ? (
        <div className="table-status"><div className="loader" />Loading...</div>
      ) : error ? (
        <div className="table-status error">Error: {error}</div>
      ) : displayData.length === 0 ? (
        <div className="table-status">No data found</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th className="row-num">#</th>
                {displayColumns.map((col) => (
                  <th
                    key={col}
                    className={col === expiryCol && showExpiry ? 'expiry-col' : ''}
                  >
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, i) => {
                const isExpired = expiryCol && row[expiryCol]
                  && new Date(row[expiryCol]) <= new Date();
                return (
                  <tr key={row.id ?? i} className={isExpired ? 'row-expired' : ''}>
                    <td className="row-num">{page * PAGE_SIZE + i + 1}</td>
                    {displayColumns.map((col) => (
                      <td
                        key={col}
                        className={col === expiryCol
                          ? isExpired ? 'cell-expired' : 'cell-expiry'
                          : ''}
                      >
                        {row[col] === null
                          ? <span className="null-val">NULL</span>
                          : typeof row[col] === 'object'
                            ? JSON.stringify(row[col])
                            : String(row[col])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!showExpiry && totalPages > 1 && (
        <div className="pagination">
          <button className="pg-btn" disabled={page === 0} onClick={() => loadPage(0)}>&laquo;</button>
          <button className="pg-btn" disabled={page === 0} onClick={() => loadPage(page - 1)}>&lsaquo;</button>
          <span className="pg-info">
            {page + 1} / {totalPages}
            <span className="pg-total"> &middot; {total.toLocaleString()} rows</span>
          </span>
          <button className="pg-btn" disabled={page >= totalPages - 1} onClick={() => loadPage(page + 1)}>&rsaquo;</button>
          <button className="pg-btn" disabled={page >= totalPages - 1} onClick={() => loadPage(totalPages - 1)}>&raquo;</button>
        </div>
      )}
    </>
  );
}
