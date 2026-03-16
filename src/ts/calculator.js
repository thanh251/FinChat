// ═══════════════════════════════════════════
// CALCULATOR MODULE
// Hỗ trợ tất cả dạng phép tính trong TATQA và FinQA:
// - Cộng, trừ, nhân, chia cơ bản
// - Lũy thừa ** (dùng cho CAGR)
// - Phần trăm, trung bình, tỷ lệ
// - Phép tính nhiều bước
// ═══════════════════════════════════════════
/**
 * Tiền xử lý equation trước khi eval:
 * - Xóa dấu phẩy trong số (1,280 → 1280)
 * - Xóa ký hiệu $ và %
 * - Xử lý số âm trong ngoặc như (1,234) → -1234 (chuẩn kế toán)
 * - Hỗ trợ ** cho lũy thừa
 */
function preprocessEquation(equation) {
    let eq = equation.trim();
    // Xóa ký hiệu $ và %
    eq = eq.replace(/\$/g, '').replace(/%/g, '');
    // Xử lý số âm dạng kế toán: (1,234) → -1234
    // Pattern: số trong ngoặc đơn không có operator trước
    eq = eq.replace(/(?<![+\-*/(\s])\((\d[\d,]*\.?\d*)\)/g, '-$1');
    // Xóa dấu phẩy trong số (1,280 → 1280)
    // Chỉ xóa dấu phẩy giữa các chữ số, không xóa dấu phẩy là toán tử
    eq = eq.replace(/(\d),(\d)/g, '$1$2');
    eq = eq.replace(/(\d),(\d)/g, '$1$2'); // chạy lần 2 cho số như 1,234,567
    return eq;
}
/**
 * Tính toán phép tính an toàn.
 * Whitelist: chỉ cho phép số, toán tử cơ bản, dấu ngoặc, lũy thừa
 */
export function safeEval(equation) {
    const clean = preprocessEquation(equation);
    // Whitelist: số, khoảng trắng, toán tử + - * / ** ( ) .
    const allowed = /^[\d\s\+\-\*\/\(\)\.\*]+$/;
    if (!allowed.test(clean)) {
        throw new Error(`Phép tính chứa ký tự không hợp lệ: "${equation}" → "${clean}"`);
    }
    if (clean.trim() === '') {
        throw new Error('Phép tính rỗng');
    }
    // Dùng Function thay eval để có strict mode
    const result = Function('"use strict"; return (' + clean + ')')();
    if (!isFinite(result)) {
        throw new Error(`Kết quả không hợp lệ (chia cho 0 hoặc Infinity) cho: "${equation}"`);
    }
    if (isNaN(result)) {
        throw new Error(`Kết quả NaN cho: "${equation}"`);
    }
    return Math.round(result * 100000) / 100000;
}
/**
 * Format số cho hiển thị
 */
export function formatNumber(n) {
    if (Number.isInteger(n)) {
        return n.toLocaleString('en-US');
    }
    // Giữ tối đa 4 chữ số thập phân, bỏ số 0 thừa ở cuối
    const fixed = n.toFixed(4).replace(/\.?0+$/, '');
    return fixed;
}
/**
 * Tính toán danh sách phép tính, trả về kết quả và lỗi riêng biệt
 */
export function runCalculations(equations) {
    const results = [];
    const errors = [];
    for (const eq of equations) {
        try {
            const result = safeEval(eq);
            results.push({
                equation: eq,
                result,
                formatted: formatNumber(result),
            });
        }
        catch (e) {
            errors.push({
                equation: eq,
                error: e instanceof Error ? e.message : 'Lỗi không xác định',
            });
        }
    }
    return { results, errors };
}
//# sourceMappingURL=calculator.js.map