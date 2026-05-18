import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ShoppingBag, Trash2, Plus, Minus, Copy, Check } from "lucide-react";
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
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";
import type { Order, OrderItem } from "@/types/order";

/* ── Shared input className ───────────────────────────────────────────── */
const inputCls =
  "w-full rounded-xl border-2 border-black/15 bg-white px-4 py-3 text-sm placeholder:text-black/35 focus:border-black/80 focus:outline-none focus:ring-0 transition-colors";

export function CheckoutPage() {
  const { products } = useProducts();
  const { settings } = useStorefrontSettings();
  const { addOrder } = useOrders();
  const { currentMember, addPointsToCurrentMember, tierConfigs } = useMembership();
  const {
    cartItems,
    subtotal,
    availableCoupons,
    appliedCoupon,
    discountAmount,
    applyCoupon,
    clearCoupon,
    clearCart,
    removeFromCart,
    updateItemQuantity,
  } = useCart();
  const navigate = useTransitionTo();
  const [typedCoupon, setTypedCoupon] = useState("");
  const [orderNumber] = useState(() => {
    const now = new Date();
    return `DH${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(Math.floor(1000 + Math.random() * 9000))}`;
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const [successModal, setSuccessModal] = useState<{
    open: boolean;
    orderNumber: string;
    customerName: string;
    total: number;
  }>({ open: false, orderNumber: "", customerName: "", total: 0 });

  const [formData, setFormData] = useState(() => {
    let savedInfo: any = {};
    try {
      const stored = localStorage.getItem("madmad_last_delivery_info");
      if (stored) {
        savedInfo = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading madmad_last_delivery_info", e);
    }

    return {
      fullName: currentMember?.fullName || savedInfo.fullName || "",
      email: currentMember?.email || savedInfo.email || "",
      phone: currentMember?.phone || savedInfo.phone || "",
      address: savedInfo.address || "",
      provinceCode: savedInfo.provinceCode || "",
      districtCode: savedInfo.districtCode || "",
      wardCode: savedInfo.wardCode || "",
      notes: "",
      paymentMethod: (settings.enableCod ?? true) ? "cod" : ((settings.enableBank ?? true) ? "bank" : ((settings.enableMomo ?? true) ? "momo" : "paypal")),
      shippingMethod: "standard" as "standard" | "express",
    };
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

  const resolvedItems = cartItems
    .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
    .filter((e): e is { item: (typeof cartItems)[number]; product: NonNullable<(typeof products)[number]> } => Boolean(e.product));
  const hasDiscountedProducts = resolvedItems.some(({ product }) => (product.discountPercent ?? 0) > 0);

  useEffect(() => {
    if (hasDiscountedProducts && appliedCoupon) clearCoupon();
  }, [appliedCoupon, clearCoupon, hasDiscountedProducts]);

  const memberConfig = currentMember ? tierConfigs.find((c) => c.tier === currentMember.tier) : null;
  const memberDiscountPercent = memberConfig ? memberConfig.discountPercent : 0;
  
  // Rule A: VIP discount only applies to full-price items in the cart (exclude already discounted/sale items)
  const nonSaleSubtotal = resolvedItems.reduce((sum, { item, product }) => {
    const isSale = (product.discountPercent ?? 0) > 0;
    return sum + (isSale ? 0 : item.priceAtAdd * item.quantity);
  }, 0);
  
  const vipDiscountAmount = currentMember ? Math.round(nonSaleSubtotal * (memberDiscountPercent / 100)) : 0;

  // Rule B: Safety Cap to prevent excessive discount stacking (max 35% of total subtotal)
  const rawDiscount = discountAmount + vipDiscountAmount;
  const maxDiscountCap = Math.round(subtotal * 0.35); // 35% cap
  const totalDiscount = Math.min(rawDiscount, maxDiscountCap);
  const isDiscountCapped = rawDiscount > maxDiscountCap;

  const shippingBase = subtotal - totalDiscount;
  const feeStandard = settings.shippingFeeStandard ?? 30000;
  const feeExpress = settings.shippingFeeExpress ?? 60000;
  const freeThreshold = settings.shippingFreeThreshold ?? 500000;

  const shipping = formData.shippingMethod === "express" 
    ? feeExpress 
    : (shippingBase >= freeThreshold ? 0 : feeStandard);
  const total = Math.max(0, subtotal - totalDiscount) + shipping;

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

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    if (resolvedItems.length === 0) { window.alert("Giỏ hàng đang trống."); return; }
    if (!formData.fullName || !formData.phone || !formData.email || !formData.address || !formData.wardCode) {
      window.alert("Vui lòng điền đầy đủ thông tin giao hàng!"); return;
    }

    // Save last delivery details to localStorage for next purchase autocomplete
    const lastDeliveryInfo = {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      provinceCode: formData.provinceCode,
      districtCode: formData.districtCode,
      wardCode: formData.wardCode,
    };
    try {
      localStorage.setItem("madmad_last_delivery_info", JSON.stringify(lastDeliveryInfo));
    } catch (e) {
      console.error("Error saving last delivery info", e);
    }

    const orderItems: OrderItem[] = resolvedItems.map(({ item, product }) => ({
      product, quantity: item.quantity, size: item.size, color: item.color, price: item.priceAtAdd,
    }));
    const now = new Date();
    const paymentMethodText = formData.paymentMethod;

    const newOrder: Order = {
      id: 0, orderNumber, customerName: formData.fullName, customerEmail: formData.email,
      customerPhone: formData.phone, shippingAddress: { street: formData.address, ward: "", district: "", province: "" },
      items: orderItems, subtotal, discount: totalDiscount,
      couponCode: appliedCoupon?.code
        ? `${appliedCoupon.code} + VIP ${currentMember?.tier || ""}`
        : (currentMember ? `VIP ${currentMember.tier}` : undefined),
      shipping, total, paymentMethod: paymentMethodText, shippingMethod: formData.shippingMethod, status: "pending",
      createdAt: now.toISOString(), notes: formData.notes,
    };

    Promise.all([getWardNameByCode(formData.wardCode), getDistrictNameByCode(formData.districtCode), getProvinceNameByCode(formData.provinceCode)])
      .then(([wardName, districtName, provinceName]) => {
        addOrder({ ...newOrder, shippingAddress: { street: formData.address, ward: wardName, district: districtName, province: provinceName } });
        
        // Hoàn điểm thành viên VIP dựa trên giá trị chi tiêu thực tế (1 điểm = 10.000 VNĐ)
        if (currentMember) {
          const pointsEarned = Math.floor(total / 10000);
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
        onClose={(targetPath) => {
          setSuccessModal((prev) => ({ ...prev, open: false }));
          setTimeout(() => navigate(targetPath || "/"), 420);
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
                      Giá: {shippingBase >= freeThreshold ? "Miễn phí" : `${feeStandard.toLocaleString("vi-VN")}₫`} (2-4 ngày)
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
                      Giá: {feeExpress.toLocaleString("vi-VN")}₫ (Giao siêu tốc nội thành)
                    </span>
                  </button>
                </div>
              </section>

              {/* Payment method */}
              <section>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest">Phương thức thanh toán</h2>

                {/* Coupon / Voucher Entry */}
                {true && (
                  <div className="mb-6 rounded-xl border border-black/10 bg-stone-50 p-4 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-black">Mã giảm giá / Voucher</h3>
                    
                    {/* Manual input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={typedCoupon}
                        onChange={(e) => setTypedCoupon(e.target.value)}
                        placeholder="Nhập mã giảm giá của bạn..."
                        className="flex-1 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider focus:border-black/60 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!typedCoupon.trim()) {
                            window.alert("Vui lòng nhập mã giảm giá!");
                            return;
                          }
                          const r = applyCoupon(typedCoupon.trim().toUpperCase());
                          window.alert(r.message);
                          if (r.success) {
                            setTypedCoupon("");
                          }
                        }}
                        className="rounded-xl bg-black text-white hover:bg-neutral-800 px-4 text-xs font-black tracking-widest uppercase transition-all"
                      >
                        Áp dụng
                      </button>
                    </div>

                    {/* Suggestions */}
                    {availableCoupons.length > 0 && (
                      <div className="space-y-2 border-t border-black/5 pt-3">
                        <p className="text-[10px] font-extrabold tracking-wider uppercase text-black/40">Gợi ý Voucher dành cho bạn:</p>
                        <div className="flex flex-wrap gap-2">
                          {availableCoupons.map((coupon) => (
                            <button
                              key={coupon.code}
                              type="button"
                              onClick={() => {
                                const r = applyCoupon(coupon.code);
                                window.alert(r.message);
                              }}
                              className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                appliedCoupon?.code === coupon.code
                                  ? "border-black bg-black text-white"
                                  : "border-black/15 bg-white text-black/75 hover:border-black"
                              }`}
                            >
                              🎫 {coupon.code} (-{coupon.discountAmount.toLocaleString("vi-VN")}₫)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active Coupon Feedback */}
                    {appliedCoupon && (
                      <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800 font-semibold mt-2">
                        <span>✓ Đã áp dụng mã: <span className="font-black font-mono tracking-wider text-green-950 uppercase">{appliedCoupon.code}</span> (-{appliedCoupon.discountAmount.toLocaleString("vi-VN")}₫)</span>
                        <button type="button" onClick={clearCoupon} className="text-[10px] font-black text-red-600 hover:text-red-800 hover:underline uppercase tracking-wider">Hủy mã</button>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {[
                    { value: "cod",  label: "Thanh toán khi nhận hàng (COD)", active: settings.enableCod ?? true },
                    { value: "bank", label: "Chuyển khoản ngân hàng", active: settings.enableBank ?? true },
                    { value: "momo", label: "Ví điện tử MoMo", active: settings.enableMomo ?? true },
                    { value: "paypal", label: "Thanh toán qua PayPal (USD)", active: settings.enablePaypal ?? true },
                  ].filter(m => m.active).map((m) => (
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

                {/* Payment Detail Instructions Panel */}
                {formData.paymentMethod === "bank" && (
                  <div className="mt-4 rounded-xl border border-black/10 bg-stone-50 p-4 space-y-4 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                      <div className="bg-white p-2 rounded-xl border border-black/5 flex-shrink-0 shadow-sm">
                        <img
                          src={`https://img.vietqr.io/image/${settings.bankId || 'MB'}-${settings.bankAccount || '0999999999'}-compact.png?amount=${total}&addInfo=${encodeURIComponent(`MADMAD ${orderNumber}`)}&accountName=${encodeURIComponent(settings.bankAccountName || 'MADMAD STUDIO')}`}
                          alt="VietQR Chuyển khoản"
                          className="h-32 w-32 object-contain"
                        />
                      </div>
                      <div className="flex-1 space-y-2 text-xs w-full">
                        <p className="font-bold uppercase text-[9px] tracking-wider text-black/50">Thông tin chuyển khoản</p>
                        
                        <div className="space-y-1">
                          <p className="text-black/60 text-[9px]">Ngân hàng:</p>
                          <p className="font-bold text-black text-sm uppercase">{settings.bankId || "MB Bank"}</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-black/60 text-[9px]">Chủ tài khoản:</p>
                          <p className="font-black text-black">{settings.bankAccountName || "MADMAD STUDIO"}</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-black/60 text-[9px]">Số tài khoản:</p>
                          <div className="flex items-center justify-between gap-2 bg-white rounded-lg border border-black/5 px-2.5 py-1.5">
                            <span className="font-mono font-bold text-black text-xs">{settings.bankAccount || "0999999999"}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(settings.bankAccount || "0999999999", "bankAccount")}
                              className="text-stone-400 hover:text-black transition-colors"
                            >
                              {copiedField === "bankAccount" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-black/60 text-[9px]">Nội dung chuyển khoản:</p>
                          <div className="flex items-center justify-between gap-2 bg-white rounded-lg border border-black/5 px-2.5 py-1.5">
                            <span className="font-mono font-black text-black tracking-wider text-xs uppercase">{`MADMAD ${orderNumber}`}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(`MADMAD ${orderNumber}`, "bankMemo")}
                              className="text-stone-400 hover:text-black transition-colors"
                            >
                              {copiedField === "bankMemo" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-black/60 text-[9px]">Số tiền:</p>
                          <div className="flex items-center justify-between gap-2 bg-white rounded-lg border border-black/5 px-2.5 py-1.5">
                            <span className="font-bold text-red-600 text-xs">{total.toLocaleString("vi-VN")}₫</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(String(total), "bankTotal")}
                              className="text-stone-400 hover:text-black transition-colors"
                            >
                              {copiedField === "bankTotal" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        <p className="text-[10px] text-green-700 font-bold pt-1">✓ Quét VietQR để điền tự động 100% hoặc sao chép nhanh ở trên.</p>
                      </div>
                    </div>
                  </div>
                )}

                {formData.paymentMethod === "momo" && (
                  <div className="mt-4 rounded-xl border border-black/10 bg-stone-50 p-4 space-y-4 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                      <div className="bg-white p-2 rounded-xl border border-black/5 flex-shrink-0 shadow-sm">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`momo://?phone=${settings.momoPhone || '0999999999'}&amount=${total}&note=${encodeURIComponent(`MADMAD ${orderNumber}`)}`)}`}
                          alt="MoMo QR"
                          className="h-32 w-32 object-contain"
                        />
                      </div>
                      <div className="flex-1 space-y-2 text-xs w-full">
                        <p className="font-bold uppercase text-[9px] tracking-wider text-black/50">Ví điện tử MoMo</p>
                        
                        <div className="space-y-1">
                          <p className="text-black/60 text-[9px]">Tên tài khoản:</p>
                          <p className="font-black text-black">{settings.momoAccountName || "MADMAD STUDIO"}</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-black/60 text-[9px]">Số điện thoại MoMo:</p>
                          <div className="flex items-center justify-between gap-2 bg-white rounded-lg border border-black/5 px-2.5 py-1.5">
                            <span className="font-mono font-bold text-black text-xs">{settings.momoPhone || "0999999999"}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(settings.momoPhone || "0999999999", "momoPhone")}
                              className="text-stone-400 hover:text-black transition-colors"
                            >
                              {copiedField === "momoPhone" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-black/60 text-[9px]">Nội dung chuyển tiền:</p>
                          <div className="flex items-center justify-between gap-2 bg-white rounded-lg border border-black/5 px-2.5 py-1.5">
                            <span className="font-mono font-black text-black tracking-wider text-xs uppercase">{`MADMAD ${orderNumber}`}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(`MADMAD ${orderNumber}`, "momoMemo")}
                              className="text-stone-400 hover:text-black transition-colors"
                            >
                              {copiedField === "momoMemo" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-black/60 text-[9px]">Số tiền:</p>
                          <div className="flex items-center justify-between gap-2 bg-white rounded-lg border border-black/5 px-2.5 py-1.5">
                            <span className="font-bold text-red-600 text-xs">{total.toLocaleString("vi-VN")}₫</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(String(total), "momoTotal")}
                              className="text-stone-400 hover:text-black transition-colors"
                            >
                              {copiedField === "momoTotal" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        <p className="text-[10px] text-red-600 font-bold pt-1">✓ Chuyển khoản đúng số tiền và nội dung để hệ thống duyệt tự động.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* PayPal Detail Instructions Panel */}
                {formData.paymentMethod === "paypal" && (
                  <div className="mt-4 rounded-xl border border-black/10 bg-stone-50 p-4 space-y-4 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                      <div className="bg-white p-2 rounded-xl border border-black/5 flex-shrink-0 shadow-sm flex flex-col items-center gap-2">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(settings.storeEmail || 'mmadmadstudio@gmail.com')}&amount=${(total / 25000).toFixed(2)}&currency_code=USD&item_name=${encodeURIComponent(`MADMAD ORDER ${orderNumber}`)}`)}`}
                          alt="PayPal QR"
                          className="h-32 w-32 object-contain"
                        />
                        <span className="text-[8px] font-bold text-black/40 uppercase">Quét để thanh toán</span>
                      </div>
                      <div className="flex-1 space-y-2 text-xs w-full">
                        <p className="font-bold uppercase text-[9px] tracking-wider text-black/50">Cổng thanh toán quốc tế PayPal</p>
                        
                        <div className="space-y-1">
                          <p className="text-black/60 text-[9px]">Tài khoản PayPal nhận tiền:</p>
                          <div className="flex items-center justify-between gap-2 bg-white rounded-lg border border-black/5 px-2.5 py-1.5">
                            <span className="font-bold text-black text-xs break-all">{settings.storeEmail || "mmadmadstudio@gmail.com"}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(settings.storeEmail || "mmadmadstudio@gmail.com", "paypalEmail")}
                              className="text-stone-400 hover:text-black transition-colors"
                            >
                              {copiedField === "paypalEmail" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-black/60 text-[9px]">Tổng thanh toán quy đổi (USD):</p>
                          <div className="flex items-center justify-between gap-2 bg-white rounded-lg border border-black/5 px-2.5 py-1.5">
                            <span className="font-black text-blue-600 text-xs">${(total / 25000).toFixed(2)} USD</span>
                            <span className="text-[9px] text-black/45">(~{total.toLocaleString("vi-VN")}₫)</span>
                          </div>
                        </div>

                        <div className="pt-2">
                          <a
                            href={`https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(settings.storeEmail || 'mmadmadstudio@gmail.com')}&amount=${(total / 25000).toFixed(2)}&currency_code=USD&item_name=${encodeURIComponent(`MADMAD ORDER ${orderNumber}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#FFC439] hover:bg-[#F2B222] py-2 px-4 text-xs font-black uppercase text-[#003087] transition-all tracking-wider shadow-sm cursor-pointer"
                          >
                            <span>Thanh toán bằng PayPal</span>
                            <span className="font-black text-[10px] text-[#0079C1] italic">Pay</span>
                            <span className="font-black text-[10px] text-[#00457C] italic">Pal</span>
                          </a>
                        </div>
                        
                        <p className="text-[10px] text-blue-800 font-bold pt-1">✓ Click nút màu vàng phía trên để mở trang thanh toán an toàn của PayPal.</p>
                      </div>
                    </div>
                  </div>
                )}
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
              <div className="mb-6 space-y-3.5">
                {resolvedItems.map(({ item, product }) => (
                  <div key={item.id} className="flex items-center gap-3 bg-white border border-black/5 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                    {/* Image */}
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden bg-white border border-black/10 rounded-lg">
                      <ImageWithFallback src={product.image} alt={product.name}
                        className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-extrabold uppercase tracking-wide text-black">{product.name}</p>
                      <p className="text-[10px] text-black/45 mt-0.5 uppercase">
                        {item.size}{item.color ? ` / ${item.color}` : ""}
                      </p>
                      
                      {/* Interactive inline quantity adjuster + delete */}
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center border border-black/10 rounded bg-stone-50 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.quantity > 1) {
                                updateItemQuantity(item.id, item.quantity - 1);
                              } else {
                                removeFromCart(item.id);
                              }
                            }}
                            className="p-1 hover:bg-black/5 text-black/60 transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 text-[10px] font-bold text-black">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-black/5 text-black/60 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        
                        {/* Quick Trash icon */}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-black/35 hover:text-red-600 transition-colors p-1"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-black font-mono">
                        {(item.priceAtAdd * item.quantity).toLocaleString("vi-VN")}₫
                      </p>
                    </div>
                  </div>
                ))}
                {resolvedItems.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-black/10 rounded-xl bg-white">
                    <p className="text-xs text-black/40">Giỏ hàng trống.</p>
                  </div>
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
                {vipDiscountAmount > 0 && (
                  <div className="flex justify-between font-semibold text-stone-900 animate-fadeIn">
                    <span className="text-black/60">Chiết khấu VIP {currentMember?.tier} ({memberDiscountPercent}%)</span>
                    <span className="text-red-700">- {vipDiscountAmount.toLocaleString("vi-VN")}₫</span>
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
                {isDiscountCapped && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[10px] font-semibold text-amber-800 space-y-0.5 mt-2 animate-fadeIn">
                    <p className="font-bold uppercase tracking-wider">⚠️ Đã đạt giới hạn giảm giá (35%)</p>
                    <p className="opacity-95">Để bảo đảm chính sách giá của thương hiệu, tổng chiết khấu (Voucher + VIP) được giới hạn tối đa ở mức 35%.</p>
                  </div>
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
