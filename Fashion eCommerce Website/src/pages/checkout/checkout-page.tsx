import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, CreditCard, ShoppingBag, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
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

export function CheckoutPage() {
  const { products } = useProducts();
  const { addOrder } = useOrders();
  const { cartItems, subtotal, availableCoupons, appliedCoupon, discountAmount, applyCoupon, clearCoupon, clearCart } = useCart();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    provinceCode: "",
    districtCode: "",
    wardCode: "",
    notes: "",
    paymentMethod: "cod",
  });
  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [districts, setDistricts] = useState<AddressOption[]>([]);
  const [wards, setWards] = useState<AddressOption[]>([]);

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replaceAll("đ", "d");

  const shippingBase = subtotal - discountAmount;
  const shipping = shippingBase > 500000 ? 0 : 30000;
  const total = Math.max(0, subtotal - discountAmount) + shipping;
  useEffect(() => {
    let alive = true;
    getProvinces().then((data) => {
      if (!alive) return;
      setProvinces(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    getDistrictsByProvinceCode(formData.provinceCode).then((data) => {
      if (!alive) return;
      setDistricts(data);
    });
    return () => {
      alive = false;
    };
  }, [formData.provinceCode]);

  useEffect(() => {
    let alive = true;
    getWardsByDistrictCode(formData.districtCode).then((data) => {
      if (!alive) return;
      setWards(data);
    });
    return () => {
      alive = false;
    };
  }, [formData.districtCode]);

  const SearchableDropdown = ({
    value,
    options,
    onChange,
    placeholder,
    disabled,
    searchPlaceholder,
  }: {
    value: string;
    options: AddressOption[];
    onChange: (nextValue: string) => void;
    placeholder: string;
    disabled?: boolean;
    searchPlaceholder: string;
  }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      if (!open) return;
      inputRef.current?.focus();

      const onDocMouseDown = (event: MouseEvent) => {
        const el = containerRef.current;
        if (!el) return;
        if (event.target instanceof Node && !el.contains(event.target)) {
          setOpen(false);
          setQuery("");
        }
      };
      document.addEventListener("mousedown", onDocMouseDown);
      return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, [open]);

    const selectedLabel = options.find((opt) => opt.code === value)?.name ?? "";
    const filtered = useMemo(() => {
      const q = normalizeText(query.trim());
      if (!q) return options;
      return options.filter((opt) => normalizeText(opt.name).includes(q));
    }, [options, query]);

    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded border border-border bg-input-background px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
        >
          <span className={selectedLabel ? "" : "text-muted-foreground"}>{selectedLabel || placeholder}</span>
          <span className="text-muted-foreground">▾</span>
        </button>

        {open && !disabled && (
          <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-lg border border-border bg-white shadow-xl">
            <div className="border-b border-border p-2">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={searchPlaceholder}
              />
            </div>
            <div className="max-h-64 overflow-auto p-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">Không tìm thấy.</div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => {
                      onChange(opt.code);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                      opt.code === value ? "bg-primary/10 text-primary" : ""
                    }`}
                  >
                    {opt.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  const resolvedItems = cartItems
    .map((item) => ({
      item,
      product: products.find((product) => product.id === item.productId),
    }))
    .filter((entry): entry is { item: typeof cartItems[number]; product: NonNullable<(typeof products)[number]> } => Boolean(entry.product));
  const hasDiscountedProducts = resolvedItems.some(({ product }) => (product.discountPercent ?? 0) > 0);

  useEffect(() => {
    if (hasDiscountedProducts && appliedCoupon) {
      clearCoupon();
    }
  }, [appliedCoupon, clearCoupon, hasDiscountedProducts]);

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    if (resolvedItems.length === 0) {
      window.alert("Giỏ hàng đang trống.");
      return;
    }

    if (!formData.fullName || !formData.phone || !formData.email || !formData.address || !formData.wardCode || !formData.districtCode || !formData.provinceCode) {
      window.alert("Vui lòng điền đầy đủ thông tin giao hàng!");
      return;
    }

    const orderItems: OrderItem[] = resolvedItems.map(({ item, product }) => ({
      product,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      price: item.priceAtAdd,
    }));

    const now = new Date();
    const orderNumber = `DH${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;
    const paymentMethodText =
      formData.paymentMethod === "cod" ? "COD" : formData.paymentMethod === "bank" ? "Chuyển khoản" : "MoMo";

    const newOrder: Order = {
      id: 0,
      orderNumber,
      customerName: formData.fullName,
      customerEmail: formData.email,
      customerPhone: formData.phone,
      shippingAddress: {
        street: formData.address,
        ward: "",
        district: "",
        province: "",
      },
      items: orderItems,
      subtotal,
      discount: discountAmount,
      couponCode: appliedCoupon?.code,
      shipping,
      total,
      paymentMethod: paymentMethodText,
      status: "pending",
      createdAt: now.toISOString(),
      notes: formData.notes,
    };

    Promise.all([
      getWardNameByCode(formData.wardCode),
      getDistrictNameByCode(formData.districtCode),
      getProvinceNameByCode(formData.provinceCode),
    ]).then(([wardName, districtName, provinceName]) => {
      const orderWithAddress: Order = {
        ...newOrder,
        shippingAddress: {
          street: formData.address,
          ward: wardName,
          district: districtName,
          province: provinceName,
        },
      };

      addOrder(orderWithAddress);
      clearCart();
      window.alert(`Đặt hàng thành công! Mã đơn hàng của bạn là: ${orderNumber}\n\nChúng tôi sẽ liên hệ bạn sớm nhất.`);
      navigate("/");
    });

    return;
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link to="/shop" className="mb-8 inline-flex items-center gap-2 text-primary transition-all hover:gap-3">
          <ArrowLeft className="h-5 w-5" />
          Tiếp tục mua sắm
        </Link>

        <h1 className="mb-8 text-4xl">THANH TOÁN</h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-lg bg-card p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-3">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl">THÔNG TIN GIAO HÀNG</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block">Họ và Tên *</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                      className="w-full rounded border border-border bg-input-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block">Số Điện Thoại *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                      className="w-full rounded border border-border bg-input-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="+84 123 456 789"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    className="w-full rounded border border-border bg-input-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="mb-2 block">Địa Chỉ *</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                    className="w-full rounded border border-border bg-input-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Số nhà, tên đường"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block">Tỉnh/Thành phố *</label>
                    <SearchableDropdown
                      value={formData.provinceCode}
                      options={provinces}
                      placeholder="Chọn Tỉnh/TP"
                      searchPlaceholder="Tìm tỉnh/thành..."
                      onChange={(provinceCode) =>
                        setFormData({
                          ...formData,
                          provinceCode,
                          districtCode: "",
                          wardCode: "",
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block">Quận/Huyện *</label>
                    <SearchableDropdown
                      value={formData.districtCode}
                      options={districts}
                      disabled={!formData.provinceCode}
                      placeholder={formData.provinceCode ? "Chọn Quận/Huyện" : "Chọn Tỉnh/TP trước"}
                      searchPlaceholder="Tìm quận/huyện..."
                      onChange={(districtCode) =>
                        setFormData({
                          ...formData,
                          districtCode,
                          wardCode: "",
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block">Phường/Xã *</label>
                    <SearchableDropdown
                      value={formData.wardCode}
                      options={wards}
                      disabled={!formData.districtCode}
                      placeholder={formData.districtCode ? "Chọn Phường/Xã" : "Chọn Quận/Huyện trước"}
                      searchPlaceholder="Tìm phường/xã..."
                      onChange={(wardCode) => setFormData({ ...formData, wardCode })}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block">Ghi Chú</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                    className="w-full resize-none rounded border border-border bg-input-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ghi chú thêm về đơn hàng (tùy chọn)"
                  />
                </div>
              </form>
            </div>

            <div className="rounded-lg bg-card p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-3">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl">PHƯƠNG THỨC THANH TOÁN</h2>
              </div>

              {!hasDiscountedProducts ? (
                <div className="mb-6 rounded-lg border border-border p-4">
                  <p className="mb-3 text-sm text-muted-foreground">Mã giảm giá</p>
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
                    <div className="mt-3 flex items-center justify-between text-xs text-green-700">
                      <span>Đang dùng mã: {appliedCoupon.code}</span>
                      <button type="button" onClick={clearCoupon} className="text-red-600 hover:underline">
                        Bỏ mã
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-6 rounded-lg border border-border bg-muted/20 p-4 text-xs text-red-600">
                  Giỏ hàng có sản phẩm đã giảm %. Hệ thống tự ẩn phần voucher.
                </div>
              )}

              <div className="space-y-3">
                {[
                  { value: "cod", title: "Thanh toán khi nhận hàng (COD)", description: "Thanh toán bằng tiền mặt khi nhận hàng" },
                  { value: "bank", title: "Chuyển khoản ngân hàng", description: "Chuyển khoản trực tiếp qua ngân hàng" },
                  { value: "momo", title: "Ví điện tử MoMo", description: "Thanh toán qua ví MoMo" },
                ].map((method) => (
                  <label key={method.value} className="flex cursor-pointer items-center gap-3 rounded border-2 border-border p-4 transition-colors hover:border-primary">
                    <input
                      type="radio"
                      name="payment"
                      value={method.value}
                      checked={formData.paymentMethod === method.value}
                      onChange={(event) => setFormData({ ...formData, paymentMethod: event.target.value })}
                      className="h-5 w-5 accent-primary"
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{method.title}</div>
                      <div className="text-sm text-muted-foreground">{method.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6 rounded-lg bg-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-3">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl">ĐƠN HÀNG CỦA BẠN</h3>
              </div>

              <div className="max-h-[300px] space-y-4 overflow-y-auto">
                {resolvedItems.map(({ item, product }) => (
                  <div key={item.id} className="flex gap-4 border-b border-border pb-4">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded bg-muted">
                      <ImageWithFallback src={product.image} alt={product.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="mb-1 text-sm">{product.name}</h4>
                      <p className="mb-1 text-xs text-muted-foreground">{item.size} / {item.color}</p>
                      <p className="text-sm">{item.quantity} x {item.priceAtAdd.toLocaleString("vi-VN")}₫</p>
                    </div>
                  </div>
                ))}
                {resolvedItems.length === 0 && <p className="text-sm text-muted-foreground">Giỏ hàng đang trống.</p>}
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span>{subtotal.toLocaleString("vi-VN")}₫</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Giảm giá {appliedCoupon ? `(${appliedCoupon.code})` : ""}
                    </span>
                    <span className="text-green-600">- {discountAmount.toLocaleString("vi-VN")}₫</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phí vận chuyển</span>
                  <span>{shipping === 0 ? <span className="text-green-600">Miễn phí</span> : `${shipping.toLocaleString("vi-VN")}₫`}</span>
                </div>
                {shippingBase < 500000 && shipping > 0 && (
                  <p className="text-xs text-muted-foreground">Thêm {(500000 - shippingBase).toLocaleString("vi-VN")}₫ để được miễn phí ship</p>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-xl">Tổng cộng</span>
                  <span className="text-3xl text-primary">{total.toLocaleString("vi-VN")}₫</span>
                </div>

                <button onClick={() => handleSubmit()} className="w-full rounded bg-primary py-4 text-lg font-semibold text-white transition-colors hover:bg-primary/90">
                  ĐẶT HÀNG NGAY
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
