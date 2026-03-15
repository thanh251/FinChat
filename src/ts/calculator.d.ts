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
 * Chỉ cho phép số và ký hiệu + - * / ( ) .
 * Không cho phép bất kỳ lệnh JS nào khác.
 */
export declare function safeEval(equation: string): number;
/**
 * Format số cho hiển thị — giữ tối đa 4 chữ số thập phân
 */
export declare function formatNumber(n: number): string;
/**
 * Tính toán một danh sách phép tính, trả về kết quả và lỗi riêng biệt
 */
export declare function runCalculations(equations: string[]): {
    results: CalcResult[];
    errors: CalcError[];
};
