export type StockMovementReason =
  | "CHECKOUT"
  | "MANUAL_ORDER"
  | "ORDER_CANCEL"
  | "ORDER_RETURN"
  | "ORDER_UNCANCEL"
  | "ORDER_EDIT_IN"
  | "ORDER_EDIT_OUT"
  | "MARKETING_GIFT"
  | "MARKETING_GIFT_CANCEL"
  | "MARKETING_GIFT_EDIT_IN"
  | "MARKETING_GIFT_EDIT_OUT"
  | "STOCK_RECEIPT"
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
  MANUAL_ORDER: "Đơn FB/IG/POS/Zalo",
  ORDER_CANCEL: "Hủy đơn — hoàn kho",
  ORDER_RETURN: "Hoàn đơn COD — cộng kho",
  ORDER_UNCANCEL: "Hoàn tác hủy — trừ kho",
  ORDER_EDIT_IN: "Sửa đơn — hoàn kho dòng cũ",
  ORDER_EDIT_OUT: "Sửa đơn — trừ kho dòng mới",
  MARKETING_GIFT: "Tặng KOL/KOC",
  MARKETING_GIFT_CANCEL: "Hủy tặng KOL — hoàn kho",
  MARKETING_GIFT_EDIT_IN: "Sửa marketing — hoàn kho dòng cũ",
  MARKETING_GIFT_EDIT_OUT: "Sửa marketing — trừ kho dòng mới",
  STOCK_RECEIPT: "Nhập kho / tăng tồn",
  ADMIN_ADJUSTMENT: "Admin chỉnh tồn kho",
  RETURN: "Hoàn hàng thủ công",
  REFUND: "Hoàn tiền / trả đơn",
};

export function formatStockMovementReference(row: Pick<StockMovement, "referenceType" | "referenceLabel" | "referenceId">) {
  const label = row.referenceLabel || row.referenceId;
  if (!label) return "—";

  if (row.referenceType === "marketing_gift" || String(label).startsWith("MK")) {
    return `Marketing · ${label}`;
  }
  if (row.referenceType === "order" || String(label).startsWith("DH")) {
    return `Đơn hàng · ${label}`;
  }
  if (row.referenceType === "manual_return") {
    return `Hoàn thủ công · ${label}`;
  }

  return label;
}

export const STOCK_MOVEMENT_REASON_OPTIONS: Array<{ value: StockMovementReason | "all"; label: string }> = [
  { value: "all", label: "Tất cả nguyên nhân" },
  ...Object.entries(STOCK_MOVEMENT_REASON_LABELS).map(([value, label]) => ({
    value: value as StockMovementReason,
    label,
  })),
];
