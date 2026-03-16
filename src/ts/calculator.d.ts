export interface CalcResult {
    equation: string;
    result: number;
    formatted: string;
}
export interface CalcError {
    equation: string;
    error: string;
}
/**
 * Tính toán phép tính an toàn.
 * Whitelist: chỉ cho phép số, toán tử cơ bản, dấu ngoặc, lũy thừa
 */
export declare function safeEval(equation: string): number;
/**
 * Format số cho hiển thị
 */
export declare function formatNumber(n: number): string;
/**
 * Tính toán danh sách phép tính, trả về kết quả và lỗi riêng biệt
 */
export declare function runCalculations(equations: string[]): {
    results: CalcResult[];
    errors: CalcError[];
};
