import { Minus, Plus, ShoppingBag } from "lucide-react";
import { Link } from "react-router";
import { useEffect } from "react";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useCart } from "@/features/cart/context/cart-context";
import { useProducts } from "@/features/products/context/product-context";
import { useLanguage } from "@/features/settings/context/language-context";

export function CartPage() {
  const { products } = useProducts();
  const { formatPrice, t, translate } = useLanguage();
  const {
    cartItems,
    subtotal,
    availableCoupons,
    appliedCoupon,
    discountAmount,
    updateItemQuantity,
    removeFromCart,
    applyCoupon,
    clearCoupon,
  } = useCart();

  const resolvedItems = cartItems
    .map((item) => ({
      item,
      product: products.find((p) => String(p.id) === String(item.productId)),
    }))
    .filter(
      (e): e is { item: (typeof cartItems)[number]; product: NonNullable<(typeof products)[number]> } =>
        Boolean(e.product),
    );

  const shippingBase = subtotal - discountAmount;
  const shipping = shippingBase > 500000 ? 0 : 30000;
  const total = Math.max(0, subtotal - discountAmount) + shipping;
  const hasDiscountedProducts = resolvedItems.some(({ product }) => (product.discountPercent ?? 0) > 0);

  useEffect(() => {
    if (hasDiscountedProducts && appliedCoupon) clearCoupon();
  }, [appliedCoupon, clearCoupon, hasDiscountedProducts]);

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── Heading ── */}
        <div className="mb-8">
          <h1 className="text-3xl tracking-widest uppercase">
            {t("GIỎ HÀNG", "SHOPPING CART")}{" "}
            <span className="text-xl text-black/40">{resolvedItems.length}</span>
          </h1>
        </div>

        {resolvedItems.length === 0 ? (
          /* ── Empty state ── */
          <div className="bg-white py-20 text-center">
            <ShoppingBag className="mx-auto mb-4 h-14 w-14 text-black/20" />
            <h2 className="mb-2 text-2xl tracking-widest uppercase">{t("GIỎ HÀNG TRỐNG", "YOUR CART IS EMPTY")}</h2>
            <p className="mb-8 text-sm text-black/50">{t("Thêm sản phẩm để bắt đầu mua sắm", "Add items to start shopping")}</p>
            <Link
              to="/shop"
              className="inline-block bg-black px-10 py-3 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80"
            >
              {t("Tiếp tục mua sắm", "Continue Shopping")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

            {/* ── Left: Product list ── */}
            <div className="lg:col-span-2">
              <div className="bg-white">
                {resolvedItems.map(({ item, product }, idx) => (
                  <div
                    key={item.id}
                    className={`flex gap-5 px-6 py-5 ${idx < resolvedItems.length - 1 ? "border-b border-black/10" : ""}`}
                  >
                    {/* Image */}
                    <Link to={`/product/${product.id}`} className="h-24 w-24 flex-shrink-0 overflow-hidden bg-[#f0f0f0]">
                      <ImageWithFallback
                        src={product.image}
                        alt={translate(product.name)}
                        className="h-full w-full object-cover"
                      />
                    </Link>

                    {/* Details */}
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link to={`/product/${product.id}`} className="hover:opacity-70 transition-opacity">
                            <p className="text-xs font-bold uppercase tracking-wider">{translate(product.name)}</p>
                          </Link>
                          <p className="mt-0.5 text-xs text-black/50">
                            {item.size && `${item.size}`}
                            {item.color && ` / ${translate(item.color)}`}
                          </p>
                        </div>
                        <p className="text-sm font-semibold whitespace-nowrap">
                          {formatPrice(item.priceAtAdd * item.quantity)}
                        </p>
                      </div>

                      {/* Qty + Remove */}
                      <div className="flex items-center gap-6">
                        <div className="flex items-center border border-black/20">
                          <button
                            onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                            className="flex h-8 w-8 items-center justify-center text-black/60 transition-colors hover:bg-black hover:text-white"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                            className="flex h-8 w-8 items-center justify-center text-black/60 transition-colors hover:bg-black hover:text-white"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-xs text-black/40 underline transition-colors hover:text-black"
                        >
                          {t("Xóa", "Remove")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                to="/shop"
                className="mt-4 inline-block text-xs uppercase tracking-widest text-black/50 underline transition-colors hover:text-black"
              >
                {t("← Tiếp tục mua sắm", "← Continue Shopping")}
              </Link>
            </div>

            {/* ── Right: Order summary ── */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-[#efefef] p-6">
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-black/60">{t("Tổng tạm tính", "Subtotal")}</p>
                <p className="mb-1 text-2xl font-semibold">
                  {formatPrice(subtotal - discountAmount + shipping)}
                </p>
                <p className="mb-5 text-xs text-black/50">
                  {t("Thuế, giảm giá và phí vận chuyển được tính khi thanh toán.", "Shipping & taxes calculated at checkout.")}
                </p>

                {/* Shipping notice */}
                {shippingBase < 500000 && shipping > 0 && (
                  <p className="mb-4 text-xs text-black/60">
                    {t("Thêm", "Add")}{" "}
                    <span className="font-bold">
                      {formatPrice(500000 - shippingBase)}
                    </span>{" "}
                    {t("để được miễn phí vận chuyển.", "more for free shipping.")}
                  </p>
                )}
                {shipping === 0 && (
                  <p className="mb-4 text-xs font-medium text-green-700">{t("✓ Miễn phí vận chuyển", "✓ Free shipping")}</p>
                )}

                {/* Coupon codes */}
                {!hasDiscountedProducts && availableCoupons.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-xs text-black/50">{t("Mã giảm giá", "Discount Codes")}</p>
                    <div className="flex flex-wrap gap-2">
                      {availableCoupons.map((coupon) => (
                        <button
                          key={coupon.code}
                          type="button"
                          onClick={() => {
                            const result = applyCoupon(coupon.code);
                            window.alert(result.message);
                          }}
                          className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                            appliedCoupon?.code === coupon.code
                              ? "border-black bg-black text-white"
                              : "border-black/30 bg-white hover:border-black"
                          }`}
                        >
                          {coupon.code} (-{formatPrice(coupon.discountAmount)})
                        </button>
                      ))}
                    </div>
                    {appliedCoupon && (
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-green-700">{t("✓ Mã: ", "✓ Code: ")}{appliedCoupon.code}</span>
                        <button onClick={clearCoupon} className="text-red-600 hover:underline">
                          {t("Bỏ mã", "Remove code")}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* CTA */}
                <Link
                  to="/checkout"
                  className="block w-full bg-black py-4 text-center text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80"
                >
                  {t("Thanh toán", "Checkout")}
                </Link>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
