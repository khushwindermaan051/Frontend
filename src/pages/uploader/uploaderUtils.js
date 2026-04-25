import { API_BASE } from '../../services/api';

export function parseCSVLine(line, delim) {
  if (delim === '\t') {
    return line.split('\t').map(v => v.trim().replace(/^["']|["']$/g, '').replace(/^﻿/, ''));
  }
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, '').replace(/^﻿/, ''));
      current = '';
    } else { current += char; }
  }
  result.push(current.trim().replace(/^["']|["']$/g, '').replace(/^﻿/, ''));
  return result;
}

export function deduplicateData(data, keyFields) {
  if (!keyFields || keyFields.length === 0) return data;
  const seen = new Map();
  for (const row of data) {
    const key = keyFields.map(f => {
      const v = row[f];
      return v !== null && v !== undefined ? String(v) : '';
    }).join('|||');
    seen.set(key, row);
  }
  return Array.from(seen.values());
}

export function formatDate(str) {
  if (!str) return null;
  str = String(str).trim();
  let m = str.match(/^\d{8}\s*-\s*(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  m = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return str;
}

export function buildHeaderMap(cols, headers, ignoreFields = []) {
  const map = {};
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    if (ignoreFields.includes(col)) continue;
    let idx = headers.findIndex(h => h === col);
    if (idx === -1) idx = headers.findIndex(h => h.toLowerCase() === col.toLowerCase());
    if (idx === -1) {
      const cc = col.toLowerCase().replace(/[^a-z0-9]/g, '');
      idx = headers.findIndex(h => {
        const hc = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return hc === cc || hc.includes(cc) || cc.includes(hc);
      });
    }
    map[col] = idx === -1 ? i : idx;
  }
  return map;
}

export async function batchInsert(table, data, uniqueKey, upsert) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not logged in. Open the main app and log in first.');
  const res = await fetch(`${API_BASE}/api/upload/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({ table, data, unique_key: upsert ? uniqueKey : null, upsert }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.detail || 'Upload failed');
  return result;
}
