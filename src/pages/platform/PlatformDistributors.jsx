import { useEffect, useState, useCallback, useRef } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { sapAPI } from '../../lib/api';

const PAGE_SIZE = 50;

export default function PlatformDistributors() {
  const config = usePlatform();

  const [distributors, setDistributors] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const searchTimer = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState('info');
  const [orders, setOrders] = useState({ data: [], count: 0 });
  const [invoices, setInvoices] = useState({ data: [], count: 0 });
  const [salesInvoices, setSalesInvoices] = useState({ data: [], count: 0 });
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [salesInvoicesLoading, setSalesInvoicesLoading] = useState(false);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(0);
    }, 400);
  };

  const loadDistributors = useCallback(async () => {
    setLoading(true);
    try {
      const result = await sapAPI.getPlatformDistributors(config.slug, {
        search: debouncedSearch,
        page,
        page_size: PAGE_SIZE,
      });
      setDistributors(result.data || []);
      setTotal(result.count || 0);
    } catch {
      setDistributors([]);
      setTotal(0);
    }
    setLoading(false);
  }, [config.slug, debouncedSearch, page]);

  useEffect(() => {
    loadDistributors();
  }, [loadDistributors]);

  const selectDistributor = async (d) => {
    setSelected(d.CardCode);
    setDetailTab('info');
    setDetailLoading(true);
    setOrders({ data: [], count: 0 });
    setInvoices({ data: [], count: 0 });
    setSalesInvoices({ data: [], count: 0 });
    try {
      const result = await sapAPI.getPlatformDistributorDetail(
        config.slug,
        d.CardCode,
      );
      setDetail(result);
    } catch {
      setDetail(null);
    }
    setDetailLoading(false);
  };

  useEffect(() => {
    if (detailTab !== 'orders' || !selected) return;
    setOrdersLoading(true);
    sapAPI
      .getDistributorOrders(selected, { page: 0, page_size: 50 })
      .then((r) => setOrders(r))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [detailTab, selected]);

  useEffect(() => {
    if (detailTab !== 'invoices' || !selected) return;
    setInvoicesLoading(true);
    sapAPI
      .getDistributorInvoices(selected, { page: 0, page_size: 50 })
      .then((r) => setInvoices(r))
      .catch(() => {})
      .finally(() => setInvoicesLoading(false));
  }, [detailTab, selected]);

  useEffect(() => {
    if (detailTab !== 'sales-invoices' || !selected) return;
    setSalesInvoicesLoading(true);
    sapAPI
      .getCustomerSalesInvoices(selected, { page: 0, page_size: 50 })
      .then((r) => setSalesInvoices(r))
      .catch(() => {})
      .finally(() => setSalesInvoicesLoading(false));
  }, [detailTab, selected]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <div className="plat-content">
        <div className="dist-layout">
          {/* Left: List */}
          <div className="dist-list-panel">
            <div className="dist-list-header">
              <input
                type="text"
                placeholder="Search name, code, phone, city..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="dist-search"
                style={{ borderColor: config.color }}
              />
            </div>

            <div className="dist-list-body">
              {loading ? (
                <div className="plat-empty">
                  <div className="loader" /> Loading distributors...
                </div>
              ) : distributors.length === 0 ? (
                <div className="plat-empty">
                  No distributors found for {config.name}
                </div>
              ) : (
                distributors.map((d) => (
                  <div
                    key={d.CardCode}
                    className={`dist-item ${selected === d.CardCode ? 'selected' : ''}`}
                    onClick={() => selectDistributor(d)}
                    style={
                      selected === d.CardCode
                        ? { borderLeftColor: config.color }
                        : undefined
                    }
                  >
                    <div
                      className="dist-item-avatar"
                      style={{
                        background: d.Active === 'Y' ? config.color : '#b2bec3',
                      }}
                    >
                      {(d.CardName || '?')[0]}
                    </div>
                    <div className="dist-item-info">
                      <div className="dist-item-name">{d.CardName}</div>
                      <div className="dist-item-sub">
                        {d.CardCode}
                        {d.City && <span> &middot; {d.City}</span>}
                        {d.State && <span>, {d.State}</span>}
                        {d.Chain && <span> &middot; {d.Chain}</span>}
                      </div>
                    </div>
                    <div className="dist-item-balance">
                      {d.Balance != null && (
                        <span
                          className={d.Balance < 0 ? 'negative' : 'positive'}
                        >
                          {Number(d.Balance).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="pagination" style={{ padding: '10px 16px' }}>
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
          </div>

          {/* Right: Detail */}
          <div className="dist-detail-panel">
            {!selected ? (
              <div className="plat-empty" style={{ padding: '60px 20px' }}>
                Select a distributor to view details
              </div>
            ) : detailLoading ? (
              <div className="plat-empty">
                <div className="loader" /> Loading details...
              </div>
            ) : !detail ? (
              <div className="plat-empty">Failed to load details</div>
            ) : (
              <>
                <div className="dist-detail-header">
                  <div
                    className="dist-detail-avatar"
                    style={{
                      background:
                        detail.distributor.Active === 'Y'
                          ? config.color
                          : '#b2bec3',
                    }}
                  >
                    {(detail.distributor.CardName || '?')[0]}
                  </div>
                  <div>
                    <h2 className="dist-detail-name">
                      {detail.distributor.CardName}
                    </h2>
                    <div className="dist-detail-code">
                      {detail.distributor.CardCode}
                      {detail.distributor.Chain && (
                        <span> &middot; {detail.distributor.Chain}</span>
                      )}
                      <span>
                        {' '}
                        &middot;{' '}
                        {detail.distributor.CardType === 'C'
                          ? 'Customer'
                          : 'Vendor'}
                      </span>
                    </div>
                  </div>
                  <div className="dist-detail-status">
                    <span
                      className={`plat-status ${detail.distributor.Active === 'Y' ? 'dispatched' : 'loading'}`}
                    >
                      {detail.distributor.Active === 'Y'
                        ? 'Active'
                        : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="dist-tabs">
                  {[
                    'info',
                    'addresses',
                    'contacts',
                    'orders',
                    'invoices',
                    'sales-invoices',
                  ].map((tab) => (
                    <button
                      key={tab}
                      className={`dist-tab ${detailTab === tab ? 'active' : ''}`}
                      onClick={() => setDetailTab(tab)}
                      style={
                        detailTab === tab
                          ? {
                              color: config.color,
                              borderBottomColor: config.color,
                            }
                          : undefined
                      }
                    >
                      {tab === 'info'
                        ? 'Details'
                        : tab === 'sales-invoices'
                          ? 'Sales Invoices'
                          : tab[0].toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="dist-tab-content">
                  {detailTab === 'info' && (
                    <InfoTab data={detail.distributor} />
                  )}
                  {detailTab === 'addresses' && (
                    <AddressesTab addresses={detail.addresses} />
                  )}
                  {detailTab === 'contacts' && (
                    <ContactsTab contacts={detail.contacts} />
                  )}
                  {detailTab === 'orders' && (
                    <DocsTab
                      data={orders}
                      loading={ordersLoading}
                      type="Purchase Order"
                    />
                  )}
                  {detailTab === 'invoices' && (
                    <DocsTab
                      data={invoices}
                      loading={invoicesLoading}
                      type="AP Invoice"
                    />
                  )}
                  {detailTab === 'sales-invoices' && (
                    <SalesInvoicesTab
                      data={salesInvoices}
                      loading={salesInvoicesLoading}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function InfoTab({ data }) {
  const fields = [
    ['Card Code', data.CardCode],
    ['Name', data.CardName],
    ['Type', data.CardType === 'C' ? 'Customer' : 'Vendor'],
    ['Chain', data.Chain],
    ['Group', data.MainGroup],
    ['GSTIN', data.GSTIN],
    ['Phone', data.Phone1],
    ['Phone 2', data.Phone2],
    ['Mobile', data.Cellular],
    ['Email', data.Email],
    ['Fax', data.Fax],
    ['Address', data.Address],
    ['City', data.City],
    ['State', data.State],
    ['Zip Code', data.ZipCode],
    ['Country', data.Country],
    ['Currency', data.Currency],
    [
      'Balance',
      data.Balance != null
        ? `${data.Currency || 'INR'} ${Number(data.Balance).toLocaleString()}`
        : null,
    ],
    [
      'Credit Line',
      data.CreditLine != null
        ? `${data.Currency || 'INR'} ${Number(data.CreditLine).toLocaleString()}`
        : null,
    ],
    ['Created', data.CreateDate?.split('T')[0]],
    ['Updated', data.UpdateDate?.split('T')[0]],
  ];

  return (
    <div className="dist-info-grid">
      {fields.map(
        ([label, val]) =>
          val != null &&
          val !== '' && (
            <div key={label} className="plat-stock-row">
              <span className="plat-stock-label">{label}</span>
              <span className="plat-stock-val neutral">{String(val)}</span>
            </div>
          ),
      )}
    </div>
  );
}

function AddressesTab({ addresses }) {
  if (!addresses || addresses.length === 0)
    return <div className="plat-empty">No addresses found</div>;
  return (
    <div className="dist-cards-grid">
      {addresses.map((a, i) => (
        <div key={i} className="dist-address-card">
          <div className="dist-address-type">
            {a.AdresType === 'S'
              ? 'Ship To'
              : a.AdresType === 'B'
                ? 'Bill To'
                : a.AdresType}
          </div>
          <div className="dist-address-label">{a.Address}</div>
          <div className="dist-address-detail">
            {[a.Street, a.Block, a.City, a.State, a.ZipCode, a.Country]
              .filter(Boolean)
              .join(', ')}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactsTab({ contacts }) {
  if (!contacts || contacts.length === 0)
    return <div className="plat-empty">No contacts found</div>;
  return (
    <div className="dist-cards-grid">
      {contacts.map((c, i) => (
        <div key={i} className="dist-address-card">
          <div className="dist-address-type">{c.Position || 'Contact'}</div>
          <div className="dist-address-label">
            {[c.FirstName, c.LastName].filter(Boolean).join(' ') || c.Name}
          </div>
          <div className="dist-address-detail">
            {c.Tel1 && <span>Phone: {c.Tel1} </span>}
            {c.Email && <span>Email: {c.Email}</span>}
          </div>
          <span
            className={`plat-status ${c.Active === 'Y' ? 'dispatched' : 'loading'}`}
            style={{ marginTop: '6px', display: 'inline-block' }}
          >
            {c.Active === 'Y' ? 'Active' : 'Inactive'}
          </span>
        </div>
      ))}
    </div>
  );
}

function SalesInvoicesTab({ data, loading }) {
  if (loading)
    return (
      <div className="plat-empty">
        <div className="loader" /> Loading sales invoices...
      </div>
    );
  if (!data.data || data.data.length === 0)
    return <div className="plat-empty">No sales invoices found</div>;
  return (
    <>
      <div style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '10px' }}>
        {data.count} sales invoice(s)
      </div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Doc #</th>
              <th>Date</th>
              <th>Due Date</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance Due</th>
              <th>Currency</th>
              <th>Status</th>
              <th>Customer Ref</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((doc) => (
              <tr key={doc.DocEntry}>
                <td style={{ fontWeight: 600 }}>{doc.DocNum}</td>
                <td>{doc.DocDate?.split('T')[0]}</td>
                <td>{doc.DocDueDate?.split('T')[0]}</td>
                <td style={{ fontWeight: 600 }}>
                  {Number(doc.DocTotal || 0).toLocaleString()}
                </td>
                <td>{Number(doc.PaidToDate || 0).toLocaleString()}</td>
                <td
                  style={{
                    fontWeight: 600,
                    color:
                      Number(doc.BalanceDue || 0) > 0 ? '#e74c3c' : '#27ae60',
                  }}
                >
                  {Number(doc.BalanceDue || 0).toLocaleString()}
                </td>
                <td>{doc.DocCur}</td>
                <td>
                  <span
                    className={`plat-status ${doc.CANCELED === 'Y' ? 'loading' : doc.DocStatus === 'O' ? 'loading' : 'dispatched'}`}
                  >
                    {doc.CANCELED === 'Y'
                      ? 'Cancelled'
                      : doc.DocStatus === 'O'
                        ? 'Open'
                        : 'Closed'}
                  </span>
                </td>
                <td>{doc.CustomerRef || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DocsTab({ data, loading, type }) {
  if (loading)
    return (
      <div className="plat-empty">
        <div className="loader" /> Loading {type}s...
      </div>
    );
  if (!data.data || data.data.length === 0)
    return <div className="plat-empty">No {type.toLowerCase()}s found</div>;
  return (
    <>
      <div style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '10px' }}>
        {data.count} {type.toLowerCase()}(s)
      </div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Doc #</th>
              <th>Date</th>
              <th>Due Date</th>
              <th>Total</th>
              <th>Currency</th>
              <th>Status</th>
              <th>Vendor Ref</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((doc) => (
              <tr key={doc.DocEntry}>
                <td style={{ fontWeight: 600 }}>{doc.DocNum}</td>
                <td>{doc.DocDate?.split('T')[0]}</td>
                <td>{doc.DocDueDate?.split('T')[0]}</td>
                <td style={{ fontWeight: 600 }}>
                  {Number(doc.DocTotal || 0).toLocaleString()}
                </td>
                <td>{doc.DocCur}</td>
                <td>
                  <span
                    className={`plat-status ${doc.DocStatus === 'O' ? 'loading' : 'dispatched'}`}
                  >
                    {doc.DocStatus === 'O' ? 'Open' : 'Closed'}
                  </span>
                </td>
                <td>{doc.VendorRef || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
