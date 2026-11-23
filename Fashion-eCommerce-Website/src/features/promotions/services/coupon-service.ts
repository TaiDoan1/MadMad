import { API_URL } from "@/config/api";

export async function validateCoupon(
  code: string,
  subtotal: number,
  hasSaleItems: boolean,
): Promise<{
  valid: boolean;
  code?: string;
  discountType?: "percent" | "amount";
  discountPercent?: number;
  discountAmount?: number;
  applyToSaleItems?: boolean;
  computedDiscount?: number;
  message: string;
}> {
  try {
    const res = await fetch(`${API_URL}/orders/validate-coupon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal, hasSaleItems }),
    });
    return (await res.json()) as {
      valid: boolean;
      code?: string;
      discountType?: "percent" | "amount";
      discountPercent?: number;
      discountAmount?: number;
      applyToSaleItems?: boolean;
      computedDiscount?: number;
      message: string;
    };
  } catch {
    return { valid: false, message: "Không thể kiểm tra mã giảm giá, vui lòng thử lại." };
  }
}

// Nhãn hiển thị mức giảm của mã (vd: "20%" hoặc "50.000₫") — dùng chung cho mọi nơi liệt kê coupon.
export function formatCouponDiscountLabel(coupon: {
  discountType?: "percent" | "amount";
  discountPercent?: number;
  discountAmount?: number;
}): string {
  return coupon.discountType === "percent"
    ? `${coupon.discountPercent ?? 0}%`
    : `${(coupon.discountAmount ?? 0).toLocaleString("vi-VN")}₫`;
}
