import type { ExcelData, CellRow } from './types.js';
/**
 * Đọc file Excel/CSV từ ArrayBuffer, trả về ExcelData
 */
export declare function parseExcelFile(buffer: ArrayBuffer, fileName: string): ExcelData;
/**
 * Convert rows sang Markdown table để gửi cho LLM
 */
export declare function toMarkdownTable(rows: CellRow[]): string;
/**
 * Render HTML table preview để hiển thị trong sidebar
 */
export declare function renderTableHTML(rows: CellRow[], maxRows?: number, maxCols?: number): string;
/**
 * Thống kê file
 */
export declare function getTableInfo(rows: CellRow[], maxRows?: number): string;
