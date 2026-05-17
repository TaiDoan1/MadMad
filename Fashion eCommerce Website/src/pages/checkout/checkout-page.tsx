import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Link } from "react-router";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { brandLogo } from "@/assets/images";
import { OrderSuccessModal } from "@/components/common/order-success-modal";
import { useTransitionTo } from "@/components/common/page-transition";
import { useMembership } from "@/features/membership/context/membership-context";
import { useCart } from "@/features/cart/context/cart-context";
import {
  getDistrictNameByCode,
  getDistrictsByProvinceCode,
  getProvinceNameByCode,
  getProvinces,
  getWardNameByCode,
  getWardsByDistrictCode,
  type AddressOption,
} from "@/features/checkout/services/address-service";
import { useOrders } from "@/features/orders/context/order-context";
import { useProducts } from "@/features/products/context/product-context";
import type { Order, OrderItem } from "@/types/order";

/* ── Shared input className ───────────────────────────────────────────── */
const inputCls =
  "w-full rounded-xl border-2 border-black/15 bg-white px-4 py-3 text-sm placeholder:text-black/35 focus:border-black/80 focus:outline-none focus:ring-0 transition-colors";

export function CheckoutPage() {
  const { products } = useProducts();
  const { addOrder } = useOrders();
  const { currentMember, addPointsToCurrentMember } = useMembership();
  const {
    cartItems,
    subtotal,
    availableCoupons,
    appliedCoupon,
    discountAmount,
    applyCoupon,
    clearCoupon,
    clearCart,
  } = useCart();
  const navigate = useTransitionTo();

  const [successModal, setSuccessModal] = useState<{
    open: boolean;
    orderNumber: string;
    customerName: string;
    total: number;
  }>({ open: false, orderNumber: "", customerName: "", total: 0 });

  const [formData, setFormData] = useState({
    fullName: currentMember?.fullName || "",
    email: currentMember?.email || "",
    phone: currentMember?.phone || "",
    address: "",
    provinceCode: "",
    districtCode: "",
    wardCode: "",
    notes: "",
    paymentMethod: "cod",
    shippingMethod: "standard" as "standard" | "express",
  });
  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [districts, setDistricts] = useState<AddressOption[]>([]);
  const [wards, setWards] = useState<AddressOption[]>([]);

  // Tự động điền dữ liệu nếu thành viên đăng nhập sau khi vào trang
  useEffect(() => {
    if (currentMember) {
      setFormData((prev) => ({
        ...prev,
        fullName: currentMember.fullName,
        email: currentMember.email,
        phone: currentMember.phone,
      }));
    }
  }, [currentMember]);

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replaceAll("đ", "d");

  const shippingBase = subtotal - discountAmount;
  const shipping = formData.shippingMethod === "express" ? 60000 : (shippingBase > 500000 ? 0 : 30000);
  const total = Math.max(0, subtotal - discountAmount) + shipping;

  useEffect(() => {
    let alive = true;
    getProvinces().then((data) => { if (alive) setProvinces(data); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    getDistrictsByProvinceCode(formData.provinceCode).then((data) => { if (alive) setDistricts(data); });
    return () => { alive = false; };
  }, [formData.provinceCode]);

  useEffect(() => {
    let alive = true;
    getWardsByDistrictCode(formData.districtCode).then((data) => { if (alive) setWards(data); });
    return () => { alive = false; };
  }, [formData.districtCode]);

  /* ── Searchable dropdown ─────────────────────────────────────────────── */
  const SearchableDropdown = ({
    value, options, onChange, placeholder, disabled, searchPlaceholder,
  }: {
    value: string; options: AddressOption[]; onChange: (v: string) => void;
    placeholder: string; disabled?: boolean; searchPlaceholder: string;
  }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      if (!open) return;
      inputRef.current?.focus();
      const onMouseDown = (e: MouseEvent) => {
        if (containerRef.current && e.target instanceof Node && !containerRef.current.contains(e.target)) {
          setOpen(false); setQuery("");
        }
      };
      document.addEventListener("mousedown", onMouseDown);
      return () => document.removeEventListener("mousedown", onMouseDown);
    }, [open]);

    const selectedLabel = options.find((o) => o.code === value)?.name ?? "";
    const filtered = useMemo(() => {
      const q = normalizeText(query.trim());
      return q ? options.filter((o) => normalizeText(o.name).includes(q)) : options;
    }, [options, query]);

    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((c) => !c)}
          className={`${inputCls} flex items-center justify-between text-left disabled:opacity-50`}
        >
          <span className={selectedLabel ? "" : "text-black/35"}>{selectedLabel || placeholder}</span>
          <span className="text-black/40">▾</span>
        </button>
        {open && !disabled && (
          <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl border-2 border-black/15 bg-white shadow-lg">
            <div className="border-b border-black/10 p-2">
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
                className="w-full border border-black/20 px-3 py-2 text-sm focus:outline-none"
                placeholder={searchPlaceholder} />
            </div>
            <div className="max-h-56 overflow-auto">
              {filtered.length === 0
                ? <div className="px-4 py-3 text-sm text-black/40">Không tìm thấy.</div>
                : filtered.map((o) => (
                  <button key={o.code} type="button"
                    onClick={() => { onChange(o.code); setOpen(false); setQuery(""); }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-black/5 ${o.code === value ? "font-semibold" : ""}`}>
                    {o.name}
                  </button>
                ))
              }
            </div>
          </div>
        )}
      </div>
    );
  };

  const resolvedItems = cartItems
    .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
    .filter((e): e is { item: (typeof cartItems)[number]; product: NonNullable<(typeof products)[number]> } => Boolean(e.product));
  const hasDiscountedProducts = resolvedItems.some(({ product }) => (product.discountPercent ?? 0) > 0);

  useEffect(() => {
    if (hasDiscountedProducts && appliedCoupon) clearCoupon();
  }, [appliedCoupon, clearCoupon, hasDiscountedProducts]);

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    if (resolvedItems.length === 0) { window.alert("Giỏ hàng đang trống."); return; }
    if (!formData.fullName || !formData.phone || !formData.email || !formData.address || !formData.wardCode) {
      window.alert("Vui lòng điền đầy đủ thông tin giao hàng!"); return;
    }

    const orderItems: OrderItem[] = resolvedItems.map(({ item, product }) => ({
      product, quantity: item.quantity, size: item.size, color: item.color, price: item.priceAtAdd,
    }));
    const now = new Date();
    const orderNumber = `DH${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;
    const paymentMethodText = formData.paymentMethod === "cod" ? "COD" : formData.paymentMethod === "bank" ? "Chuyển khoản" : "MoMo";

    const newOrder: Order = {
      id: 0, orderNumber, customerName: formData.fullName, customerEmail: formData.email,
      customerPhone: formData.phone, shippingAddress: { street: formData.address, ward: "", district: "", province: "" },
      items: orderItems, subtotal, discount: discountAmount, couponCode: appliedCoupon?.code,
      shipping, total, paymentMethod: paymentMethodText, shippingMethod: formData.shippingMethod, status: "pending",
      createdAt: now.toISOString(), notes: formData.notes,
    };

    Promise.all([getWardNameByCode(formData.wardCode), getDistrictNameByCode(formData.districtCode), getProvinceNameByCode(formData.provinceCode)])
      .then(([wardName, districtName, provinceName]) => {
        addOrder({ ...newOrder, shippingAddress: { street: formData.address, ward: wardName, district: districtName, province: provinceName } });
        
        // Hoàn điểm thành viên 5% cho đơn hàng nếu đăng nhập
        if (currentMember) {
          const pointsEarned = Math.floor((total * 0.05) / 1000);
          if (pointsEarned > 0) {
            addPointsToCurrentMember(pointsEarned);
          }
        }

        clearCart();
        setSuccessModal({
          open: true,
          orderNumber,
          customerName: formData.fullName,
          total,
        });
      });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Order Success Modal ──────────────────────────────────────── */}
      <OrderSuccessModal
        open={successModal.open}
        orderNumber={successModal.orderNumber}
        customerName={successModal.customerName}
        total={successModal.total}
        onClose={() => {
          setSuccessModal((prev) => ({ ...prev, open: false }));
          setTimeout(() => navigate("/"), 420);
        }}
      />

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div className="border-b border-black/10 px-10 py-4">
        <div className="flex items-center justify-between">
          {/* Back to cart */}
          <Link to="/cart" className="flex items-center gap-1.5 text-xs text-black/50 uppercase tracking-widest hover:text-black transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Giỏ hàng
          </Link>
          {/* Logo (centered) */}
          <Link to="/">
            <img src={brandLogo} alt="MADMAD" className="h-7 w-auto" />
          </Link>
          {/* Cart icon (right) */}
          <Link to="/cart" className="flex items-center gap-1 text-black/50 hover:text-black transition-colors" aria-label="Giỏ hàng">
            <ShoppingBag className="h-5 w-5" />
            {cartItems.length > 0 && (
              <span className="text-xs font-semibold text-black">{cartItems.length}</span>
            )}
          </Link>
        </div>
      </div>

      {/* ── Main split layout ── 50% white | 50% grey ─────────────────── */}
      <div className="flex min-h-[calc(100vh-65px)]">

        {/* LEFT: white half — form pushed to the right edge */}
        <div className="flex-1 bg-white flex justify-end">
          <div className="w-full max-w-[520px] px-10 py-10">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Contact */}
              <section>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest">Liên hệ</h2>
                <div className="space-y-3">
                  <input type="email" required value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputCls} placeholder="Email" />
                  <input type="tel" required value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={inputCls} placeholder="Số điện thoại" />
                </div>
              </section>

              {/* Delivery */}
              <section>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest">Giao hàng</h2>
                <div className="space-y-3">
                  <input type="text" required value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={inputCls} placeholder="Họ và tên" />
                  <input type="text" required value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={inputCls} placeholder="Địa chỉ (số nhà, tên đường)" />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <SearchableDropdown value={formData.provinceCode} options={provinces}
                      placeholder="Tỉnh/Thành phố" searchPlaceholder="Tìm tỉnh/thành..."
                      onChange={(v) => setFormData({ ...formData, provinceCode: v, districtCode: "", wardCode: "" })} />
                    <SearchableDropdown value={formData.districtCode} options={districts}
                      disabled={!formData.provinceCode}
                      placeholder={formData.provinceCode ? "Quận/Huyện" : "Chọn tỉnh trước"}
                      searchPlaceholder="Tìm quận/huyện..."
                      onChange={(v) => setFormData({ ...formData, districtCode: v, wardCode: "" })} />
                    <SearchableDropdown value={formData.wardCode} options={wards}
                      disabled={!formData.districtCode}
                      placeholder={formData.districtCode ? "Phường/Xã" : "Chọn quận trước"}
                      searchPlaceholder="Tìm phường/xã..."
                      onChange={(v) => setFormData({ ...formData, wardCode: v })} />
                  </div>

                  <textarea rows={2} value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className={`${inputCls} resize-none`} placeholder="Ghi chú đơn hàng (tùy chọn)" />
                </div>
              </section>

              {/* Shipping Method Selection */}
              <section>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest">Phương thức vận chuyển</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, shippingMethod: "standard" })}
                    className={`flex flex-col text-left rounded-xl border-2 p-4 transition-all ${
                      formData.shippingMethod === "standard"
                        ? "border-black bg-black/5"
                        : "border-black/15 hover:border-black"
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">Ship Tiêu Chuẩn (Thường)</span>
                    <span className="text-[10px] text-black/50 mt-1">
                      Giá: {shippingBase > 500000 ? "Miễn phí" : "30.000₫"} (2-4 ngày)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, shippingMethod: "express" })}
                    className={`flex flex-col text-left rounded-xl border-2 p-4 transition-all ${
                      formData.shippingMethod === "express"
                        ? "border-black bg-black/5"
                        : "border-black/15 hover:border-black"
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1">
                      Giao Hỏa Tốc (2h)
                    </span>
                    <span className="text-[10px] text-black/50 mt-1">
                      Giá: 60.000₫ (Giao siêu tốc nội thành)
                    </span>
                  </button>
                </div>
              </section>

              {/* Payment method */}
              <section>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest">Phương thức thanh toán</h2>

                {/* Coupon */}
                {!hasDiscountedProducts && availableCoupons.length > 0 && (
                  <div className="mb-4 border border-black/15 p-4">
                    <p className="mb-2 text-xs text-black/50">Mã giảm giá</p>
                    <div className="flex flex-wrap gap-2">
                      {availableCoupons.map((coupon) => (
                        <button key={coupon.code} type="button"
                          onClick={() => { const r = applyCoupon(coupon.code); window.alert(r.message); }}
                          className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                            appliedCoupon?.code === coupon.code
                              ? "border-black bg-black text-white"
                              : "border-black/30 hover:border-black"
                          }`}>
                          {coupon.code} (-{coupon.discountAmount.toLocaleString("vi-VN")}₫)
                        </button>
                      ))}
                    </div>
                    {appliedCoupon && (
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-green-700">✓ Mã: {appliedCoupon.code}</span>
                        <button onClick={clearCoupon} className="text-red-600 hover:underline">Bỏ mã</button>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {[
                    { value: "cod",  label: "Thanh toán khi nhận hàng (COD)" },
                    { value: "bank", label: "Chuyển khoản ngân hàng" },
                    { value: "momo", label: "Ví điện tử MoMo" },
                  ].map((m) => (
                    <label key={m.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-colors ${
                        formData.paymentMethod === m.value ? "border-black bg-black/5" : "border-black/30 hover:border-black"
                      }`}>
                      <input type="radio" name="payment" value={m.value}
                        checked={formData.paymentMethod === m.value}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="accent-black h-4 w-4" />
                      <span className="text-sm">{m.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Submit */}
              <button type="submit"
                className="w-full rounded-xl bg-black py-4 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80">
                Đặt hàng ngay
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: grey half — order summary pushed to the left edge */}
        <div className="hidden lg:flex flex-1 bg-[#f5f5f5] border-l border-black/10 justify-start">
          <div className="w-full max-w-[420px] px-10 py-10">
            <div className="sticky top-6">
              <h2 className="mb-5 text-xs font-bold uppercase tracking-widest text-black/60">Đơn hàng của bạn</h2>

              {/* Items */}
              <div className="mb-6 space-y-4">
                {resolvedItems.map(({ item, product }) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {/* Image — no quantity badge */}
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden bg-white border border-black/10 rounded-lg">
                      <ImageWithFallback src={product.image} alt={product.name}
                        className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-bold uppercase tracking-wide">{product.name}</p>
                      <p className="text-xs text-black/50">
                        {item.size}{item.color ? ` / ${item.color}` : ""}
                      </p>
                    </div>
                    <p className="text-xs font-semibold whitespace-nowrap">
                      {(item.priceAtAdd * item.quantity).toLocaleString("vi-VN")}₫
                    </p>
                  </div>
                ))}
                {resolvedItems.length === 0 && (
                  <p className="text-xs text-black/40">Giỏ hàng trống.</p>
                )}
              </div>

              {/* Divider */}
              <div className="mb-4 border-t border-black/10" />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-black/60">Tạm tính · {resolvedItems.length} sản phẩm</span>
                  <span>{subtotal.toLocaleString("vi-VN")}₫</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-black/60">Giảm giá {appliedCoupon ? `(${appliedCoupon.code})` : ""}</span>
                    <span className="text-green-700">- {discountAmount.toLocaleString("vi-VN")}₫</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-black/60">Vận chuyển</span>
                  <span>{shipping === 0 ? <span className="text-green-700">Miễn phí</span> : `${shipping.toLocaleString("vi-VN")}₫`}</span>
                </div>
                {shippingBase < 500000 && shipping > 0 && (
                  <p className="text-xs text-black/50">
                    Thêm {(500000 - shippingBase).toLocaleString("vi-VN")}₫ để miễn phí vận chuyển
                  </p>
                )}
              </div>

              <div className="mt-4 border-t border-black/10 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold uppercase tracking-widest">Tổng cộng</span>
                  <span className="text-xl font-semibold">{total.toLocaleString("vi-VN")}₫</span>
                </div>
              </div>
            </div>
        </div>
      </div>
      </div>
    </div>
  );
}
