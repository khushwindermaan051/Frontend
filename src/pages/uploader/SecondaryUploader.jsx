import { useState, useRef, useCallback, useEffect } from 'react';
import { useUploaderNav } from '../../context/UploaderContext';
import { parseCSVLine, deduplicateData, buildHeaderMap, formatDate, batchInsert } from './uploaderUtils';
import {
  ShoppingCart, Calendar, ClipboardList, FileText, Settings,
  BarChart2, UploadCloud, Info, Building2, CheckCircle,
  XCircle, AlertTriangle, Loader2,
} from 'lucide-react';
import blinkitLogo from '../../assets/logos/blinkit.png';
import zeptoLogo from '../../assets/logos/zepto.png';
import swiggyLogo from '../../assets/logos/swiggy.png';
import flipkartLogo from '../../assets/logos/flipkart.png';
import jiomartLogo from '../../assets/logos/jiomart.jpg';
import bigbasketLogo from '../../assets/logos/bigbasket.png';
import amazonLogo from '../../assets/logos/amazon.png';
import './uploader.css';

const JIOMART_COLUMN_MAP = {
  'Seller GSTIN': 'SELLER_GSTIN', 'Order ID': 'ORDER_ID', 'Order Item ID': 'ORDER_ITEM_ID',
  'Order Type': 'ORDER_TYPE', 'Order Date': 'ORDER_DATE', 'Order Approval Date': 'ORDER_APPROVAL_DATE',
  'Type': 'TYPE', 'Shipment Number': 'SHIPMENT_NUMBER', 'Original Shipment Number': 'ORIGINAL_SHIPMENT_NUMBER',
  'Fulfillment Type': 'FULFILLMENT_TYPE', 'Fulfiller Name': 'FULFILLER_NAME',
  'Product Title/Description': 'PRODUCT_TITLE', 'FSN / Product ID': 'FSN_PRODUCT_ID', 'SKU': 'SKU',
  'HSN Code': 'HSN_CODE', 'Order Status': 'ORDER_STATUS', 'Event Type': 'EVENT_TYPE',
  'Event Sub Type': 'EVENT_SUB_TYPE', 'Item Quantity': 'ITEM_QUANTITY',
  'Buyer Invoice ID': 'BUYER_INVOICE_ID', 'Original Invoice ID': 'ORIGINAL_INVOICE_ID',
  'Buyer Invoice Date': 'BUYER_INVOICE_DATE', 'Sale/Sale reversal TCS date': 'TCS_DATE',
  'Buyer Invoice Amount': 'BUYER_INVOICE_AMOUNT', 'Order Shipped From (State)': 'SHIPPED_FROM_STATE',
  'Order Billed From (State)': 'BILLED_FROM_STATE', "Customer's Billing Pincode": 'BILLING_PINCODE',
  "Customer's Billing State": 'BILLING_STATE', "Customer's Delivery Pincode": 'DELIVERY_PINCODE',
  "Customer's Delivery State": 'DELIVERY_STATE', 'Seller Coupon Code': 'SELLER_COUPON_CODE',
  'Offer Price': 'OFFER_PRICE', 'Seller Coupon Amount': 'SELLER_COUPON_AMOUNT',
  'Final Invoice Amount (Offer Price minus Seller Coupon Amount)': 'FINAL_INVOICE_AMOUNT',
  'Type of tax': 'TAX_TYPE', 'Taxable Value (Final Invoice Amount -Taxes)': 'TAXABLE_VALUE',
  'IGST Rate': 'IGST_RATE', 'IGST Amount': 'IGST_AMOUNT', 'CGST Rate': 'CGST_RATE',
  'CGST Amount': 'CGST_AMOUNT', 'SGST Rate (or UTGST as applicable)': 'SGST_RATE',
  'SGST Amount (Or UTGST as applicable)': 'SGST_AMOUNT', 'TCS IGST Rate': 'TCS_IGST_RATE',
  'TCS IGST Amount': 'TCS_IGST_AMOUNT', 'TCS CGST Rate': 'TCS_CGST_RATE',
  'TCS CGST Amount': 'TCS_CGST_AMOUNT', 'TCS SGST Rate': 'TCS_SGST_RATE',
  'TCS SGST Amount': 'TCS_SGST_AMOUNT', 'Total TCS Deducted': 'TOTAL_TCS_DEDUCTED',
  'TDS 194O Rate': 'TDS_194O_RATE', 'TDS 194O Amount': 'TDS_194O_AMOUNT',
};

const PLATFORMS = {
  blinkitSec: {
    name: 'Blinkit', logo: blinkitLogo, color: '#F9C22E', bgColor: '#FEF9E7',
    table: 'blinkitSec',
    columns: ['item_id', 'item_name', 'manufacturer_id', 'manufacturer_name', 'city_id', 'city_name', 'category', 'date', 'qty_sold', 'mrp'],
    dateColumn: 'date', dateFormat: 'DD-MM-YYYY', dateExample: '01-12-2025',
    uniqueKey: 'item_id,city_id,date', uniqueKeyFields: ['item_id', 'city_id', 'date'],
    requiredFields: ['item_id', 'city_id'],
    numericFields: ['item_id', 'manufacturer_id', 'city_id', 'qty_sold'], decimalFields: ['mrp'],
    columnMapping: null, isAmazon: false,
  },
  zeptoSec: {
    name: 'Zepto', logo: zeptoLogo, color: '#8B5CF6', bgColor: '#F3E8FF',
    table: 'zeptoSec',
    columns: ['Date', 'SKU Number', 'SKU Name', 'EAN', 'SKU Category', 'SKU Sub Category', 'Brand Name', 'Manufacturer Name', 'Manufacturer ID', 'City', 'Sales (Qty) - Units', 'MRP', 'Gross Merchandise Value'],
    dateColumn: 'Date', dateFormat: 'DD-MM-YYYY', dateExample: '01-12-2025',
    uniqueKey: 'SKU Number,City,Date', uniqueKeyFields: ['SKU Number', 'City', 'Date'],
    requiredFields: ['SKU Number', 'City'],
    numericFields: ['Sales (Qty) - Units'], decimalFields: ['MRP', 'Gross Merchandise Value'],
    columnMapping: null, isAmazon: false,
  },
  swiggySec: {
    name: 'Swiggy Instamart', logo: swiggyLogo, color: '#FC8019', bgColor: '#FFF4E6',
    table: 'swiggySec',
    columns: ['BRAND', 'ORDERED_DATE', 'CITY', 'AREA_NAME', 'STORE_ID', 'L1_CATEGORY', 'L2_CATEGORY', 'L3_CATEGORY', 'PRODUCT_NAME', 'VARIANT', 'ITEM_CODE', 'COMBO', 'COMBO_ITEM_CODE', 'COMBO_UNITS_SOLD', 'BASE_MRP', 'UNITS_SOLD', 'GMV'],
    dateColumn: 'ORDERED_DATE', dateFormat: 'DD-MM-YYYY', dateExample: '13-12-2025',
    uniqueKey: 'ITEM_CODE,STORE_ID,ORDERED_DATE,COMBO', uniqueKeyFields: ['ITEM_CODE', 'STORE_ID', 'ORDERED_DATE', 'COMBO'],
    requiredFields: ['ITEM_CODE', 'STORE_ID'],
    numericFields: ['STORE_ID', 'COMBO_UNITS_SOLD', 'UNITS_SOLD'], decimalFields: ['BASE_MRP', 'GMV'],
    columnMapping: null, isAmazon: false,
  },
  flipkartSec: {
    name: 'Flipkart', logo: flipkartLogo, color: '#2874F0', bgColor: '#E8F4FD',
    table: 'flipkartSec',
    columns: ['Product Id', 'SKU ID', 'Category', 'Brand', 'Vertical', 'Order Date', 'Fulfillment Type', 'Location Id', 'Gross Units', 'GMV', 'Cancellation Units', 'Cancellation Amount', 'Return Units', 'Return Amount', 'Final Sale Units', 'Final Sale Amount'],
    dateColumn: 'Order Date', dateFormat: 'DD-MM-YYYY', dateExample: '21-12-2025',
    uniqueKey: 'SKU ID,Location Id,Order Date,Fulfillment Type', uniqueKeyFields: ['SKU ID', 'Location Id', 'Order Date', 'Fulfillment Type'],
    requiredFields: ['SKU ID', 'Location Id'],
    numericFields: ['Gross Units', 'Cancellation Units', 'Return Units', 'Final Sale Units'],
    decimalFields: ['GMV', 'Cancellation Amount', 'Return Amount', 'Final Sale Amount'],
    columnMapping: null, isAmazon: false,
  },
  jiomartSec: {
    name: 'JioMart', logo: jiomartLogo, color: '#4169E1', bgColor: '#FFFDD0',
    table: 'jiomartSec',
    columns: Object.keys(JIOMART_COLUMN_MAP),
    dateColumn: 'Order Date', dateFormat: 'YYYY-MM-DD HH:MM:SS +TZ', dateExample: '2025-12-05 20:54:13 +0530',
    uniqueKey: 'ORDER_ID,ORDER_ITEM_ID,TYPE', uniqueKeyFields: ['ORDER_ID', 'ORDER_ITEM_ID', 'TYPE'],
    requiredFields: ['Order ID', 'Order Item ID'],
    numericFields: ['Item Quantity'],
    decimalFields: ['Buyer Invoice Amount', 'Offer Price', 'Seller Coupon Amount', 'Final Invoice Amount (Offer Price minus Seller Coupon Amount)', 'Taxable Value (Final Invoice Amount -Taxes)', 'IGST Rate', 'IGST Amount', 'CGST Rate', 'CGST Amount', 'SGST Rate (or UTGST as applicable)', 'SGST Amount (Or UTGST as applicable)', 'TCS IGST Rate', 'TCS IGST Amount', 'TCS CGST Rate', 'TCS CGST Amount', 'TCS SGST Rate', 'TCS SGST Amount', 'Total TCS Deducted', 'TDS 194O Rate', 'TDS 194O Amount'],
    dateFields: ['Order Date', 'Order Approval Date', 'Buyer Invoice Date', 'Sale/Sale reversal TCS date'],
    columnMapping: JIOMART_COLUMN_MAP, isAmazon: false,
  },
  bigbasketSec: {
    name: 'BigBasket', logo: bigbasketLogo, color: '#84C225', bgColor: '#F2F9E8',
    table: 'bigbasketSec',
    columns: ['date_range', 'source_city_name', 'brand_name', 'top_slug', 'mid_slug', 'leaf_slug', 'source_sku_id', 'sku_description', 'sku_weight', 'total_quantity', 'total_mrp', 'total_sales'],
    dateColumn: 'date_range', dateFormat: 'YYYYMMDD - YYYYMMDD', dateExample: '20251226 - 20251226',
    uniqueKey: 'source_sku_id,source_city_name,date_range', uniqueKeyFields: ['source_sku_id', 'source_city_name', 'date_range'],
    requiredFields: ['source_sku_id', 'source_city_name'],
    numericFields: ['total_quantity'], decimalFields: ['total_mrp', 'total_sales'],
    columnMapping: null, isAmazon: false,
  },
  amazon: {
    name: 'Amazon', logo: amazonLogo, color: '#FF9900', bgColor: '#FFF4E6',
    table: 'amazon_sec_daily',
    columns: ['ASIN', 'Product Title', 'Brand', 'Ordered Revenue', 'Ordered Units', 'Shipped Revenue', 'Shipped COGS', 'Shipped Units', 'Customer Returns'],
    dateColumn: null, dateFormat: 'Auto-detected from metadata', dateExample: 'DD/MM/YY from Viewing Range',
    uniqueKey: 'business,asin,report_date', uniqueKeyFields: ['business', 'asin', 'report_date'],
    requiredFields: ['ASIN'],
    numericFields: ['Ordered Units', 'Shipped Units', 'Customer Returns'],
    decimalFields: ['Ordered Revenue', 'Shipped Revenue', 'Shipped COGS'],
    columnMapping: { 'ASIN': 'asin', 'Product Title': 'product_title', 'Brand': 'brand', 'Ordered Revenue': 'ordered_revenue', 'Ordered Units': 'ordered_units', 'Shipped Revenue': 'shipped_revenue', 'Shipped COGS': 'shipped_cogs', 'Shipped Units': 'shipped_units', 'Customer Returns': 'customer_returns' },
    isAmazon: true,
  },
};

const EMPTY_AMZ_META = { businessEntity: null, fromDate: null, toDate: null };

function parseAmazonDate(str) {
  const m = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (!m) return str;
  const year = parseInt(m[3]) > 50 ? '19' + m[3] : '20' + m[3];
  return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function parseData(text, hasHeader, config) {
  const COLS = config.columns;
  const mapping = config.columnMapping;
  const dateFields = config.dateFields || [];

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return { data: [], meta: EMPTY_AMZ_META };

  let amazonMeta = { ...EMPTY_AMZ_META };

  if (config.isAmazon && lines.length > 0) {
    const metaLine = lines[0];
    if (metaLine.includes('Businesses=') || metaLine.includes('Viewing Range=')) {
      const em = metaLine.match(/Businesses=\[([^\]]+)\]/);
      if (em) amazonMeta.businessEntity = em[1].replace(/\.$/, '').trim();
      const rm = metaLine.match(/Viewing Range=\[([^\]]+)\]/);
      if (rm) {
        const parts = rm[1].split(' - ');
        if (parts.length === 2) {
          amazonMeta.fromDate = parseAmazonDate(parts[0]);
          amazonMeta.toDate = parseAmazonDate(parts[1]);
        }
      }
      lines = lines.slice(1);
    }
  }

  const firstLine = lines[0] || '';
  const delim = firstLine.indexOf('\t') !== -1 ? '\t' : ',';

  let headers = [];
  let startIdx = 0;
  if (hasHeader && lines.length > 0) { headers = parseCSVLine(lines[0], delim); startIdx = 1; }

  const headerMap = config.isAmazon
    ? COLS.reduce((m, c, i) => { m[c] = i; return m; }, {})
    : buildHeaderMap(COLS, headers);

  const result = [];

  for (let i = startIdx; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i], delim);
    if (vals.length < 3) continue;
    if (config.isAmazon && vals[0] && vals[0].toUpperCase() === 'ASIN') continue;

    const row = {};
    for (const col of COLS) {
      const idx = headerMap[col];
      let val = idx < vals.length ? vals[idx] : null;
      if (val === '' || val === undefined) val = null;
      if (val !== null && config.numericFields && config.numericFields.includes(col)) { val = parseInt(String(val).replace(/[^\d-]/g, '')); if (isNaN(val)) val = null; }
      if (val !== null && config.decimalFields && config.decimalFields.includes(col)) { val = parseFloat(String(val).replace(/[^\d.-]/g, '')); if (isNaN(val)) val = null; }
      if (val !== null && (col === config.dateColumn || dateFields.includes(col))) val = formatDate(val);
      const dbCol = mapping ? mapping[col] : col;
      if (dbCol) row[dbCol] = val;
    }

    const hasReq = config.requiredFields.every(r => { const dbR = mapping ? mapping[r] : r; return row[dbR]; });
    if (hasReq) result.push(row);
  }

  return { data: result, meta: amazonMeta };
}

function PreviewTable({ data }) {
  if (!data.length) return null;
  const allCols = Object.keys(data[0]);
  const showCols = allCols.slice(0, 10);
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {showCols.map(c => <th key={c}>{c}</th>)}
            {allCols.length > 10 && <th>...</th>}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 50).map((row, i) => (
            <tr key={i}>
              {showCols.map(c => {
                let val = row[c] ?? '';
                if (String(val).length > 20) val = String(val).slice(0, 20) + '...';
                return <td key={c}>{val}</td>;
              })}
              {allCols.length > 10 && <td>...</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const MSG_ICONS = {
  success: <CheckCircle size={15} />,
  error: <XCircle size={15} />,
  warning: <AlertTriangle size={15} />,
};

function Msg({ msg }) {
  if (!msg) return null;
  const cleanText = msg.text.replace(/^[✅❌⚠️⏳]\s*/, '');
  return (
    <div className={`msg msg-${msg.type}`}>
      {MSG_ICONS[msg.type]}
      <span>{cleanText}</span>
    </div>
  );
}

export default function SecondaryUploader() {
  const [platform, setPlatform] = useState('blinkitSec');
  const config = PLATFORMS[platform];

  const [activeTab, setActiveTab] = useState('paste');
  const [amazonType, setAmazonType] = useState('daily');

  const [pasteText, setPasteText] = useState('');
  const [pasteHasHeader, setPasteHasHeader] = useState(true);
  const [pasteUpsert, setPasteUpsert] = useState(true);
  const [pasteData, setPasteData] = useState([]);
  const [pasteMsg, setPasteMsg] = useState(null);
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pasteMeta, setPasteMeta] = useState(EMPTY_AMZ_META);

  const csvInputRef = useRef(null);
  const [csvHasHeader, setCsvHasHeader] = useState(true);
  const [csvUpsert, setCsvUpsert] = useState(true);
  const [csvData, setCsvData] = useState([]);
  const [csvMsg, setCsvMsg] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvMeta, setCsvMeta] = useState(EMPTY_AMZ_META);
  const [isDragOver, setIsDragOver] = useState(false);

  const clearAll = useCallback(() => {
    setPasteText(''); setPasteData([]); setPasteMsg(null); setPasteMeta(EMPTY_AMZ_META);
    setCsvData([]); setCsvMsg(null); setCsvMeta(EMPTY_AMZ_META);
  }, []);

  const handlePlatformChange = useCallback((key) => { setPlatform(key); clearAll(); }, [clearAll]);

  const { setNavItems } = useUploaderNav();
  useEffect(() => {
    setNavItems(Object.entries(PLATFORMS).map(([key, cfg]) => ({
      key, name: cfg.name, logo: cfg.logo, color: cfg.color, active: key === platform,
      onSelect: () => handlePlatformChange(key),
    })));
    return () => setNavItems([]);
  }, [platform, handlePlatformChange, setNavItems]);

  const displayCols = (() => {
    const mapping = config.columnMapping;
    return mapping ? Object.values(mapping) : config.columns;
  })();

  const targetTable = config.isAmazon ? (amazonType === 'range' ? 'amazon_sec_range' : 'amazon_sec_daily') : config.table;
  const targetUniqueKey = config.isAmazon ? (amazonType === 'range' ? 'business,asin,from_date,to_date' : 'business,asin,report_date') : config.uniqueKey;

  function handlePasteParse() {
    const text = pasteText.trim();
    if (!text) { setPasteMsg({ type: 'warning', text: 'Please paste some data first' }); return; }
    const { data, meta } = parseData(text, pasteHasHeader, config);
    if (config.isAmazon) setPasteMeta(meta);
    setPasteData(data);
    if (data.length > 0) setPasteMsg({ type: 'success', text: `Found ${data.length} rows for ${config.name}` });
    else setPasteMsg({ type: 'error', text: 'No valid data found.' });
  }

  function handleFileRead(file, forTab) {
    const reader = new FileReader();
    reader.onload = e => {
      const { data, meta } = parseData(e.target.result, forTab === 'csv' ? csvHasHeader : pasteHasHeader, config);
      if (forTab === 'csv') { setCsvData(data); setCsvMeta(meta); if (data.length > 0) setCsvMsg({ type: 'success', text: `Found ${data.length} rows from ${file.name}` }); else setCsvMsg({ type: 'error', text: 'No valid data found in file' }); }
    };
    reader.readAsText(file);
  }

  async function handleInsert(type) {
    const rawData = type === 'paste' ? pasteData : csvData;
    const meta = type === 'paste' ? pasteMeta : csvMeta;
    const upsert = type === 'paste' ? pasteUpsert : csvUpsert;
    const setMsg = type === 'paste' ? setPasteMsg : setCsvMsg;
    const setLoading = type === 'paste' ? setPasteLoading : setCsvLoading;

    if (rawData.length === 0) { setMsg({ type: 'warning', text: 'No data to insert' }); return; }

    if (config.isAmazon) {
      if (!meta.businessEntity) { setMsg({ type: 'error', text: 'Could not detect Business Entity from data. Make sure the metadata row is included.' }); return; }
      if (!meta.fromDate) { setMsg({ type: 'error', text: 'Could not detect date from data. Make sure the metadata row is included.' }); return; }
    }

    setLoading(true);
    setMsg({ type: 'warning', text: `Inserting to ${targetTable}...` });

    let processedData = rawData;
    if (config.isAmazon) {
      const isRange = amazonType === 'range';
      processedData = rawData.map(row =>
        isRange
          ? { ...row, business: meta.businessEntity, from_date: meta.fromDate, to_date: meta.toDate }
          : { ...row, business: meta.businessEntity, report_date: meta.fromDate }
      );
    }

    const dedupedData = deduplicateData(processedData, config.isAmazon ? (amazonType === 'range' ? ['business', 'asin', 'from_date', 'to_date'] : ['business', 'asin', 'report_date']) : config.uniqueKeyFields);
    const dupsRemoved = processedData.length - dedupedData.length;

    try {
      const result = await batchInsert(targetTable, dedupedData, targetUniqueKey, upsert);
      const success = result.success || 0;
      const failed = result.failed || 0;
      if (failed === 0) {
        let msg = `Inserted ${success} rows to ${targetTable}`;
        if (dupsRemoved > 0) msg += ` (${dupsRemoved} duplicates merged)`;
        setMsg({ type: 'success', text: msg });
      } else if (success > 0) {
        setMsg({ type: 'warning', text: `Inserted ${success}, failed ${failed}: ${result.error || ''}` });
      } else {
        setMsg({ type: 'error', text: `Failed: ${result.error || 'Unknown error'}` });
      }
    } catch (err) {
      setMsg({ type: 'error', text: `Failed: ${err.message}` });
    }
    setLoading(false);
  }

  const activeMeta = activeTab === 'paste' ? pasteMeta : csvMeta;

  return (
    <div className="uploader-root">
      <h1><ShoppingCart size={20} /> Secondary Sales</h1>
      <p className="subtitle">All Platform Secondary Storage Tool</p>

        {/* Current platform badge */}
        <div className="current-platform" style={{ background: config.bgColor, borderColor: config.color }}>
          <img src={config.logo} alt={config.name} className="platform-btn-logo" />
          <span style={{ color: config.color, fontWeight: 700 }}>{config.name}</span>
          <span className="platform-badge-arrow">→</span>
          <span className="platform-badge-table">{targetTable}</span>
        </div>

        {/* Amazon type selector */}
        {config.isAmazon && (
          <div className="amazon-options">
            <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <strong><BarChart2 size={13} /> Data Type:</strong>
                <label style={{ marginLeft: 10, cursor: 'pointer' }}><input type="radio" name="amz-type" value="daily" checked={amazonType === 'daily'} onChange={() => setAmazonType('daily')} /> Daily</label>
                <label style={{ marginLeft: 10, cursor: 'pointer' }}><input type="radio" name="amz-type" value="range" checked={amazonType === 'range'} onChange={() => setAmazonType('range')} /> Range</label>
              </div>
            </div>
            {activeMeta.fromDate && (
              <div className="amazon-detected-info">
                <strong><ClipboardList size={13} /> Detected:</strong>
                <span style={{ marginLeft: 8 }}><Building2 size={13} /> {activeMeta.businessEntity || '-'}</span> |
                <span style={{ marginLeft: 8 }}><Calendar size={13} /> {activeMeta.fromDate !== activeMeta.toDate ? `${activeMeta.fromDate} to ${activeMeta.toDate}` : activeMeta.fromDate}</span>
              </div>
            )}
          </div>
        )}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'paste' ? 'active' : ''}`} onClick={() => setActiveTab('paste')}>
          <ClipboardList size={14} /> Copy/Paste
        </button>
        <button className={`tab-btn ${activeTab === 'csv' ? 'active' : ''}`} onClick={() => setActiveTab('csv')}>
          <FileText size={14} /> CSV Upload
        </button>
      </div>

      {/* Paste tab */}
      <div className={`tab-panel ${activeTab === 'paste' ? 'active' : ''}`}>
        <div className="info">
          <strong><Info size={13} /> How to use:</strong> Select platform → Copy from Excel → Paste below → Parse → Insert<br />
          <strong>Columns ({displayCols.length}):</strong>
          <div className="columns-display">{displayCols.slice(0, 15).map(c => <code key={c}>{c}</code>)}{displayCols.length > 15 && <code>...</code>}</div>
          <div className="date-format"><Calendar size={13} /> Date Format: <strong>{config.dateFormat}</strong> (e.g., {config.dateExample})</div>
        </div>
        <div className="settings">
          <strong><Settings size={13} /> Settings:</strong>
          <label><input type="checkbox" checked={pasteHasHeader} onChange={e => setPasteHasHeader(e.target.checked)} /> First row is header</label>
          <label><input type="checkbox" checked={pasteUpsert} onChange={e => setPasteUpsert(e.target.checked)} /> Update existing (Upsert)</label>
        </div>
        <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Paste your Excel/Sheets data here..." />
        <div>
          <button className="btn btn-primary" onClick={handlePasteParse} disabled={pasteLoading}>Parse Data</button>
          <button className="btn btn-secondary" onClick={() => { setPasteText(''); setPasteData([]); setPasteMsg(null); setPasteMeta(EMPTY_AMZ_META); }} disabled={pasteLoading}>Clear</button>
        </div>
        {pasteData.length > 0 && (
          <div>
            <h3><BarChart2 size={16} /> Preview <span className="row-badge">{pasteData.length} rows</span></h3>
            <PreviewTable data={pasteData} />
            <button className="btn btn-primary" onClick={() => handleInsert('paste')} disabled={pasteLoading}>
              {pasteLoading ? <><Loader2 size={14} className="spin" /> Inserting...</> : 'Insert All Data'}
            </button>
          </div>
        )}
        {pasteLoading && <div className="progress"><div className="progress-bar"><div className="progress-fill" style={{ width: '100%' }}>Processing...</div></div></div>}
        <Msg msg={pasteMsg} />
      </div>

      {/* CSV tab */}
      <div className={`tab-panel ${activeTab === 'csv' ? 'active' : ''}`}>
        <div className="info">
          <strong><FileText size={13} /> Upload CSV/TSV file</strong><br />
          <strong>Columns ({displayCols.length}):</strong>
          <div className="columns-display">{displayCols.slice(0, 15).map(c => <code key={c}>{c}</code>)}{displayCols.length > 15 && <code>...</code>}</div>
          <div className="date-format"><Calendar size={13} /> Date Format: <strong>{config.dateFormat}</strong> (e.g., {config.dateExample})</div>
        </div>
        <div className="settings">
          <strong><Settings size={13} /> Settings:</strong>
          <label><input type="checkbox" checked={csvHasHeader} onChange={e => setCsvHasHeader(e.target.checked)} /> First row is header</label>
          <label><input type="checkbox" checked={csvUpsert} onChange={e => setCsvUpsert(e.target.checked)} /> Update existing (Upsert)</label>
        </div>
        <div
          className={`upload-box ${isDragOver ? 'drag-over' : ''}`}
          onClick={() => csvInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={e => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length > 0) handleFileRead(e.dataTransfer.files[0], 'csv'); }}
        >
          <input ref={csvInputRef} type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }}
            onChange={e => { if (e.target.files.length > 0) handleFileRead(e.target.files[0], 'csv'); }} />
          <UploadCloud size={40} style={{ color: '#667eea' }} />
          <div>Click to upload or drag &amp; drop</div>
          <div className="upload-box-hint">CSV, TSV files</div>
        </div>
        {csvData.length > 0 && (
          <div>
            <h3><BarChart2 size={16} /> Preview <span className="row-badge">{csvData.length} rows</span></h3>
            <PreviewTable data={csvData} />
            <div>
              <button className="btn btn-primary" onClick={() => handleInsert('csv')} disabled={csvLoading}>
                {csvLoading ? <><Loader2 size={14} className="spin" /> Inserting...</> : 'Insert All Data'}
              </button>
              <button className="btn btn-secondary" onClick={() => { setCsvData([]); setCsvMsg(null); setCsvMeta(EMPTY_AMZ_META); }} disabled={csvLoading}>Clear</button>
            </div>
          </div>
        )}
        {csvLoading && <div className="progress"><div className="progress-bar"><div className="progress-fill" style={{ width: '100%' }}>Processing...</div></div></div>}
        <Msg msg={csvMsg} />
      </div>
    </div>
  );
}
