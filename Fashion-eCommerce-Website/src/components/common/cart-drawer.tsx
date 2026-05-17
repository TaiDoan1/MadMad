import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Link } from "react-router";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useCart } from "@/features/cart/context/cart-context";
import { useProducts } from "@/features/products/context/product-context";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { products } = useProducts();
  const { cartItems, subtotal, updateItemQuantity, removeFromCart } = useCart();

  const resolvedItems = cartItems
    .map((item) => ({
      item,
      product: products.find((p) => p.id === item.productId),
    }))
    .filter(
      (e): e is { item: (typeof cartItems)[number]; product: NonNullable<(typeof products)[number]> } =>
        Boolean(e.product),
    );

  const shipping = subtotal > 500000 ? 0 : 30000;
  const total = subtotal + shipping;

  return (
    <>
      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[200] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ── Drawer panel ────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-label="Giỏ hàng"
        aria-modal="true"
        className={`fixed inset-y-0 right-0 z-[201] flex w-full max-w-[390px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold uppercase tracking-widest">Giỏ hàng</span>
            {resolvedItems.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                {resolvedItems.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng giỏ hàng"
            className="text-black/50 transition-colors hover:text-black"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Items ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {resolvedItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <ShoppingBag className="h-12 w-12 text-black/20" />
              <p className="text-sm font-bold uppercase tracking-widest text-black/40">
                Giỏ hàng trống
              </p>
              <button
                onClick={onClose}
                className="mt-2 text-xs uppercase tracking-widest text-black underline transition-opacity hover:opacity-60"
              >
                Tiếp tục mua sắm
              </button>
            </div>
          ) : (
            <div className="divide-y divide-black/10">
              {resolvedItems.map(({ item, product }) => (
                <div key={item.id} className="flex gap-4 py-5">
                  {/* Image */}
                  <Link to={`/product/${product.id}`} onClick={onClose} className="h-[72px] w-[72px] flex-shrink-0 overflow-hidden bg-[#f5f5f5]">
                    <ImageWithFallback
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/product/${product.id}`}
                        onClick={onClose}
                        className="flex-1 text-[11px] font-bold uppercase leading-tight tracking-wider hover:opacity-60 transition-opacity"
                      >
                        {product.name}
                      </Link>
                      <span className="text-[11px] font-semibold whitespace-nowrap">
                        {(item.priceAtAdd * item.quantity).toLocaleString("vi-VN")}₫
                      </span>
                    </div>

                    {(item.size || item.color) && (
                      <p className="text-[11px] text-black/45">
                        {item.size}{item.color ? ` / ${item.color}` : ""}
                      </p>
                    )}

                    {/* Qty stepper + Remove — exact Flowbit style */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-black/20">
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center text-black/60 transition-colors hover:bg-black hover:text-white"
                          aria-label="Giảm"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center text-black/60 transition-colors hover:bg-black hover:text-white"
                          aria-label="Tăng"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-[11px] text-black/35 underline transition-colors hover:text-black"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {resolvedItems.length > 0 && (
          <div className="border-t border-black/10 px-6 py-5">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-black/60">Tổng tạm tính</span>
              <span className="text-base font-semibold">{total.toLocaleString("vi-VN")}₫</span>
            </div>
            <p className="mb-4 text-[11px] text-black/40">
              Thuế, giảm giá và phí vận chuyển tính khi thanh toán.
            </p>
            <Link
              to="/checkout"
              onClick={onClose}
              className="block w-full rounded bg-black py-3.5 text-center text-xs font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80"
            >
              Thanh toán
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
