export interface Coupon {
  code: string;
  discountAmount: number;
  isExclusive?: boolean;
  usageLimit?: number; // Số lượng voucher phát hành
  usageCount?: number; // Số lượng đã sử dụng
  applyToSaleItems?: boolean; // Nếu true: cho phép áp dụng cho đơn hàng có sản phẩm đang giảm giá. Nếu false: chặn hoặc không áp dụng.
}

