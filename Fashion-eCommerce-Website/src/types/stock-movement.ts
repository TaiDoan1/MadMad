export type StockMovementReason =
  | "CHECKOUT"
  | "MANUAL_ORDER"
  | "ORDER_CANCEL"
  | "ORDER_UNCANCEL"
  | "ORDER_EDIT_IN"
  | "ORDER_EDIT_OUT"
  | "MARKETING_GIFT"
  | "MARKETING_GIFT_CANCEL"
  | "ADMIN_ADJUSTMENT"
  | "RETURN"
  | "REFUND";

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  color: string;
  size: string;
  quantityDelta: number;
  reason: StockMovementReason;
  referenceType?: string | null;
  referenceId?: string | null;
  referenceLabel?: string | null;
  stockBefore?: number | null;
  stockAfter?: number | null;
  notes?: string | null;
  createdAt: string;
}

export interface StockMovementStats {
  totalMovements: number;
  totalIn: number;
  totalOut: number;
  netChange: number;
  byReason: Array<{ reason: string; count: number }>;
}

export const STOCK_MOVEMENT_REASON_LABELS: Record<StockMovementReason, string> = {
  CHECKOUT: "Đặt hàng website",
  MANUAL_ORDER: "Tạo đơn thủ công",
  ORDER_CANCEL: "Hủy đơn — hoàn kho",
  ORDER_UNCANCEL: "Hoàn tác hủy — trừ kho",
  ORDER_EDIT_IN: "Sửa đơn — hoàn kho dòng cũ",
  ORDER_EDIT_OUT: "Sửa đơn — trừ kho dòng mới",
  MARKETING_GIFT: "Tặng KOL/KOC",
  MARKETING_GIFT_CANCEL: "Hủy tặng KOL — hoàn kho",
  ADMIN_ADJUSTMENT: "Admin chỉnh tồn kho",
  RETURN: "Hoàn hàng / trả hàng",
  REFUND: "Hoàn tiền / trả đơn",
};

export const STOCK_MOVEMENT_REASON_OPTIONS: Array<{ value: StockMovementReason | "all"; label: string }> = [
  { value: "all", label: "Tất cả nguyên nhân" },
  ...Object.entries(STOCK_MOVEMENT_REASON_LABELS).map(([value, label]) => ({
    value: value as StockMovementReason,
    label,
  })),
];
