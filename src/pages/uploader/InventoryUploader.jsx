import { useState, useRef, useCallback, useEffect } from 'react';
import { useUploaderNav } from '../../context/UploaderContext';
import { parseCSVLine, deduplicateData, buildHeaderMap, batchInsert } from './uploaderUtils';
import {
  Package, Calendar, ClipboardList, FileText, Settings,
  BarChart2, UploadCloud, Info, Building2, CheckCircle,
  XCircle, AlertTriangle, Loader2,
} from 'lucide-react';
import blinkitLogo from '../../assets/logos/blinkit.png';
import zeptoLogo from '../../assets/logos/zepto.png';
import swiggyLogo from '../../assets/logos/swiggy.png';
import bigbasketLogo from '../../assets/logos/bigbasket.png';
import jiomartLogo from '../../assets/logos/jiomart.jpg';
import amazonLogo from '../../assets/logos/amazon.png';
import './uploader.css';

const AMAZON_COLUMN_MAPPING = {
  'ASIN': 'asin',
  'Product Title': 'product_title',
  'Brand': 'brand',
  'Sourceable Product OOS %': 'sourceable_product_oos_pct',
  'Vendor Confirmation %': 'vendor_confirmation_pct',
  'Net Received': 'net_received',
  'Net Received Units': 'net_received_units',
  'Open Purchase Order Quantity': 'open_purchase_order_quantity',
  'Receive Fill %': 'receive_fill_pct',
  'Overall Vendor Lead Time (days)': 'overall_vendor_lead_time_days',
  'Unfilled Customer Ordered Units': 'unfilled_customer_ordered_units',
  'Aged 90+ Days Sellable Inventory': 'aged_90_days_sellable_inventory',
  'Aged 90+ Days Sellable Units': 'aged_90_days_sellable_units',
  'Sellable On-Hand Inventory': 'sellable_on_hand_inventory',
  'Sellable On Hand Units': 'sellable_on_hand_units',
  'Unsellable On-Hand Inventory': 'unsellable_on_hand_inventory',
  'Unsellable On-Hand Units': 'unsellable_on_hand_units',
};
const AMAZON_COLUMNS = Object.keys(AMAZON_COLUMN_MAPPING);

const PLATFORMS = {
  blinkitInv: {
    name: 'Blinkit', logo: blinkitLogo, color: '#F9C22E', bgColor: '#FEF9E7',
    table: 'blinkit_inventory',
    columns: ['created_at', 'backend_facility_name', 'backend_facility_id', 'item_id', 'item_name', 'backend_inv_qty', 'frontend_inv_qty', 'Total'],
    uniqueKey: 'inventory_date,backend_facility_id,item_id',
    uniqueKeyFields: ['inventory_date', 'backend_facility_id', 'item_id'],
    requiredFields: ['backend_facility_id', 'item_id'],
    numericFields: ['backend_inv_qty', 'frontend_inv_qty'],
    decimalFields: [], ignoreFields: ['Total'], textFields: [],
    columnMapping: { 'created_at': 'raw_created_at', 'backend_facility_name': 'backend_facility_name', 'backend_facility_id': 'backend_facility_id', 'item_id': 'item_id', 'item_name': 'item_name', 'backend_inv_qty': 'backend_inv_qty', 'frontend_inv_qty': 'frontend_inv_qty' },
    showBlinkitNote: true, isAmazon: false,
  },
  zeptoInv: {
    name: 'Zepto', logo: zeptoLogo, color: '#8B5CF6', bgColor: '#F3E8FF',
    table: 'zepto_inventory',
    columns: ['City', 'SKU Name', 'SKU Code', 'EAN', 'SKU Category', 'SKU Sub Category', 'Brand Name', 'Manufacturer Name', 'Manufacturer ID', 'Units'],
    uniqueKey: 'inventory_date,city,sku_code',
    uniqueKeyFields: ['inventory_date', 'city', 'sku_code'],
    requiredFields: ['City', 'SKU Code'],
    numericFields: ['Units'], decimalFields: [], ignoreFields: [], textFields: [],
    columnMapping: { 'City': 'city', 'SKU Name': 'sku_name', 'SKU Code': 'sku_code', 'EAN': 'ean', 'SKU Category': 'sku_category', 'SKU Sub Category': 'sku_sub_category', 'Brand Name': 'brand_name', 'Manufacturer Name': 'manufacturer_name', 'Manufacturer ID': 'manufacturer_id', 'Units': 'units' },
    showBlinkitNote: false, isAmazon: false,
  },
  swiggyInv: {
    name: 'Swiggy Instamart', logo: swiggyLogo, color: '#FC8019', bgColor: '#FFF4E6',
    table: 'swiggy_inventory',
    columns: ['StorageType', 'FacilityName', 'City', 'SkuCode', 'SkuDescription', 'L1', 'L2', 'ShelfLifeDays', 'BusinessCategory', 'DaysOnHand', 'PotentialGmvLoss', 'OpenPos', 'OpenPoQuantity', 'WarehouseQtyAvailable'],
    uniqueKey: 'inventory_date,facility_name,sku_code,storage_type',
    uniqueKeyFields: ['inventory_date', 'facility_name', 'sku_code', 'storage_type'],
    requiredFields: ['FacilityName', 'SkuCode'],
    numericFields: ['ShelfLifeDays', 'DaysOnHand', 'OpenPos', 'OpenPoQuantity', 'WarehouseQtyAvailable'],
    decimalFields: ['PotentialGmvLoss'], ignoreFields: [], textFields: [],
    columnMapping: { 'StorageType': 'storage_type', 'FacilityName': 'facility_name', 'City': 'city', 'SkuCode': 'sku_code', 'SkuDescription': 'sku_description', 'L1': 'l1', 'L2': 'l2', 'ShelfLifeDays': 'shelf_life_days', 'BusinessCategory': 'business_category', 'DaysOnHand': 'days_on_hand', 'PotentialGmvLoss': 'potential_gmv_loss', 'OpenPos': 'open_pos', 'OpenPoQuantity': 'open_po_quantity', 'WarehouseQtyAvailable': 'warehouse_qty_available' },
    showBlinkitNote: false, isAmazon: false,
  },
  bigbasketInv: {
    name: 'BigBasket', logo: bigbasketLogo, color: '#84C225', bgColor: '#F2F9E8',
    table: 'bigbasket_inventory',
    columns: ['city', 'sku_id', 'brand_name', 'sku_name', 'sku_weight', 'sku_pack_type', 'sku_description', 'top_category_name', 'mid_category_name', 'leaf_category_name', 'soh', 'soh_value'],
    uniqueKey: 'inventory_date,city,sku_id',
    uniqueKeyFields: ['inventory_date', 'city', 'sku_id'],
    requiredFields: ['city', 'sku_id'],
    numericFields: ['soh'], decimalFields: ['soh_value'], ignoreFields: [], textFields: [],
    columnMapping: null, showBlinkitNote: false, isAmazon: false,
  },
  jiomartInv: {
    name: 'JioMart', logo: jiomartLogo, color: '#0078AD', bgColor: '#E6F3F8',
    table: 'jiomart_inventory',
    columns: ['RFC Name', 'SKU ID', 'Title', 'Category', 'Product Status', 'Last updated at', 'TOTAL_SELLABLE_INV', 'TOTAL_UNSELLABLE_INV', 'FC_DMG_INV', 'LSP_DMG_INV', 'CUST_DMG_INV', 'RECVD_DMG', 'EXPIRED_INV', 'OTHER_UNSELLABLE_INV', 'MTD_FWD_INTRANSIT', 'MTD_DELVD_CUST', 'MTD_RET_INTRANSIT', 'MTD_ORDER_COUNT'],
    uniqueKey: 'inventory_date,rfc_name,sku_id',
    uniqueKeyFields: ['inventory_date', 'rfc_name', 'sku_id'],
    requiredFields: ['RFC Name', 'SKU ID'],
    numericFields: ['TOTAL_SELLABLE_INV', 'TOTAL_UNSELLABLE_INV', 'FC_DMG_INV', 'LSP_DMG_INV', 'CUST_DMG_INV', 'RECVD_DMG', 'EXPIRED_INV', 'OTHER_UNSELLABLE_INV', 'MTD_FWD_INTRANSIT', 'MTD_DELVD_CUST', 'MTD_RET_INTRANSIT', 'MTD_ORDER_COUNT'],
    decimalFields: [], ignoreFields: [], textFields: [],
    columnMapping: { 'RFC Name': 'rfc_name', 'SKU ID': 'sku_id', 'Title': 'title', 'Category': 'category', 'Product Status': 'product_status', 'Last updated at': 'last_updated_at', 'TOTAL_SELLABLE_INV': 'total_sellable_inv', 'TOTAL_UNSELLABLE_INV': 'total_unsellable_inv', 'FC_DMG_INV': 'fc_dmg_inv', 'LSP_DMG_INV': 'lsp_dmg_inv', 'CUST_DMG_INV': 'cust_dmg_inv', 'RECVD_DMG': 'recvd_dmg', 'EXPIRED_INV': 'expired_inv', 'OTHER_UNSELLABLE_INV': 'other_unsellable_inv', 'MTD_FWD_INTRANSIT': 'mtd_fwd_intransit', 'MTD_DELVD_CUST': 'mtd_delvd_cust', 'MTD_RET_INTRANSIT': 'mtd_ret_intransit', 'MTD_ORDER_COUNT': 'mtd_order_count' },
    showBlinkitNote: false, isAmazon: false,
  },
  amazonInv: {
    name: 'Amazon', logo: amazonLogo, color: '#FF9900', bgColor: '#FFF4E6',
    table: 'amazon_inventory',
    columns: AMAZON_COLUMNS,
    uniqueKey: 'inventory_date,asin,business',
    uniqueKeyFields: ['inventory_date', 'asin', 'business'],
    requiredFields: ['ASIN'],
    numericFields: ['Net Received Units', 'Open Purchase Order Quantity', 'Overall Vendor Lead Time (days)', 'Unfilled Customer Ordered Units', 'Aged 90+ Days Sellable Units', 'Sellable On Hand Units', 'Unsellable On-Hand Units'],
    decimalFields: ['Net Received', 'Aged 90+ Days Sellable Inventory', 'Sellable On-Hand Inventory', 'Unsellable On-Hand Inventory'],
    textFields: ['Sourceable Product OOS %', 'Vendor Confirmation %', 'Receive Fill %'],
    ignoreFields: [], columnMapping: AMAZON_COLUMN_MAPPING,
    showBlinkitNote: false, isAmazon: true,
  },
};

const EMPTY_AMAZON = { entity: null, business: null, table: 'amazon_inventory', date: null, rawViewingRange: null };
const today = new Date().toISOString().split('T')[0];

function parseAmazonMetadata(firstLine) {
  const r = { ...EMPTY_AMAZON };
  const bm = firstLine.match(/Businesses=\[([^\]]+)\]/);
  if (bm) {
    const b = bm[1].trim();
    if (b.toLowerCase().includes('jivo mart') || b.toLowerCase().includes('jivo mart private')) {
      r.entity = 'JMPL (Jivo Mart Pvt Ltd)'; r.business = 'JIVO MART PVT LTD';
    } else if (b.toLowerCase().includes('jivo wellness') || b.toLowerCase().includes('wellness')) {
      r.entity = 'JWPL (Jivo Wellness Pvt Ltd)'; r.business = 'JIVO WELLNESS PVT LTD';
    }
  }
  const vm = firstLine.match(/Viewing Range=\[([^\]]+)\]/);
  if (vm) {
    r.rawViewingRange = vm[1].trim();
    const dm = r.rawViewingRange.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
    if (dm) {
      r.date = `20${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
    }
  }
  return r;
}

function parseAmazonData(text, inventoryDate, rawViewingRange, amzDetected) {
  const COLS = AMAZON_COLUMNS;
  const mapping = AMAZON_COLUMN_MAPPING;
  const textFields = ['Sourceable Product OOS %', 'Vendor Confirmation %', 'Receive Fill %'];
  const numericFields = PLATFORMS.amazonInv.numericFields;
  const decimalFields = PLATFORMS.amazonInv.decimalFields;

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headerLine = lines[1];
  const delim = headerLine.indexOf('\t') !== -1 ? '\t' : ',';
  const headers = parseCSVLine(headerLine, delim);
  const headerMap = {};
  for (let i = 0; i < COLS.length; i++) {
    const col = COLS[i];
    let idx = headers.findIndex(h => h === col);
    if (idx === -1) idx = headers.findIndex(h => h.toLowerCase() === col.toLowerCase());
    if (idx === -1) {
      const cc = col.toLowerCase().replace(/[^a-z0-9]/g, '');
      idx = headers.findIndex(h => { const hc = h.toLowerCase().replace(/[^a-z0-9]/g, ''); return hc === cc || hc.includes(cc) || cc.includes(hc); });
    }
    headerMap[col] = idx === -1 ? i : idx;
  }

  const result = [];
  for (let i = 2; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i], delim);
    if (vals.length < 3) continue;
    const row = { inventory_date: inventoryDate, raw_viewing_range: rawViewingRange, business: amzDetected.business };
    for (const col of COLS) {
      const idx = headerMap[col];
      let val = idx < vals.length ? vals[idx] : null;
      if (val === '' || val === undefined) val = null;
      if (!textFields.includes(col)) {
        if (val !== null && numericFields.includes(col)) { val = parseInt(String(val).replace(/[^\d-]/g, '')); if (isNaN(val)) val = 0; }
        if (val !== null && decimalFields.includes(col)) { val = parseFloat(String(val).replace(/,/g, '').replace(/[^\d.-]/g, '')); if (isNaN(val)) val = 0; }
      }
      const dbCol = mapping[col];
      if (dbCol) row[dbCol] = val;
    }
    const hasReq = PLATFORMS.amazonInv.requiredFields.every(r => {
      const dbR = mapping[r]; return row[dbR];
    });
    if (hasReq) result.push(row);
  }
  return result;
}

function parseData(text, hasHeader, inventoryDate, config) {
  const COLS = config.columns;
  const mapping = config.columnMapping;
  const ignoreFields = config.ignoreFields || [];

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  const firstLine = lines[0];
  const delim = firstLine.indexOf('\t') !== -1 ? '\t' : ',';

  let headers = [];
  let startIdx = 0;
  if (hasHeader) { headers = parseCSVLine(lines[0], delim); startIdx = 1; }

  const headerMap = buildHeaderMap(COLS, headers, ignoreFields);
  const result = [];

  for (let i = startIdx; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i], delim);
    if (vals.length < 3) continue;
    const row = { inventory_date: inventoryDate };
    for (const col of COLS) {
      if (ignoreFields.includes(col)) continue;
      const idx = headerMap[col];
      let val = idx < vals.length ? vals[idx] : null;
      if (val === '' || val === undefined) val = null;
      if (val !== null && config.numericFields && config.numericFields.includes(col)) { val = parseInt(String(val).replace(/[^\d-]/g, '')); if (isNaN(val)) val = 0; }
      if (val !== null && config.decimalFields && config.decimalFields.includes(col)) { val = parseFloat(String(val).replace(/,/g, '').replace(/[^\d.-]/g, '')); if (isNaN(val)) val = 0; }
      const dbCol = mapping ? mapping[col] : col;
      if (dbCol) row[dbCol] = val;
    }
    const hasReq = config.requiredFields.every(r => { const dbR = mapping ? mapping[r] : r; return row[dbR]; });
    if (hasReq) result.push(row);
  }
  return result;
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
                if (String(val).length > 25) val = String(val).slice(0, 25) + '...';
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

export default function InventoryUploader() {
  const [platform, setPlatform] = useState('blinkitInv');
  const config = PLATFORMS[platform];

  const [date, setDate] = useState(today);
  const [activeTab, setActiveTab] = useState('paste');

  const [pasteText, setPasteText] = useState('');
  const [pasteHasHeader, setPasteHasHeader] = useState(true);
  const [pasteUpsert, setPasteUpsert] = useState(true);
  const [pasteData, setPasteData] = useState([]);
  const [pasteMsg, setPasteMsg] = useState(null);
  const [pasteLoading, setPasteLoading] = useState(false);

  const csvInputRef = useRef(null);
  const [csvHasHeader, setCsvHasHeader] = useState(true);
  const [csvUpsert, setCsvUpsert] = useState(true);
  const [csvData, setCsvData] = useState([]);
  const [csvMsg, setCsvMsg] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const [amazonDetected, setAmazonDetected] = useState(EMPTY_AMAZON);

  const clearAll = useCallback(() => {
    setPasteText(''); setPasteData([]); setPasteMsg(null);
    setCsvData([]); setCsvMsg(null);
    setAmazonDetected(EMPTY_AMAZON);
  }, []);

  const handlePlatformChange = useCallback((key) => {
    setPlatform(key);
    clearAll();
  }, [clearAll]);

  const { setNavItems } = useUploaderNav();
  useEffect(() => {
    setNavItems(Object.entries(PLATFORMS).map(([key, cfg]) => ({
      key, name: cfg.name, logo: cfg.logo, color: cfg.color, active: key === platform,
      onSelect: () => handlePlatformChange(key),
    })));
    return () => setNavItems([]);
  }, [platform, handlePlatformChange, setNavItems]);

  const displayCols = (() => {
    const cols = config.columns.filter(c => !config.ignoreFields.includes(c));
    return config.columnMapping ? cols.map(c => config.columnMapping[c] || c) : cols;
  })();

  function handlePasteParse() {
    const text = pasteText.trim();
    if (!text) { setPasteMsg({ type: 'warning', text: 'Please paste some data first' }); return; }

    if (config.isAmazon) {
      const lines = text.split('\n');
      if (lines.length < 2) { setPasteMsg({ type: 'error', text: 'Amazon data must include metadata row and header row' }); return; }
      const amz = parseAmazonMetadata(lines[0]);
      if (!amz.business) { setPasteMsg({ type: 'error', text: 'Could not detect entity (JMPL/JWPL) from data. Check first row contains Businesses=[...]' }); return; }
      if (!amz.date) { setPasteMsg({ type: 'error', text: 'Could not detect date from data. Check first row contains Viewing Range=[...]' }); return; }
      setAmazonDetected(amz);
      const data = parseAmazonData(text, amz.date, amz.rawViewingRange, amz);
      setPasteData(data);
      if (data.length > 0) setPasteMsg({ type: 'success', text: `Found ${data.length} rows for ${amz.table} (Date: ${amz.date})` });
      else setPasteMsg({ type: 'error', text: 'No valid data found. Check column format.' });
    } else {
      if (!date) { setPasteMsg({ type: 'error', text: 'Please select an inventory date first' }); return; }
      const data = parseData(text, pasteHasHeader, date, config);
      setPasteData(data);
      if (data.length > 0) setPasteMsg({ type: 'success', text: `Found ${data.length} rows for ${config.table} (Date: ${date})` });
      else setPasteMsg({ type: 'error', text: 'No valid data found. Check column format.' });
    }
  }

  function processFile(text, forTab) {
    const setData = forTab === 'paste' ? setPasteData : setCsvData;
    const setMsg = forTab === 'paste' ? setPasteMsg : setCsvMsg;
    const hasHeader = forTab === 'paste' ? pasteHasHeader : csvHasHeader;

    if (config.isAmazon) {
      const lines = text.split('\n');
      if (lines.length < 2) { setMsg({ type: 'error', text: 'Amazon data must include metadata row and header row' }); return; }
      const amz = parseAmazonMetadata(lines[0]);
      if (!amz.business) { setMsg({ type: 'error', text: 'Could not detect entity (JMPL/JWPL) from data' }); return; }
      if (!amz.date) { setMsg({ type: 'error', text: 'Could not detect date from data' }); return; }
      setAmazonDetected(amz);
      const data = parseAmazonData(text, amz.date, amz.rawViewingRange, amz);
      setData(data);
      if (data.length > 0) setMsg({ type: 'success', text: `Found ${data.length} rows (Date: ${amz.date})` });
      else setMsg({ type: 'error', text: 'No valid data found in file' });
    } else {
      if (!date) { setMsg({ type: 'error', text: 'Please select an inventory date first' }); return; }
      const data = parseData(text, hasHeader, date, config);
      setData(data);
      if (data.length > 0) setMsg({ type: 'success', text: `Found ${data.length} rows (Date: ${date})` });
      else setMsg({ type: 'error', text: 'No valid data found in file' });
    }
  }

  function handleFileRead(file, forTab) {
    const reader = new FileReader();
    reader.onload = e => processFile(e.target.result, forTab);
    reader.readAsText(file);
  }

  async function handleInsert(type) {
    const data = type === 'paste' ? pasteData : csvData;
    const upsert = type === 'paste' ? pasteUpsert : csvUpsert;
    const setMsg = type === 'paste' ? setPasteMsg : setCsvMsg;
    const setLoading = type === 'paste' ? setPasteLoading : setCsvLoading;

    if (data.length === 0) { setMsg({ type: 'warning', text: 'No data to insert' }); return; }

    let tableName = config.table;
    let uniqueKey = config.uniqueKey;
    let uniqueKeyFields = config.uniqueKeyFields;

    if (config.isAmazon) {
      if (!amazonDetected.business) { setMsg({ type: 'error', text: 'Amazon entity not detected. Please re-parse the data.' }); return; }
      tableName = 'amazon_inventory';
      uniqueKey = 'inventory_date,asin,business';
      uniqueKeyFields = ['inventory_date', 'asin', 'business'];
    }

    setLoading(true);
    setMsg({ type: 'warning', text: `Inserting to ${tableName}...` });

    const dedupedData = deduplicateData(data, uniqueKeyFields);
    const dupsRemoved = data.length - dedupedData.length;

    try {
      const result = await batchInsert(tableName, dedupedData, uniqueKey, upsert);
      const success = result.success || 0;
      const failed = result.failed || 0;
      if (failed === 0) {
        let msg = `Inserted ${success} rows to ${tableName}`;
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

  return (
    <div className="uploader-root">
      <h1><Package size={20} /> Inventory Management</h1>
      <p className="subtitle">Multi-Platform Inventory Upload Tool</p>

      {/* Current platform indicator */}
      <div className="current-platform" style={{ background: config.bgColor, borderColor: config.color }}>
          <img src={config.logo} alt={config.name} className="platform-btn-logo" />
          <span style={{ color: config.color, fontWeight: 700 }}>{config.name}</span>
          <span className="platform-badge-arrow">→</span>
          <span className="platform-badge-table">{config.isAmazon ? 'amazon_inventory' : config.table}</span>
        </div>

      {/* Date selector (hidden for Amazon) */}
      {!config.isAmazon && (
        <div className="date-selector">
          <label htmlFor="inv-date"><Calendar size={14} /> Inventory Date: <span className="date-required">*</span></label>
          <input type="date" id="inv-date" value={date} onChange={e => setDate(e.target.value)} />
          <span className="date-note">Select the date this inventory data represents (defaults to today)</span>
        </div>
      )}

      {/* Amazon auto-detection display */}
      {config.isAmazon && amazonDetected.entity && (
        <div className="amazon-detected">
          <span className="detected-item"><span className="detected-label"><Building2 size={13} /> Entity:</span> <span className="detected-value">{amazonDetected.entity}</span></span>
          <span className="detected-item"><span className="detected-label"><Calendar size={13} /> Date:</span> <span className="detected-value">{amazonDetected.date}</span></span>
          <span className="detected-item"><span className="detected-label"><BarChart2 size={13} /> Table:</span> <span className="detected-value">{amazonDetected.table} (business: {amazonDetected.business})</span></span>
        </div>
      )}

      {/* Platform notes */}
      {config.showBlinkitNote && (
        <div className="platform-note blinkit-note">
          <Info size={13} /> <strong>Blinkit:</strong> The raw <code>created_at</code> from your data will also be stored separately for audit purposes.
        </div>
      )}
      {config.isAmazon && (
        <div className="platform-note amazon-note">
          <Info size={13} /> <strong>Amazon:</strong> Entity (JMPL/JWPL) and Date will be <strong>auto-detected</strong> from the first row of your data.
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
          <strong><Info size={13} /> How to use:</strong> Select platform → Set inventory date → Copy from Excel → Paste below → Parse → Insert<br />
          <strong>Expected Columns ({displayCols.length}):</strong>
          <div className="columns-display">{displayCols.slice(0, 12).map(c => <code key={c}>{c}</code>)}{displayCols.length > 12 && <code>+{displayCols.length - 12} more</code>}</div>
        </div>
        <div className="settings">
          <strong><Settings size={13} /> Settings:</strong>
          <label><input type="checkbox" checked={pasteHasHeader} onChange={e => setPasteHasHeader(e.target.checked)} /> First row is header</label>
          <label><input type="checkbox" checked={pasteUpsert} onChange={e => setPasteUpsert(e.target.checked)} /> Update existing (Upsert)</label>
        </div>
        <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Paste your Excel/Sheets data here..." />
        <div>
          <button className="btn btn-green" onClick={handlePasteParse} disabled={pasteLoading}>Parse Data</button>
          <button className="btn btn-gray" onClick={() => { setPasteText(''); setPasteData([]); setPasteMsg(null); setAmazonDetected(EMPTY_AMAZON); }} disabled={pasteLoading}>Clear</button>
        </div>
        {pasteData.length > 0 && (
          <div>
            <h3><BarChart2 size={16} /> Preview <span className="row-badge">{pasteData.length} rows</span></h3>
            <PreviewTable data={pasteData} />
            <button className="btn btn-green" onClick={() => handleInsert('paste')} disabled={pasteLoading} style={{ marginTop: 15 }}>
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
          <strong>Expected Columns ({displayCols.length}):</strong>
          <div className="columns-display">{displayCols.slice(0, 12).map(c => <code key={c}>{c}</code>)}{displayCols.length > 12 && <code>+{displayCols.length - 12} more</code>}</div>
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
          <UploadCloud size={48} style={{ color: '#3ECF8E' }} />
          <div>Click to upload or drag &amp; drop</div>
          <div style={{ fontSize: 12, color: '#999' }}>CSV, TSV files</div>
        </div>
        {csvData.length > 0 && (
          <div>
            <h3><BarChart2 size={16} /> Preview <span className="row-badge">{csvData.length} rows</span></h3>
            <PreviewTable data={csvData} />
            <div>
              <button className="btn btn-green" onClick={() => handleInsert('csv')} disabled={csvLoading}>
                {csvLoading ? <><Loader2 size={14} className="spin" /> Inserting...</> : 'Insert All Data'}
              </button>
              <button className="btn btn-gray" onClick={() => { setCsvData([]); setCsvMsg(null); setAmazonDetected(EMPTY_AMAZON); }} disabled={csvLoading}>Clear</button>
            </div>
          </div>
        )}
        {csvLoading && <div className="progress"><div className="progress-bar"><div className="progress-fill" style={{ width: '100%' }}>Processing...</div></div></div>}
        <Msg msg={csvMsg} />
      </div>
    </div>
  );
}
