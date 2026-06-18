import type { OrderItem, OrderItemEditMeta } from "@/types/order";

export function parseOrderItemEditMeta(raw: unknown): OrderItemEditMeta | undefined {
  if (!raw) return undefined;
  if (typeof raw === "object") return raw as OrderItemEditMeta;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as OrderItemEditMeta;
      return parsed && typeof parsed === "object" ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export const ORDER_EDIT_FIELD_STYLES = {
  product: "bg-amber-100 text-amber-900 border border-amber-300",
  color: "bg-violet-100 text-violet-900 border border-violet-300",
  size: "bg-sky-100 text-sky-900 border border-sky-300",
} as const;

export function getOrderEditSummary(items: OrderItem[]) {
  const hasProduct = items.some((item) => parseOrderItemEditMeta(item.editMeta)?.product);
  const hasColor = items.some((item) => parseOrderItemEditMeta(item.editMeta)?.color);
  const hasSize = items.some((item) => parseOrderItemEditMeta(item.editMeta)?.size);
  return { hasProduct, hasColor, hasSize };
}

export function renderEditedField(
  value: string,
  field: keyof typeof ORDER_EDIT_FIELD_STYLES,
  editMeta?: OrderItemEditMeta,
) {
  const change = editMeta?.[field];
  if (!change) {
    return { text: value, className: "", changed: false };
  }
  return {
    text: value,
    className: ORDER_EDIT_FIELD_STYLES[field],
    changed: true,
    from: change.from,
  };
}
