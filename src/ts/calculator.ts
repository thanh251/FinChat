// ═══════════════════════════════════════════
// CALCULATOR MODULE
// Chạy phép tính an toàn trực tiếp trên browser
// Không dùng Python — thay bằng JS Function()
// ═══════════════════════════════════════════

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
export function safeEval(equation: string): number {
  // Xóa dấu phẩy trong số (1,280 → 1280)
  const clean = equation.replace(/,/g, '').trim();

  // Whitelist: chỉ cho phép số, khoảng trắng, và toán tử cơ bản
  const allowed = /^[\d\s\+\-\*\/\(\)\.]+$/;
  if (!allowed.test(clean)) {
    throw new Error(`Phép tính chứa ký tự không hợp lệ: "${equation}"`);
  }

  // Kiểm tra chuỗi rỗng
  if (clean === '') {
    throw new Error('Phép tính rỗng');
  }

  // Dùng Function thay eval để có strict mode
  const result = Function('"use strict"; return (' + clean + ')')() as number;

  if (!isFinite(result)) {
    throw new Error(`Kết quả không hợp lệ (chia cho 0 hoặc Infinity)`);
  }

  return Math.round(result * 100000) / 100000;
}

/**
 * Format số cho hiển thị — giữ tối đa 4 chữ số thập phân
 */
export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString('vi-VN');
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 4 });
}

/**
 * Tính toán một danh sách phép tính, trả về kết quả và lỗi riêng biệt
 */
export function runCalculations(equations: string[]): {
  results: CalcResult[];
  errors: CalcError[];
} {
  const results: CalcResult[] = [];
  const errors: CalcError[] = [];

  for (const eq of equations) {
    try {
      const result = safeEval(eq);
      results.push({
        equation: eq,
        result,
        formatted: formatNumber(result),
      });
    } catch (e) {
      errors.push({
        equation: eq,
        error: e instanceof Error ? e.message : 'Lỗi không xác định',
      });
    }
  }

  return { results, errors };
}
