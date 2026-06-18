import type { OrderItemEditMeta } from "@/types/order";
import { ORDER_EDIT_FIELD_STYLES } from "@/utils/order-edit";

interface EditedOrderFieldProps {
  label: string;
  value: string;
  field: keyof typeof ORDER_EDIT_FIELD_STYLES;
  editMeta?: OrderItemEditMeta;
}

export function EditedOrderField({ label, value, field, editMeta }: EditedOrderFieldProps) {
  const change = editMeta?.[field];

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-black/45">{label}:</span>
      <span
        className={change ? `px-1.5 py-0.5 rounded font-bold ${ORDER_EDIT_FIELD_STYLES[field]}` : "font-semibold text-black"}
        title={change ? `Đã đổi: ${change.from} → ${change.to}` : undefined}
      >
        {value}
      </span>
    </span>
  );
}

export function OrderEditLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider">
      <span className="text-black/45">Chú thích chỉnh sửa:</span>
      <span className={`px-2 py-0.5 rounded ${ORDER_EDIT_FIELD_STYLES.product}`}>Mẫu áo</span>
      <span className={`px-2 py-0.5 rounded ${ORDER_EDIT_FIELD_STYLES.color}`}>Màu</span>
      <span className={`px-2 py-0.5 rounded ${ORDER_EDIT_FIELD_STYLES.size}`}>Size</span>
    </div>
  );
}
