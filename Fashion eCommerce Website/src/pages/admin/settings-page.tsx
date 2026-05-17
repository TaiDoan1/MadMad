import { useEffect, useState } from "react";
import { Save, Upload, Plus, Trash2, Tag, ShieldCheck, Settings, Percent } from "lucide-react";
import { Link } from "react-router";

import { brandLogo } from "@/assets/images";
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";
import { readStoredCoupons, saveCoupons } from "@/features/promotions/services/coupon-service";
import type { Coupon } from "@/types/coupon";

export function AdminSettingsPage() {
  const { settings, updateSettings } = useStorefrontSettings();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<"branding" | "coupons">("branding");

  // Branding States
  const [currentLogo, setCurrentLogo] = useState(settings.logo || brandLogo);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [storeName, setStoreName] = useState(settings.storeName);
  const [storeEmail, setStoreEmail] = useState(settings.storeEmail);
  const [storePhone, setStorePhone] = useState(settings.storePhone);
  const [storeAddress, setStoreAddress] = useState(settings.storeAddress);

  // Coupons States
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newDiscountAmount, setNewDiscountAmount] = useState("");
  const [couponError, setCouponError] = useState("");

  // Đọc dữ liệu ban đầu
  useEffect(() => {
    setCurrentLogo(settings.logo || brandLogo);
    setStoreName(settings.storeName);
    setStoreEmail(settings.storeEmail);
    setStorePhone(settings.storePhone);
    setStoreAddress(settings.storeAddress);

    // Đọc danh sách coupon từ service
    const storedCoupons = readStoredCoupons();
    setCoupons(storedCoupons);
  }, [settings]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setPreviewLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = () => {
    const nextLogo = previewLogo || currentLogo;
    if (previewLogo) {
      setCurrentLogo(previewLogo);
      setPreviewLogo(null);
    }
    updateSettings({
      logo: nextLogo,
      storeName,
      storeEmail,
      storePhone,
      storeAddress,
    });
    window.alert("Đã lưu cài đặt nhận diện thương hiệu thành công!");
  };

  // Thêm mã giảm giá mới
  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");

    const code = newCouponCode.trim().toUpperCase();
    const amount = Number(newDiscountAmount);

    if (!code) {
      setCouponError("Vui lòng nhập mã giảm giá!");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setCouponError("Số tiền giảm phải là một số lớn hơn 0!");
      return;
    }

    // Kiểm tra mã trùng
    if (coupons.some((c) => c.code === code)) {
      setCouponError("Mã giảm giá này đã tồn tại trên hệ thống!");
      return;
    }

    const newCoupon: Coupon = { code, discountAmount: amount };
    const updatedCoupons = [...coupons, newCoupon];
    
    setCoupons(updatedCoupons);
    saveCoupons(updatedCoupons); // Lưu đồng bộ xuống localStorage

    // Reset Form
    setNewCouponCode("");
    setNewDiscountAmount("");
    window.alert(`Đã kích hoạt mã giảm giá ${code} thành công!`);
  };

  // Xóa mã giảm giá
  const handleDeleteCoupon = (code: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa mã giảm giá ${code} không?`)) {
      const updatedCoupons = coupons.filter((c) => c.code !== code);
      setCoupons(updatedCoupons);
      saveCoupons(updatedCoupons); // Lưu đồng bộ xuống localStorage
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-black uppercase">CÀI ĐẶT HỆ THỐNG</h1>
          <p className="text-xs text-black/50">Quản lý nhận diện thương hiệu MADMAD và các chương trình khuyến mãi VIP</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/storefront" className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors hover:bg-stone-50">
            Storefront Settings
          </Link>
        </div>
      </div>

      {/* Tabs Sleek Navigation */}
      <div className="flex border-b border-black/10">
        <button
          onClick={() => setActiveTab("branding")}
          className={`px-6 py-3 text-xs font-extrabold tracking-widest uppercase border-b-2 transition-all ${
            activeTab === "branding"
              ? "border-black text-black"
              : "border-transparent text-black/40 hover:text-black"
          }`}
        >
          Nhận Diện Thương Hiệu
        </button>
        <button
          onClick={() => setActiveTab("coupons")}
          className={`px-6 py-3 text-xs font-extrabold tracking-widest uppercase border-b-2 transition-all ${
            activeTab === "coupons"
              ? "border-black text-black"
              : "border-transparent text-black/40 hover:text-black"
          }`}
        >
          Khuyến Mãi & Coupons ({coupons.length})
        </button>
      </div>

      {/* TAB 1: NHẬN DIỆN THƯƠNG HIỆU (BRANDING) */}
      {activeTab === "branding" && (
        <div className="space-y-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-xs font-extrabold tracking-widest text-black/45 uppercase mb-4">Logo Cửa Hàng</h3>
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="flex-1">
                <div className="rounded-2xl border-2 border-dashed border-black/15 p-6 text-center bg-stone-50/50 hover:bg-white transition-all">
                  <img src={previewLogo || currentLogo} alt="Store Logo" className="mx-auto mb-4 max-h-24 object-contain" />
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-xl bg-stone-100 p-2.5 border border-black/5">
                        <Upload className="h-5 w-5 text-black/60" />
                      </div>
                      <p className="text-xs font-bold text-black/70">Tải logo thương hiệu mới</p>
                    </div>
                  </label>
                  <p className="mt-3 text-[10px] text-black/35 leading-relaxed">
                    Khuyến nghị logo: Kích thước vuông, nền trong suốt (PNG/WebP).
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-4 text-xs font-semibold text-black/80">
                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Tên thương hiệu</label>
                  <input
                    value={storeName}
                    onChange={(event) => setStoreName(event.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none focus:ring-0 transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Email liên hệ</label>
                  <input
                    value={storeEmail}
                    onChange={(event) => setStoreEmail(event.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none focus:ring-0 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Số điện thoại CSKH</label>
                  <input
                    value={storePhone}
                    onChange={(event) => setStorePhone(event.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none focus:ring-0 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Địa chỉ Showroom</label>
                  <input
                    value={storeAddress}
                    onChange={(event) => setStoreAddress(event.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none focus:ring-0 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-black/10 pt-5">
            <button
              onClick={handleSaveBranding}
              className="flex items-center gap-2 rounded-xl bg-black text-white hover:bg-red-700 px-6 h-11 text-xs font-bold tracking-widest uppercase transition-all shadow-md shadow-black/10"
            >
              <Save className="h-4 w-4" />
              LƯU CÀI ĐẶT
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: KHUYẾN MÃI & COUPONS */}
      {activeTab === "coupons" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Cột trái: Form Thêm Coupon */}
          <div className="md:col-span-5 space-y-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm h-fit">
            <div className="flex items-center gap-2 border-b border-black/5 pb-3">
              <Tag className="h-4 w-4 text-black/60" />
              <h3 className="text-xs font-extrabold tracking-widest text-black/75 uppercase">TẠO MÃ GIẢM GIÁ MỚI</h3>
            </div>

            {couponError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[10px] font-extrabold tracking-wide rounded-xl flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                {couponError}
              </div>
            )}

            <form onSubmit={handleAddCoupon} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">
                  Mã Coupon (Dạng viết hoa, liền nhau)
                </label>
                <input
                  type="text"
                  required
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  placeholder="VÍ DỤ: MAD20, SALE100K..."
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none focus:ring-0 transition-all font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">
                  Giá trị giảm (Bằng số tiền VNĐ)
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={1000}
                  value={newDiscountAmount}
                  onChange={(e) => setNewDiscountAmount(e.target.value)}
                  placeholder="VÍ DỤ: 50000 (tương đương 50k)..."
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none focus:ring-0 transition-all font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white hover:bg-red-700 h-11 text-xs font-bold tracking-widest uppercase transition-all rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-black/10"
              >
                <Plus className="h-4 w-4" />
                Kích Hoạt Coupon
              </button>
            </form>
          </div>

          {/* Cột phải: Danh sách mã đang hoạt động */}
          <div className="md:col-span-7 space-y-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="flex justify-between items-center border-b border-black/5 pb-3">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-black/60" />
                <h3 className="text-xs font-extrabold tracking-widest text-black/75 uppercase">COUPONS ĐANG HOẠT ĐỘNG</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-black text-white rounded-full">
                {coupons.length} MÃ
              </span>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
              {coupons.length === 0 ? (
                <div className="border border-dashed border-black/15 rounded-xl p-8 text-center bg-stone-50">
                  <p className="text-xs font-bold text-black/40">Chưa có mã giảm giá nào được tạo.</p>
                  <p className="text-[10px] text-black/30 mt-1">Sử dụng form bên trái để tạo mã đầu tiên của bạn.</p>
                </div>
              ) : (
                coupons.map((coupon) => (
                  <div
                    key={coupon.code}
                    className="flex justify-between items-center border border-black/5 rounded-xl p-4 bg-stone-50/50 hover:bg-white hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-2.5">
                        <Tag className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-mono font-black text-sm text-black tracking-wider uppercase">
                          {coupon.code}
                        </p>
                        <p className="text-[10px] text-green-700 font-bold mt-0.5">
                          Giảm: {coupon.discountAmount.toLocaleString("vi-VN")}₫ trên hóa đơn
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCoupon(coupon.code)}
                      className="rounded-lg p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      title="Xóa mã giảm giá"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 text-[10px] text-black/40 font-semibold">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              Mã giảm giá được đồng bộ tự động xuống giao diện thanh toán (Checkout) của khách hàng.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
