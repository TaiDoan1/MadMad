import { ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Link } from "react-router";
import { useEffect } from "react";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useCart } from "@/features/cart/context/cart-context";
import { useProducts } from "@/features/products/context/product-context";

export function CartPage() {
  const { products } = useProducts();
  const { cartItems, subtotal, availableCoupons, appliedCoupon, discountAmount, updateItemQuantity, removeFromCart, applyCoupon, clearCoupon } = useCart();
  const resolvedItems = cartItems
    .map((item) => ({
      item,
      product: products.find((product) => product.id === item.productId),
    }))
    .filter((entry): entry is { item: typeof cartItems[number]; product: NonNullable<(typeof products)[number]> } => Boolean(entry.product));

  const shippingBase = subtotal - discountAmount;
  const shipping = shippingBase > 500000 ? 0 : 30000;
  const total = Math.max(0, subtotal - discountAmount) + shipping;
  const hasDiscountedProducts = resolvedItems.some(({ product }) => (product.discountPercent ?? 0) > 0);

  useEffect(() => {
    if (hasDiscountedProducts && appliedCoupon) {
      clearCoupon();
    }
  }, [appliedCoupon, clearCoupon, hasDiscountedProducts]);

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl">GIỎ HÀNG</h1>
          <p className="text-muted-foreground">{resolvedItems.length} sản phẩm trong giỏ hàng của bạn</p>
        </div>

        {resolvedItems.length === 0 ? (
          <div className="rounded-lg bg-card py-16 text-center">
            <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 text-2xl">Giỏ hàng trống</h2>
            <p className="mb-6 text-muted-foreground">Thêm sản phẩm để bắt đầu mua sắm</p>
            <Link to="/shop" className="inline-flex items-center gap-2 rounded bg-primary px-8 py-3 text-white transition-colors hover:bg-primary/90">
              Tiếp tục mua sắm
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {resolvedItems.map(({ item, product }) => (
                <div key={item.id} className="flex gap-6 rounded-lg bg-card p-6">
                  <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                    <ImageWithFallback src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link to={`/product/${product.id}`} className="transition-colors hover:text-primary">
                          <h3 className="text-xl">{product.name}</h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground transition-colors hover:text-primary">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex gap-4 text-sm">
                      <span className="text-muted-foreground">Size: <span className="font-semibold text-foreground">{item.size}</span></span>
                      <span className="text-muted-foreground">Màu: <span className="font-semibold text-foreground">{item.color}</span></span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateItemQuantity(item.id, item.quantity - 1)} className="flex h-8 w-8 items-center justify-center rounded border border-border transition-colors hover:bg-muted">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <button onClick={() => updateItemQuantity(item.id, item.quantity + 1)} className="flex h-8 w-8 items-center justify-center rounded border border-border transition-colors hover:bg-muted">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-semibold text-primary">{(item.priceAtAdd * item.quantity).toLocaleString("vi-VN")}₫</div>
                        {item.quantity > 1 && (
                          <div className="text-sm text-muted-foreground">{item.priceAtAdd.toLocaleString("vi-VN")}₫ / sản phẩm</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Link to="/shop" className="mt-4 inline-flex items-center gap-2 text-primary transition-all hover:gap-3">
                ← Tiếp tục mua sắm
              </Link>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6 rounded-lg bg-card p-6">
                <h3 className="text-2xl">TỔNG ĐƠN HÀNG</h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tạm tính</span>
                    <span className="font-semibold">{subtotal.toLocaleString("vi-VN")}₫</span>
                  </div>
                  {!hasDiscountedProducts ? (
                    <div className="space-y-2 rounded border border-border p-3">
                      <p className="text-sm text-muted-foreground">Chọn mã giảm giá</p>
                      <div className="flex flex-wrap gap-2">
                        {availableCoupons.map((coupon) => (
                          <button
                            key={coupon.code}
                            type="button"
                            onClick={() => {
                              const result = applyCoupon(coupon.code);
                              window.alert(result.message);
                            }}
                            className={`rounded px-3 py-2 text-xs transition-colors ${
                              appliedCoupon?.code === coupon.code
                                ? "bg-primary text-white"
                                : "bg-muted hover:bg-muted/80"
                            }`}
                          >
                            {coupon.code} (-{coupon.discountAmount.toLocaleString("vi-VN")}₫)
                          </button>
                        ))}
                      </div>
                      {appliedCoupon && (
                        <div className="flex items-center justify-between text-xs text-green-700">
                          <span>Đang dùng mã: {appliedCoupon.code}</span>
                          <button type="button" onClick={clearCoupon} className="text-red-600 hover:underline">
                            Bỏ mã
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded border border-border bg-muted/20 p-3 text-xs text-red-600">
                      Giỏ hàng có sản phẩm đã giảm %. Hệ thống tự ẩn phần voucher.
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Giảm giá</span>
                      <span className="font-semibold text-green-600">- {discountAmount.toLocaleString("vi-VN")}₫</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phí vận chuyển</span>
                    <span className="font-semibold">{shipping === 0 ? <span className="text-green-600">Miễn phí</span> : `${shipping.toLocaleString("vi-VN")}₫`}</span>
                  </div>
                  {shippingBase < 500000 && shipping > 0 && (
                    <div className="rounded bg-muted p-3 text-sm">
                      <p className="text-muted-foreground">
                        Thêm <span className="font-semibold text-primary">{(500000 - shippingBase).toLocaleString("vi-VN")}₫</span> để được miễn phí ship
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-xl">Tổng cộng</span>
                    <span className="text-3xl font-semibold text-primary">{total.toLocaleString("vi-VN")}₫</span>
                  </div>

                  <Link
                    to="/checkout"
                    className="mb-3 flex w-full items-center justify-center gap-2 rounded bg-primary py-4 text-lg font-semibold text-white transition-colors hover:bg-primary/90"
                  >
                    THANH TOÁN
                    <ArrowRight className="h-5 w-5" />
                  </Link>

                  <p className="text-center text-xs text-muted-foreground">Phí vận chuyển và thuế được tính khi thanh toán</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
