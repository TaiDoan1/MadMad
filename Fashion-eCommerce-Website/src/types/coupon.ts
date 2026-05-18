export interface Coupon {
  code: string;
  discountAmount: number;
  isExclusive?: boolean;
  usageLimit?: number; // Số lượng voucher phát hành
  usageCount?: number; // Số lượng đã sử dụng
}

