import { useEffect, useState } from "react";
import { Save, Upload, Plus, Trash2, Tag, ShieldCheck, Settings, Percent, Mail, Key, Send, DownloadCloud } from "lucide-react";
import { Link } from "react-router";

import { brandLogo } from "@/assets/images";
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";
import { readStoredCoupons, saveCoupons } from "@/features/promotions/services/coupon-service";
import type { Coupon } from "@/types/coupon";
import { API_URL } from "@/config/api";

export function AdminSettingsPage() {
  const { settings, updateSettings } = useStorefrontSettings();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<"branding" | "coupons" | "gateways" | "invoice" | "smtp" | "backup">("branding");

  // Gateways & Shipping States
  const [bankId, setBankId] = useState(settings.bankId || "MB");
  const [bankAccount, setBankAccount] = useState(settings.bankAccount || "0999999999");
  const [bankAccountName, setBankAccountName] = useState(settings.bankAccountName || "MADMAD STUDIO");
  const [momoPhone, setMomoPhone] = useState(settings.momoPhone || "0999999999");
  const [momoAccountName, setMomoAccountName] = useState(settings.momoAccountName || "MADMAD STUDIO");
  const [shippingFeeStandard, setShippingFeeStandard] = useState(String(settings.shippingFeeStandard ?? 30000));
  const [shippingFeeExpress, setShippingFeeExpress] = useState(String(settings.shippingFeeExpress ?? 60000));
  const [shippingFreeThreshold, setShippingFreeThreshold] = useState(String(settings.shippingFreeThreshold ?? 500000));

  // Branding States
  const [currentLogo, setCurrentLogo] = useState(settings.logo || brandLogo);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [storeName, setStoreName] = useState(settings.storeName);
  const [storeEmail, setStoreEmail] = useState(settings.storeEmail);
  const [storePhone, setStorePhone] = useState(settings.storePhone);
  const [storeAddress, setStoreAddress] = useState(settings.storeAddress);
  const [instagramUrl, setInstagramUrl] = useState(settings.instagramUrl || "");
  const [facebookUrl, setFacebookUrl] = useState(settings.facebookUrl || "");
  const [tiktokUrl, setTiktokUrl] = useState(settings.tiktokUrl || "");
  const [shopeeUrl, setShopeeUrl] = useState(settings.shopeeUrl || "");

  // Invoice Print Customization States
  const [printInvoiceTitle, setPrintInvoiceTitle] = useState(settings.printInvoiceTitle || "HÓA ĐƠN VẬN CHUYỂN & GÓI HÀNG");
  const [printInvoiceAddress, setPrintInvoiceAddress] = useState(settings.printInvoiceAddress || "Showroom: 254 Nguyễn Trãi, Q.5, TP.HCM");
  const [printInvoicePhone, setPrintInvoicePhone] = useState(settings.printInvoicePhone || "Hotline: 099.999.9999");
  const [printInvoiceFooterSlogan, setPrintInvoiceFooterSlogan] = useState(settings.printInvoiceFooterSlogan || "CẢM ƠN QUÝ KHÁCH ĐÃ CHỌN MADMAD STUDIO!");
  const [printInvoicePolicy, setPrintInvoicePolicy] = useState(settings.printInvoicePolicy || "");
  const [printInvoiceSubheader, setPrintInvoiceSubheader] = useState(settings.printInvoiceSubheader || "Tối giản . Độc bản . Cao cấp");
  const [printInvoiceBankId, setPrintInvoiceBankId] = useState(settings.printInvoiceBankId || "MB");
  const [printInvoiceBankAccount, setPrintInvoiceBankAccount] = useState(settings.printInvoiceBankAccount || "0999999999");
  const [printInvoiceAccountName, setPrintInvoiceAccountName] = useState(settings.printInvoiceAccountName || "MADMAD STUDIO");

  // SMTP Gmail States
  const [smtpHost, setSmtpHost] = useState(settings.smtpHost || "smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(settings.smtpPort || 587);
  const [smtpUser, setSmtpUser] = useState(settings.smtpUser || "mmadmadstudio@gmail.com");
  const [smtpPass, setSmtpPass] = useState(settings.smtpPass || "yxmbctjhsxkyeznx");
  const [smtpSenderName, setSmtpSenderName] = useState(settings.smtpSenderName || "MADMAD STUDIO");

  // Customer Auto-Email Content States
  const [customerEmailSubject, setCustomerEmailSubject] = useState(settings.customerEmailSubject || "");
  const [customerEmailTemplate, setCustomerEmailTemplate] = useState(settings.customerEmailTemplate || "");

  // Custom Direct Email States
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailSubject, setTestEmailSubject] = useState("");
  const [testEmailBody, setTestEmailBody] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Coupons States
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newDiscountAmount, setNewDiscountAmount] = useState("");
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    setCurrentLogo(settings.logo || brandLogo);
    setStoreName(settings.storeName);
    setStoreEmail(settings.storeEmail);
    setStorePhone(settings.storePhone);
    setStoreAddress(settings.storeAddress);
    setInstagramUrl(settings.instagramUrl || "");
    setFacebookUrl(settings.facebookUrl || "");
    setTiktokUrl(settings.tiktokUrl || "");
    setShopeeUrl(settings.shopeeUrl || "");
    setPrintInvoiceTitle(settings.printInvoiceTitle || "HÓA ĐƠN VẬN CHUYỂN & GÓI HÀNG");
    setPrintInvoiceAddress(settings.printInvoiceAddress || "Showroom: 254 Nguyễn Trãi, Q.5, TP.HCM");
    setPrintInvoicePhone(settings.printInvoicePhone || "Hotline: 099.999.9999");
    setPrintInvoiceFooterSlogan(settings.printInvoiceFooterSlogan || "CẢM ƠN QUÝ KHÁCH ĐÃ CHỌN MADMAD STUDIO!");
    setPrintInvoicePolicy(settings.printInvoicePolicy || "");
    setPrintInvoiceSubheader(settings.printInvoiceSubheader || "Tối giản . Độc bản . Cao cấp");
    setPrintInvoiceBankId(settings.printInvoiceBankId || "MB");
    setPrintInvoiceBankAccount(settings.printInvoiceBankAccount || "0999999999");
    setPrintInvoiceAccountName(settings.printInvoiceAccountName || "MADMAD STUDIO");

    // Cập nhật SMTP states khi settings thay đổi từ DB
    setSmtpHost(settings.smtpHost || "smtp.gmail.com");
    setSmtpPort(settings.smtpPort || 587);
    setSmtpUser(settings.smtpUser || "mmadmadstudio@gmail.com");
    setSmtpPass(settings.smtpPass || "yxmbctjhsxkyeznx");
    setSmtpSenderName(settings.smtpSenderName || "MADMAD STUDIO");
    setCustomerEmailSubject(settings.customerEmailSubject || "");
    setCustomerEmailTemplate(settings.customerEmailTemplate || "");

    // Gateways
    setBankId(settings.bankId || "MB");
    setBankAccount(settings.bankAccount || "0999999999");
    setBankAccountName(settings.bankAccountName || "MADMAD STUDIO");
    setMomoPhone(settings.momoPhone || "0999999999");
    setMomoAccountName(settings.momoAccountName || "MADMAD STUDIO");
    setShippingFeeStandard(String(settings.shippingFeeStandard ?? 30000));
    setShippingFeeExpress(String(settings.shippingFeeExpress ?? 60000));
    setShippingFreeThreshold(String(settings.shippingFreeThreshold ?? 500000));

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
      instagramUrl,
      facebookUrl,
      tiktokUrl,
      shopeeUrl,
    });
    window.alert("Đã lưu cài đặt nhận diện thương hiệu thành công!");
  };

  const handleSaveInvoiceSettings = () => {
    updateSettings({
      printInvoiceTitle,
      printInvoiceAddress,
      printInvoicePhone,
      printInvoiceFooterSlogan,
      printInvoicePolicy,
      printInvoiceSubheader,
      printInvoiceBankId,
      printInvoiceBankAccount,
      printInvoiceAccountName,
    });
    window.alert("Đã lưu thiết lập mẫu in hóa đơn thành công!");
  };

  const handleSaveGateways = () => {
    updateSettings({
      bankId,
      bankAccount,
      bankAccountName,
      momoPhone,
      momoAccountName,
      shippingFeeStandard: Number(shippingFeeStandard) || 0,
      shippingFeeExpress: Number(shippingFeeExpress) || 0,
      shippingFreeThreshold: Number(shippingFreeThreshold) || 0,
    });
    window.alert("Đã lưu thiết lập Cổng Thanh Toán & Vận Chuyển thành công!");
  };

  // 💾 Lưu cài đặt cấu hình SMTP Gmail & Mẫu email động
  const handleSaveSmtpSettings = () => {
    updateSettings({
      smtpHost,
      smtpPort: Number(smtpPort),
      smtpUser,
      smtpPass,
      smtpSenderName,
      customerEmailSubject,
      customerEmailTemplate,
    });
    window.alert("Đã lưu cấu hình SMTP & Mẫu Email Khách hàng thành công!");
  };

  // 📬 Gửi Email Thủ Công trực tiếp từ biểu mẫu (Admin Form)
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailTo || !testEmailSubject || !testEmailBody) {
      window.alert("Vui lòng nhập đầy đủ các thông tin: Người nhận, Tiêu đề và Nội dung!");
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const response = await fetch(`${API_URL}/settings/send-test-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: testEmailTo,
          subject: testEmailSubject,
          body: testEmailBody,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({ success: true, message: "Gửi Email thành công! Hãy kiểm tra hòm thư nhận." });
        setTestEmailTo("");
        setTestEmailSubject("");
        setTestEmailBody("");
      } else {
        setTestResult({ success: false, message: data.message || "Gửi email thất bại. Hãy kiểm tra cấu hình SMTP!" });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Lỗi kết nối mạng hoặc server không phản hồi." });
    } finally {
      setSendingTest(false);
    }
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

  // 💾 Backup Dữ liệu (Export CSV)
  const handleExportBackup = async () => {
    try {
      const ordersRes = await fetch(`${API_URL}/orders`);
      const orders = await ordersRes.json();
      
      const membersRes = await fetch(`${API_URL}/members`);
      const members = await membersRes.json();

      const ordersCsv = [
        ["Mã Đơn", "Khách Hàng", "Email", "SĐT", "Tổng Tiền", "Trạng Thái", "Ngày Đặt"].join(","),
        ...orders.map((o: any) => [
          o.orderNumber,
          `"${o.customerName}"`,
          o.customerEmail,
          o.customerPhone,
          o.total,
          o.status,
          o.createdAt
        ].join(","))
      ].join("\n");

      const membersCsv = [
        ["ID", "Họ Tên", "Email", "SĐT", "Hạng", "Điểm", "Ngày Đăng Ký"].join(","),
        ...members.map((m: any) => [
          m.id,
          `"${m.fullName}"`,
          m.email,
          m.phone,
          m.tier,
          m.points,
          m.createdAt
        ].join(","))
      ].join("\n");

      const orderBlob = new Blob(["\uFEFF" + ordersCsv], { type: "text/csv;charset=utf-8;" });
      const orderLink = document.createElement("a");
      orderLink.href = URL.createObjectURL(orderBlob);
      orderLink.download = `MADMAD_Orders_Backup_${new Date().toISOString().split("T")[0]}.csv`;
      orderLink.click();

      const memberBlob = new Blob(["\uFEFF" + membersCsv], { type: "text/csv;charset=utf-8;" });
      const memberLink = document.createElement("a");
      memberLink.href = URL.createObjectURL(memberBlob);
      memberLink.download = `MADMAD_VIPMembers_Backup_${new Date().toISOString().split("T")[0]}.csv`;
      memberLink.click();

      window.alert("Đã tải xuống thành công bản sao lưu Dữ liệu Đơn hàng và Thành viên VIP!");
    } catch (error) {
      console.error(error);
      window.alert("Lỗi khi tải bản sao lưu. Vui lòng kiểm tra lại kết nối mạng!");
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
        <button
          onClick={() => setActiveTab("gateways")}
          className={`px-6 py-3 text-xs font-extrabold tracking-widest uppercase border-b-2 transition-all ${
            activeTab === "gateways"
              ? "border-black text-black"
              : "border-transparent text-black/40 hover:text-black"
          }`}
        >
          Thanh Toán & Vận Chuyển
        </button>
        <button
          onClick={() => setActiveTab("invoice")}
          className={`px-6 py-3 text-xs font-extrabold tracking-widest uppercase border-b-2 transition-all ${
            activeTab === "invoice"
              ? "border-black text-black"
              : "border-transparent text-black/40 hover:text-black"
          }`}
        >
          Mẫu In Hóa Đơn
        </button>
        <button
          onClick={() => setActiveTab("smtp")}
          className={`px-6 py-3 text-xs font-extrabold tracking-widest uppercase border-b-2 transition-all ${
            activeTab === "smtp"
              ? "border-black text-black"
              : "border-transparent text-black/40 hover:text-black"
          }`}
        >
          SMTP & Gửi Email
        </button>
        <button
          onClick={() => setActiveTab("backup")}
          className={`px-6 py-3 text-xs font-extrabold tracking-widest uppercase border-b-2 transition-all ${
            activeTab === "backup"
              ? "border-red-600 text-red-600"
              : "border-transparent text-black/40 hover:text-black"
          }`}
        >
          Sao Lưu Dữ Liệu
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
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none focus:ring-0 transition-all mb-4"
                  />
                </div>

                <div className="border-t border-black/5 pt-4">
                  <h4 className="text-[10px] font-black tracking-widest text-red-600 uppercase mb-3">Đường dẫn mạng xã hội (Social URLs)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">Facebook URL</label>
                      <input
                        value={facebookUrl}
                        onChange={(event) => setFacebookUrl(event.target.value)}
                        placeholder="https://facebook.com/..."
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">Instagram URL</label>
                      <input
                        value={instagramUrl}
                        onChange={(event) => setInstagramUrl(event.target.value)}
                        placeholder="https://instagram.com/..."
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">TikTok URL</label>
                      <input
                        value={tiktokUrl}
                        onChange={(event) => setTiktokUrl(event.target.value)}
                        placeholder="https://tiktok.com/@..."
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">Shopee Shop URL</label>
                      <input
                        value={shopeeUrl}
                        onChange={(event) => setShopeeUrl(event.target.value)}
                        placeholder="https://shopee.vn/..."
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
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

      {/* TAB: CỔNG THANH TOÁN & VẬN CHUYỂN */}
      {activeTab === "gateways" && (
        <div className="space-y-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm text-xs font-semibold text-black/85 animate-fadeIn">
          <div className="border-b border-black/5 pb-3">
            <h3 className="text-sm font-extrabold tracking-widest text-black uppercase">CỔNG THANH TOÁN & PHÍ VẬN CHUYỂN</h3>
            <p className="text-[10px] text-black/45 mt-1 leading-relaxed">
              Thiết lập tài khoản nhận tiền ngân hàng, số ví MoMo hiển thị cho khách và biểu phí ship động khi thanh toán.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cột trái: Cấu hình thanh toán */}
            <div className="space-y-5">
              {/* Ngân hàng */}
              <div className="border border-black/5 rounded-2xl p-5 bg-stone-50/50 space-y-3.5">
                <h4 className="text-[10px] font-black tracking-widest text-black/60 uppercase border-b border-black/5 pb-2">
                  🏦 TÀI KHOẢN NGÂN HÀNG (VIETQR)
                </h4>
                <div>
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">Mã ngân hàng (VietQR)</label>
                  <input
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    placeholder="Ví dụ: MB, VCB, ACB, Techcombank"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold uppercase focus:border-black/60 focus:outline-none"
                  />
                  <p className="text-[8px] text-black/35 mt-1">Sử dụng mã viết tắt chuẩn VietQR (ví dụ: MB, VCB, ACB, ICB, v.v.)</p>
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">Số tài khoản</label>
                  <input
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Nhập số tài khoản ngân hàng..."
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-mono font-bold focus:border-black/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">Họ tên chủ tài khoản</label>
                  <input
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="Ví dụ: DOAN QUOC THAI"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold uppercase focus:border-black/60 focus:outline-none"
                  />
                </div>
              </div>

              {/* MoMo */}
              <div className="border border-black/5 rounded-2xl p-5 bg-stone-50/50 space-y-3.5">
                <h4 className="text-[10px] font-black tracking-widest text-black/60 uppercase border-b border-black/5 pb-2">
                  📱 VÍ ĐIỆN TỬ MOMO
                </h4>
                <div>
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">Số điện thoại đăng ký MoMo</label>
                  <input
                    value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value)}
                    placeholder="Nhập số điện thoại ví MoMo..."
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-mono font-bold focus:border-black/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">Họ tên chủ ví MoMo</label>
                  <input
                    value={momoAccountName}
                    onChange={(e) => setMomoAccountName(e.target.value)}
                    placeholder="Ví dụ: DOAN QUOC THAI"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold uppercase focus:border-black/60 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Cột phải: Cấu hình vận chuyển */}
            <div className="space-y-5">
              <div className="border border-black/5 rounded-2xl p-5 bg-stone-50/50 space-y-3.5 h-full">
                <h4 className="text-[10px] font-black tracking-widest text-black/60 uppercase border-b border-black/5 pb-2">
                  🚚 BIỂU PHÍ VẬN CHUYỂN
                </h4>
                <div>
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">Phí vận chuyển thường (Standard) (VNĐ)</label>
                  <input
                    type="number"
                    value={shippingFeeStandard}
                    onChange={(e) => setShippingFeeStandard(e.target.value)}
                    placeholder="30000"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold focus:border-black/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">Phí vận chuyển hỏa tốc (Express) (VNĐ)</label>
                  <input
                    type="number"
                    value={shippingFeeExpress}
                    onChange={(e) => setShippingFeeExpress(e.target.value)}
                    placeholder="60000"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold focus:border-black/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">Hạn mức miễn phí vận chuyển (Standard) (VNĐ)</label>
                  <input
                    type="number"
                    value={shippingFreeThreshold}
                    onChange={(e) => setShippingFreeThreshold(e.target.value)}
                    placeholder="500000"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold focus:border-black/60 focus:outline-none"
                  />
                  <p className="text-[8px] text-black/35 mt-1">Đơn hàng đạt giá trị tối thiểu này sẽ được miễn phí giao hàng thường.</p>
                </div>

                <div className="rounded-xl border border-black/5 bg-white p-3.5 text-[9px] text-black/55 leading-normal space-y-1.5 mt-4">
                  <p className="font-bold text-black uppercase">💡 Hướng dẫn kiểm thử thực tế:</p>
                  <p>• Phí ship và các thông số tài khoản ngân hàng/momo sẽ tự động cập nhật đồng bộ trực tiếp lên Trang Thanh Toán (Checkout).</p>
                  <p>• Khách hàng có thể quét mã QR thanh toán nhanh bằng VietQR được sinh động tự động với đúng giá trị đơn hàng thực tế!</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-black/10 pt-5">
            <button
              onClick={handleSaveGateways}
              className="flex items-center gap-2 rounded-xl bg-black text-white hover:bg-red-700 px-6 h-11 text-xs font-bold tracking-widest uppercase transition-all shadow-md shadow-black/10"
            >
              <Save className="h-4 w-4" />
              LƯU CẤU HÌNH
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: TÙY BIẾN MẪU IN HÓA ĐƠN (INVOICE TEMPLATE CUSTOMIZER) */}
      {activeTab === "invoice" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cột trái (Nhập liệu) */}
          <div className="lg:col-span-6 space-y-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm text-xs font-semibold">
            <div>
              <h3 className="text-xs font-extrabold tracking-widest text-black/45 uppercase mb-4">Cấu Hình Mẫu In Hóa Đơn</h3>
              <p className="text-[10px] text-black/45 leading-relaxed mb-6 font-medium">
                Tùy chỉnh thông tin hiển thị trên phiếu giao hàng và hóa đơn thanh toán của MADMAD Studio khi in đơn.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Tiêu đề hóa đơn</label>
                  <input
                    value={printInvoiceTitle}
                    onChange={(e) => setPrintInvoiceTitle(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Slogan phụ / Manifesto</label>
                  <input
                    value={printInvoiceSubheader}
                    onChange={(e) => setPrintInvoiceSubheader(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Địa chỉ Showroom hiển thị</label>
                  <input
                    value={printInvoiceAddress}
                    onChange={(e) => setPrintInvoiceAddress(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Hotline CSKH hiển thị</label>
                  <input
                    value={printInvoicePhone}
                    onChange={(e) => setPrintInvoicePhone(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Lời chào chân hóa đơn (Slogan)</label>
                <input
                  value={printInvoiceFooterSlogan}
                  onChange={(e) => setPrintInvoiceFooterSlogan(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all"
                />
              </div>

              {/* Cấu hình Ngân hàng chuyển khoản quét VietQR */}
              <div className="border border-black/5 rounded-xl p-4 bg-stone-50/50 space-y-3">
                <h4 className="text-[10px] font-black tracking-widest text-black/60 uppercase border-b border-black/5 pb-1.5">
                  Cấu hình Cổng Quét VietQR Hóa Đơn
                </h4>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-black/50 mb-1">Mã Ngân hàng (VietQR)</label>
                    <input
                      value={printInvoiceBankId}
                      onChange={(e) => setPrintInvoiceBankId(e.target.value)}
                      placeholder="Ví dụ: MB, VCB, ACB"
                      className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase focus:border-black/60 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-black/50 mb-1">Số tài khoản</label>
                    <input
                      value={printInvoiceBankAccount}
                      onChange={(e) => setPrintInvoiceBankAccount(e.target.value)}
                      placeholder="0999999999"
                      className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[10px] font-mono font-bold focus:border-black/60 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-black/50 mb-1">Tên chủ tài khoản</label>
                    <input
                      value={printInvoiceAccountName}
                      onChange={(e) => setPrintInvoiceAccountName(e.target.value)}
                      placeholder="MADMAD STUDIO"
                      className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase focus:border-black/60 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Chính sách đổi trả & Ghi chú</label>
                <textarea
                  rows={3}
                  value={printInvoicePolicy}
                  onChange={(e) => setPrintInvoicePolicy(e.target.value)}
                  placeholder="Điền quy định đổi trả hàng..."
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all font-medium leading-relaxed resize-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-black/5">
              <button
                onClick={handleSaveInvoiceSettings}
                className="w-full rounded-xl bg-black px-6 py-3.5 text-xs font-bold tracking-widest uppercase text-white hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                <Save className="h-4.5 w-4.5" />
                LƯU THIẾT LẬP MẪU IN
              </button>
            </div>
          </div>

          {/* Cột phải (Live Preview mô phỏng chân thực hóa đơn giấy) */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="text-xs font-extrabold tracking-widest text-black/45 uppercase">Live Preview (Mô phỏng bản in)</h3>
            <div className="rounded-2xl border border-black/10 bg-stone-50 p-6 flex items-center justify-center min-h-[450px]">
              {/* Giả lập tờ giấy in hóa đơn */}
              <div className="w-full max-w-sm bg-white shadow-lg border border-black/5 p-6 space-y-4 font-mono text-[9px] text-black leading-relaxed relative overflow-hidden" style={{ minHeight: "400px" }}>
                {/* Dải rách giả lập hóa đơn */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-repeat-x" style={{ backgroundImage: "linear-gradient(45deg, transparent 33.333%, #f5f5f5 33.333%, #f5f5f5 66.667%, transparent 66.667%), linear-gradient(-45deg, transparent 33.333%, #f5f5f5 33.333%, #f5f5f5 66.667%, transparent 66.667%)", backgroundSize: "6px 4px" }} />
                
                {/* Shop Header */}
                <div className="text-center pb-3 border-b border-dashed border-black/20 space-y-1">
                  <h4 className="text-xs font-black font-sans uppercase">MADMAD STUDIO</h4>
                  <p className="text-[7px] text-black/50 font-sans">{printInvoiceSubheader}</p>
                  <p className="text-[8px] text-black/60">{printInvoiceAddress}</p>
                  <p className="text-[8px] text-black/60">{printInvoicePhone}</p>
                </div>

                {/* Title */}
                <div className="text-center space-y-0.5">
                  <h5 className="font-black uppercase tracking-wider text-[10px]">{printInvoiceTitle}</h5>
                  <p className="text-[7px] text-black/40">MÃ ĐƠN: MADMAD_#1002</p>
                </div>

                {/* Sample items table */}
                <table className="w-full border-collapse text-[8px] text-left">
                  <thead>
                    <tr className="border-b border-black font-bold font-sans">
                      <th className="pb-1">Sản phẩm</th>
                      <th className="pb-1 text-center">SL</th>
                      <th className="pb-1 text-right">T.Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black/5">
                      <td className="py-1.5 uppercase font-sans font-bold">NOIR DISTRESSED HOODIE</td>
                      <td className="py-1.5 text-center">1</td>
                      <td className="py-1.5 text-right font-bold">650.000₫</td>
                    </tr>
                    <tr className="border-b border-black/10">
                      <td className="py-1.5 uppercase font-sans font-bold">RAW EDGES CARGO SHORTS</td>
                      <td className="py-1.5 text-center">1</td>
                      <td className="py-1.5 text-right font-bold">420.000₫</td>
                    </tr>
                  </tbody>
                </table>

                {/* Total */}
                <div className="space-y-1 border-t border-black pt-2 font-sans font-bold text-right text-[9px]">
                  <div className="flex justify-between text-black/60 text-[8px]">
                    <span>Tạm tính:</span>
                    <span>1.070.000₫</span>
                  </div>
                  <div className="flex justify-between text-red-600 text-[8px]">
                    <span>VIP Member (👑 PLATINUM):</span>
                    <span>-53.500₫</span>
                  </div>
                  <div className="flex justify-between border-t border-black/10 pt-1 text-[10px] font-black text-black">
                    <span>TỔNG CỘNG:</span>
                    <span>1.016.500₫</span>
                  </div>
                </div>

                {/* Dynamic VietQR Preview Box */}
                <div className="flex items-center gap-2 border border-black/10 rounded-lg p-2 bg-stone-50 text-[8px] font-sans">
                  <div className="bg-white p-0.5 rounded border border-black/5 flex-shrink-0">
                    <img
                      src={`https://img.vietqr.io/image/${printInvoiceBankId}-${printInvoiceBankAccount}-compact.png?amount=1016500&addInfo=MADMAD%20DEMO1002&accountName=${encodeURIComponent(printInvoiceAccountName)}`}
                      alt="VietQR MADMAD"
                      className="h-8 w-8 object-contain"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold uppercase tracking-wider">CỔNG QUÉT THANH TOÁN ({printInvoiceBankId})</p>
                    <p className="text-[6px] text-black/60">STK: {printInvoiceBankAccount}</p>
                    <p className="text-[6px] text-black/60 uppercase">Tên: {printInvoiceAccountName}</p>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="text-center pt-3 border-t border-dashed border-black/20 space-y-1.5">
                  <p className="font-bold text-[8px] font-sans uppercase">{printInvoiceFooterSlogan}</p>
                  <p className="text-[7px] text-black/50 font-sans leading-normal text-justify">
                    {printInvoicePolicy || "* Chưa cấu hình chính sách đổi trả hàng..."}
                  </p>
                  <p className="text-[6px] text-black/30 tracking-widest pt-2">MADMAD STUDIO - NOIR STANDARD</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* TAB 4: SMTP GMAIL & FORM GỬI EMAIL THỦ CÔNG */}
      {activeTab === "smtp" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cột trái: Cấu hình SMTP Gmail */}
          <div className="lg:col-span-6 space-y-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm text-xs font-semibold">
            <div className="flex items-center gap-2 border-b border-black/5 pb-3">
              <Settings className="h-4.5 w-4.5 text-black/60" />
              <h3 className="text-xs font-extrabold tracking-widest text-black/75 uppercase">CẤU HÌNH GỬI EMAIL (SMTP)</h3>
            </div>
            
            <p className="text-[10px] text-black/45 leading-relaxed font-medium">
              Cấu hình SMTP gửi hóa đơn tự động và email quảng bá. Các thiết lập này sẽ lưu thẳng lên đám mây Neon DB Postgres.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Máy chủ SMTP (SMTP Host)</label>
                <input
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all font-mono"
                  placeholder="Ví dụ: smtp.gmail.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Cổng SMTP (SMTP Port)</label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all font-mono"
                  placeholder="Ví dụ: 587 hoặc 465"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Tên hiển thị người gửi (Sender Name)</label>
                <input
                  value={smtpSenderName}
                  onChange={(e) => setSmtpSenderName(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all"
                  placeholder="Ví dụ: MADMAD STUDIO"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Tài khoản Gmail gửi (SMTP User)</label>
                <div className="relative">
                  <input
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 pl-10 pr-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all font-mono"
                    placeholder="email@gmail.com"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/35" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Mật khẩu ứng dụng (SMTP App Password - 16 ký tự)</label>
                <div className="relative">
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 pl-10 pr-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all font-mono"
                    placeholder="•••• •••• •••• ••••"
                  />
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/35" />
                </div>
                <p className="mt-1.5 text-[9px] text-red-600 font-bold leading-normal">
                  ⚠️ Lưu ý: Đây là mật khẩu ứng dụng Gmail gồm 16 chữ cái được tạo từ trang quản lý tài khoản Google của bạn, không phải mật khẩu đăng nhập Gmail thường.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-black/5">
              <button
                onClick={handleSaveSmtpSettings}
                className="w-full rounded-xl bg-black px-6 py-3.5 text-xs font-bold tracking-widest uppercase text-white hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-black/10"
              >
                <Save className="h-4.5 w-4.5" />
                LƯU CẤU HÌNH SMTP
              </button>
            </div>
          </div>

          {/* Cột phải: Form Gửi Email Trực tiếp */}
          <div className="lg:col-span-6 space-y-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm text-xs font-semibold h-fit">
            <div className="flex items-center gap-2 border-b border-black/5 pb-3">
              <Send className="h-4.5 w-4.5 text-black/60" />
              <h3 className="text-xs font-extrabold tracking-widest text-black/75 uppercase">FORM GỬI GMAIL THỦ CÔNG</h3>
            </div>

            <p className="text-[10px] text-black/45 leading-relaxed font-medium">
              Bạn có thể viết thư trực tiếp và gửi tay tới bất kỳ hòm thư của khách hàng nào bằng cấu hình SMTP vừa lưu ở bên trái.
            </p>

            {testResult && (
              <div className={`p-3 border rounded-xl text-[10px] font-extrabold tracking-wide flex items-center gap-1.5 ${
                testResult.success
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${testResult.success ? "bg-green-600" : "bg-red-600 animate-ping"}`} />
                {testResult.message}
              </div>
            )}

            <form onSubmit={handleSendTestEmail} className="space-y-4 font-semibold text-xs">
              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Email người nhận</label>
                <input
                  type="email"
                  required
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  placeholder="khachhang@gmail.com"
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Tiêu đề email</label>
                <input
                  type="text"
                  required
                  value={testEmailSubject}
                  onChange={(e) => setTestEmailSubject(e.target.value)}
                  placeholder="[MADMAD STUDIO] Cảm ơn bạn đã ghé thăm showroom!"
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Nội dung email (Hỗ trợ xuống dòng)</label>
                <textarea
                  rows={6}
                  required
                  value={testEmailBody}
                  onChange={(e) => setTestEmailBody(e.target.value)}
                  placeholder="Nhập nội dung thư bạn muốn gửi tới khách hàng ở đây..."
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all font-medium leading-relaxed resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="w-full rounded-xl bg-black text-white hover:bg-red-700 disabled:bg-stone-300 h-11 text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 shadow-md shadow-black/10"
                >
                  {sendingTest ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang xử lý gửi thư...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      GỬI EMAIL NGAY
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Cấu hình Nội dung Email Mẫu gửi khách hàng tự động */}
          <div className="col-span-12 lg:col-span-12 space-y-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm text-xs font-semibold">
            <div className="flex items-center gap-2 border-b border-black/5 pb-3">
              <Mail className="h-4.5 w-4.5 text-black/60" />
              <h3 className="text-xs font-extrabold tracking-widest text-black/75 uppercase">MẪU EMAIL TỰ ĐỘNG GỬI KHÁCH HÀNG KHI ĐẶT HÀNG THÀNH CÔNG</h3>
            </div>

            <p className="text-[10px] text-black/45 leading-relaxed font-medium">
              Bạn có thể dễ dàng tùy biến tiêu đề và nội dung chào mừng trong email tự động gửi cho khách hàng. Hệ thống hỗ trợ định dạng HTML (để tạo chữ in đậm, xuống dòng, liên kết...).
            </p>

            {/* Token Guide */}
            <div className="p-4 bg-stone-50 border border-black/5 rounded-xl space-y-2">
              <h4 className="text-[9px] font-black tracking-wider text-black/75 uppercase">📌 CÁC TỪ KHÓA ĐỘNG (TOKENS) CÓ THỂ SỬ DỤNG:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] text-black/60">
                <div>
                  <span className="font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{"{{customerName}}"}</span>
                  <span className="ml-1.5 font-medium">: Tên khách hàng đặt mua</span>
                </div>
                <div>
                  <span className="font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{"{{orderNumber}}"}</span>
                  <span className="ml-1.5 font-medium">: Mã số đơn hàng tự động</span>
                </div>
                <div>
                  <span className="font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{"{{brandName}}"}</span>
                  <span className="ml-1.5 font-medium">: Tên thương hiệu shop</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Tiêu đề Email xác nhận</label>
                <input
                  type="text"
                  value={customerEmailSubject}
                  onChange={(e) => setCustomerEmailSubject(e.target.value)}
                  placeholder="Ví dụ: [{{brandName}}] ĐẶT HÀNG THÀNH CÔNG - ĐƠN HÀNG {{orderNumber}}"
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Nội dung Email chào mừng (Hỗ trợ tags HTML & xuống dòng)</label>
                <textarea
                  rows={6}
                  value={customerEmailTemplate}
                  onChange={(e) => setCustomerEmailTemplate(e.target.value)}
                  placeholder="Nhập mẫu tin nhắn chào mừng đặt hàng thành công..."
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none transition-all font-mono leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-black/5">
              <button
                onClick={handleSaveSmtpSettings}
                className="w-full rounded-xl bg-black px-6 py-3.5 text-xs font-bold tracking-widest uppercase text-white hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-black/10"
              >
                <Save className="h-4.5 w-4.5" />
                LƯU MẪU EMAIL KHÁCH HÀNG & SMTP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BACKUP DỮ LIỆU */}
      {activeTab === "backup" && (
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm">
          <div className="border-b border-black/5 bg-stone-50 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-2">
              <DownloadCloud className="h-6 w-6 text-red-600" />
              <h2 className="text-xl font-black uppercase tracking-tight text-black">SAO LƯU DỮ LIỆU TRÊN ĐÁM MÂY</h2>
            </div>
            <p className="text-sm text-black/60 font-medium">Tải xuống toàn bộ cơ sở dữ liệu Khách hàng và Lịch sử đơn hàng định dạng Excel/CSV để lưu trữ trên máy tính của bạn.</p>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-xs font-semibold leading-relaxed">
              <p>💡 <strong>Lời khuyên an toàn:</strong> Mặc dù hệ thống máy chủ Cloud của Neon/Vercel đã tự động sao lưu cấu trúc database mỗi ngày, bạn vẫn nên thực hiện tải xuống bản sao lưu vật lý này mỗi tuần 1 lần. Việc này đảm bảo bạn luôn giữ trong tay danh sách số điện thoại/email khách hàng mới nhất ngay cả khi mất quyền truy cập Cloud.</p>
            </div>
            
            <div className="border border-black/10 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-1">Gói Dữ liệu Khách hàng & Đơn hàng</h3>
                <p className="text-xs text-black/60 font-medium">Sẽ tải xuống 2 tệp: <code>MADMAD_Orders_Backup_...csv</code> và <code>MADMAD_VIPMembers_Backup_...csv</code></p>
              </div>
              <button
                onClick={handleExportBackup}
                className="w-full md:w-auto rounded-xl bg-black text-white hover:bg-red-700 px-6 h-12 text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-md shrink-0"
              >
                <DownloadCloud className="h-4 w-4" />
                XUẤT RA EXCEL / CSV NGAY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
