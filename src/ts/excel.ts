// ═══════════════════════════════════════════
// EXCEL MODULE
// Đọc .xlsx .xls .csv bằng SheetJS
// Convert sang Markdown table để gửi LLM
// ═══════════════════════════════════════════

import type { ExcelData, CellRow } from './types.js';

// SheetJS được load qua CDN, khai báo type để TS không báo lỗi
declare const XLSX: {
  read: (data: Uint8Array, opts: { type: string }) => Workbook;
  utils: {
    sheet_to_json: (ws: Worksheet, opts: object) => CellRow[];
  };
};

interface Workbook {
  SheetNames: string[];
  Sheets: Record<string, Worksheet>;
}

type Worksheet = object;

// ───────────────────────────────────────────

/**
 * Đọc file Excel/CSV từ ArrayBuffer, trả về ExcelData
 */
export function parseExcelFile(buffer: ArrayBuffer, fileName: string): ExcelData {
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: 'array' });

  const sheets: Record<string, CellRow[]> = {};

  workbook.SheetNames.forEach((name) => {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
    }) as CellRow[];

    if (rows.length > 0) {
      sheets[name] = rows;
    }
  });

  const sheetNames = Object.keys(sheets);
  if (sheetNames.length === 0) {
    throw new Error('File không có dữ liệu');
  }

  return {
    sheets,
    activeSheet: sheetNames[0],
    fileName,
  };
}

/**
 * Convert rows sang Markdown table để gửi cho LLM
 */
export function toMarkdownTable(rows: CellRow[]): string {
  if (!rows || rows.length === 0) return '';

  const lines = rows.map((row) =>
    '| ' + row.map((c) => String(c ?? '').replace(/\|/g, '\\|')).join(' | ') + ' |'
  );

  // Thêm separator sau header
  const maxCols = rows[0].length;
  const sep = '| ' + Array(maxCols).fill('---').join(' | ') + ' |';
  lines.splice(1, 0, sep);

  return lines.join('\n');
}

/**
 * Render HTML table preview để hiển thị trong sidebar
 */
export function renderTableHTML(rows: CellRow[], maxRows = 50, maxCols = 20): string {
  if (!rows || rows.length === 0) return '';

  const displayRows = rows.slice(0, maxRows);
  const headers = (displayRows[0] || []).slice(0, maxCols);

  let html = '<table class="excel-table"><thead><tr>';
  headers.forEach((h) => {
    html += `<th>${h !== '' ? String(h) : '&nbsp;'}</th>`;
  });
  html += '</tr></thead><tbody>';

  displayRows.slice(1).forEach((row) => {
    html += '<tr>';
    row.slice(0, maxCols).forEach((cell) => {
      html += `<td>${cell !== '' && cell !== null ? String(cell) : '&nbsp;'}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

/**
 * Thống kê file
 */
export function getTableInfo(rows: CellRow[], maxRows = 50): string {
  const totalRows = rows.length;
  const totalCols = (rows[0] || []).length;
  const extra = totalRows > maxRows ? ` · Hiển thị ${maxRows} hàng đầu` : '';
  return `${totalRows} hàng · ${totalCols} cột${extra}`;
}
