import { useEffect, useMemo, useState } from "react";
import { X, Pencil, AlertCircle } from "lucide-react";
import type { Order, OrderItem } from "@/types/order";
import type { Product } from "@/types/product";
import { getVariantAvailableStock } from "@/utils/product-stock";

interface OrderItemEditModalProps {
  order: Order;
  item: OrderItem;
  products: Product[];
  onClose: () => void;
  onSave: (input: { productId: string; color: string; size: string; quantity: number }) => Promise<void>;
  saving?: boolean;
}

export function OrderItemEditModal({
  order,
  item,
  products,
  onClose,
  onSave,
  saving = false,
}: OrderItemEditModalProps) {
  const [productId, setProductId] = useState(String(item.productId || item.product?.id || ""));
  const [color, setColor] = useState(item.color);
  const [size, setSize] = useState(item.size);
  const [quantity, setQuantity] = useState(item.quantity);
  const [productSearch, setProductSearch] = useState("");

  const selectedProduct = useMemo(() => {
    const matched = products.find((product) => String(product.id) === productId);
    if (matched) return matched;

    if (!productId) return null;

    return {
      id: productId,
      name: item.productName || item.product?.name || "Sản phẩm trong đơn",
      price: item.price,
      image: item.productImage || item.product?.image || "",
      category: item.product?.category || "",
      rating: item.product?.rating ?? 0,
      reviews: item.product?.reviews ?? 0,
      description: item.product?.description || "",
      inStock: item.product?.inStock ?? true,
      colors: item.color
        ? [item.color, ...(item.product?.colors ?? [])].filter(
            (value, index, list) => list.indexOf(value) === index,
          )
        : item.product?.colors ?? [],
      sizes: item.size
        ? [item.size, ...(item.product?.sizes ?? [])].filter(
            (value, index, list) => list.indexOf(value) === index,
          )
        : item.product?.sizes ?? [],
      isPreOrder: item.isPreOrder ?? false,
    } as Product;
  }, [products, productId, item]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => product.name.toLowerCase().includes(query));
  }, [products, productSearch]);

  useEffect(() => {
    if (!selectedProduct) return;
    if (!selectedProduct.colors?.includes(color)) {
      setColor(selectedProduct.colors?.[0] || "");
    }
    if (!selectedProduct.sizes?.includes(size)) {
      setSize(selectedProduct.sizes?.[0] || "");
    }
  }, [selectedProduct, color, size]);

  const availableStock = selectedProduct ? getVariantAvailableStock(selectedProduct, color, size) : 0;
  const canEdit = order.status !== "completed" && order.status !== "cancelled";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProduct || !canEdit) return;
    if (!color.trim() || !size.trim()) return;
    await onSave({
      productId: String(selectedProduct.id),
      color: color.trim(),
      size: size.trim(),
      quantity,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-black/10 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-black/45">Chỉnh sửa sản phẩm</p>
            <h3 className="text-sm font-black text-black">{order.orderNumber}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-black/10 p-2 hover:bg-stone-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {!canEdit && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Không thể chỉnh sửa đơn đã hoàn thành hoặc đã hủy.
            </div>
          )}

          <div className="rounded-xl border border-black/5 bg-stone-50 px-3 py-2 text-[11px] text-black/70">
            <p className="font-bold uppercase text-black/50">Hiện tại</p>
            <p className="mt-1 font-semibold">{item.productName || item.product?.name}</p>
            <p>Size: {item.size} · Màu: {item.color} · SL: {item.quantity}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-black/50">Tìm mẫu áo</label>
            <input
              type="text"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Nhập tên sản phẩm..."
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs focus:border-black/40 focus:outline-none"
              disabled={!canEdit || saving}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-black/50">Mẫu áo</label>
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs focus:border-black/40 focus:outline-none"
              disabled={!canEdit || saving}
            >
              {filteredProducts.map((product) => (
                <option key={product.id} value={String(product.id)}>
                  {product.name} — {product.price.toLocaleString("vi-VN")}₫
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-black/50">Màu</label>
              <select
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs focus:border-black/40 focus:outline-none"
                disabled={!canEdit || saving || !selectedProduct}
              >
                {(selectedProduct?.colors ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-black/50">Size</label>
              <select
                value={size}
                onChange={(event) => setSize(event.target.value)}
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs focus:border-black/40 focus:outline-none"
                disabled={!canEdit || saving || !selectedProduct}
              >
                {(selectedProduct?.sizes ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-black/50">Số lượng</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs focus:border-black/40 focus:outline-none"
              disabled={!canEdit || saving}
            />
            {selectedProduct && !item.isPreOrder && !selectedProduct.isPreOrder && (
              <p className="text-[10px] text-black/45">Tồn kho khả dụng: {availableStock}</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-black/10 px-4 py-2.5 text-xs font-bold uppercase"
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!canEdit || saving || !selectedProduct}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-xs font-bold uppercase text-white disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
