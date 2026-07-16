export interface Coupon {
  code: string;
  discountType?: "amount" | "percent"; // Mặc định "amount" nếu bỏ trống (tương thích mã cũ)
  discountAmount: number; // Số tiền giảm (VNĐ) khi discountType = "amount"
  discountPercent?: number; // % giảm khi discountType = "percent" (1-100)
  isExclusive?: boolean;
  usageLimit?: number; // Số lượng voucher phát hành
  usageCount?: number; // Số lượng đã sử dụng
  applyToSaleItems?: boolean; // Nếu true: cho phép áp dụng cho đơn hàng có sản phẩm đang giảm giá. Nếu false: chặn hoặc không áp dụng.
}

