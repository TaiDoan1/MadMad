import { useEffect, useState } from "react";
import { Save, Upload, Plus, Trash2, Tag, ShieldCheck, Settings, Percent, Mail, Key, Send, DownloadCloud, QrCode, Ruler } from "lucide-react";
import { SizeGuideSettingsPanel } from "@/pages/admin/components/size-guide-settings-panel";
import { Link } from "react-router";

import { brandLogo } from "@/assets/images";
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";
import { readStoredCoupons, saveCoupons } from "@/features/promotions/services/coupon-service";
import type { Coupon } from "@/types/coupon";
import { API_URL, getAdminKey } from "@/config/api";
import { useToast } from "@/components/common/toast";

export function AdminSettingsPage() {
  const { showToast } = useToast();
  const { settings, updateSettings } = useStorefrontSettings();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<
    "branding" | "coupons" | "sizeguide" | "gateways" | "invoice" | "smtp" | "backup"
  >("branding");

  // Gateways & Shipping States
  const [bankId, setBankId] = useState(settings.bankId || "MB");
  const [bankAccount, setBankAccount] = useState(settings.bankAccount || "0999999999");
  const [bankAccountName, setBankAccountName] = useState(settings.bankAccountName || "MADMAD STUDIO");
  const [momoPhone, setMomoPhone] = useState(settings.momoPhone || "0999999999");
  const [momoAccountName, setMomoAccountName] = useState(settings.momoAccountName || "MADMAD STUDIO");
  const [shippingFeeStandard, setShippingFeeStandard] = useState(String(settings.shippingFeeStandard ?? 30000));
  const [shippingFeeExpress, setShippingFeeExpress] = useState(String(settings.shippingFeeExpress ?? 60000));
  const [shippingFreeThreshold, setShippingFreeThreshold] = useState(String(settings.shippingFreeThreshold ?? 500000));
  const [shippingExpressCities, setShippingExpressCities] = useState(settings.shippingExpressCities || "79,01");
  const [enableCod, setEnableCod] = useState(settings.enableCod ?? true);
  const [enableBank, setEnableBank] = useState(settings.enableBank ?? true);
  const [enableMomo, setEnableMomo] = useState(settings.enableMomo ?? true);
  const [enablePaypal, setEnablePaypal] = useState(settings.enablePaypal ?? true);
  const [orderAutoCancelHours, setOrderAutoCancelHours] = useState(String(settings.orderAutoCancelHours ?? 24));

  // International Currency & Calculator States
  const [currencyMode, setCurrencyMode] = useState<"auto" | "manual">(settings.currencyMode || "auto");
  const [exchangeRate, setExchangeRate] = useState<string>(String(settings.exchangeRate ?? 25000));
  const [intlConversionFeePercent, setIntlConversionFeePercent] = useState<string>(String(settings.intlConversionFeePercent ?? 3.5));
  const [intlShippingFee, setIntlShippingFee] = useState<string>(String(settings.intlShippingFee ?? 250000));
  const [intlMarkupPercent, setIntlMarkupPercent] = useState<string>(String(settings.intlMarkupPercent ?? 10));
  const [customCalculatorPrice, setCustomCalculatorPrice] = useState<string>("290000");

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
  const [newCouponExclusive, setNewCouponExclusive] = useState(false);
  const [newUsageLimit, setNewUsageLimit] = useState("");
  const [newApplyToSaleItems, setNewApplyToSaleItems] = useState(true);
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
    setShippingExpressCities(settings.shippingExpressCities || "79,01");
    setEnableCod(settings.enableCod ?? true);
    setEnableBank(settings.enableBank ?? true);
    setEnableMomo(settings.enableMomo ?? true);
    setEnablePaypal(settings.enablePaypal ?? true);
    setOrderAutoCancelHours(String(settings.orderAutoCancelHours ?? 24));
    setCurrencyMode(settings.currencyMode || "auto");
    setExchangeRate(String(settings.exchangeRate ?? 25000));
    setIntlConversionFeePercent(String(settings.intlConversionFeePercent ?? 3.5));
    setIntlShippingFee(String(settings.intlShippingFee ?? 250000));
    setIntlMarkupPercent(String(settings.intlMarkupPercent ?? 10));

    // Đọc danh sách coupon từ service
    const storedCoupons = readStoredCoupons();
    setCoupons(storedCoupons);

    // Đồng bộ từ server về (nếu có) để admin/khách cùng thấy 1 danh sách
    (async () => {
      try {
        const res = await fetch(`${API_URL}/settings`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data?.coupons)) {
          saveCoupons(data.coupons);
          setCoupons(readStoredCoupons());
        }
      } catch {
        // ignore
      }
    })();
  }, [settings]);

  const syncCouponsToServer = async (nextCoupons: Coupon[]) => {
    try {
      await fetch(`${API_URL}/settings`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-key": getAdminKey()
        },
        body: JSON.stringify({ coupons: nextCoupons }),
      });
    } catch {
      // ignore
    }
  };

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
    showToast("Đã lưu cài đặt nhận diện thương hiệu thành công!", "success");
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
    showToast("Đã lưu thiết lập mẫu in hóa đơn thành công!", "success");
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
      shippingExpressCities,
      enableCod,
      enableBank,
      enableMomo,
      enablePaypal,
      orderAutoCancelHours: Number(orderAutoCancelHours) || 24,
      currencyMode,
      exchangeRate: Number(exchangeRate) || 25000,
      intlConversionFeePercent: Number(intlConversionFeePercent) || 3.5,
      intlShippingFee: Number(intlShippingFee) || 250000,
      intlMarkupPercent: Number(intlMarkupPercent) || 10,
    });
    showToast("Đã lưu thiết lập Cổng Thanh Toán & Vận Chuyển thành công!", "success");
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
    showToast("Đã lưu cấu hình SMTP & Mẫu Email Khách hàng thành công!", "success");
  };

  // 📬 Gửi Email Thủ Công trực tiếp từ biểu mẫu (Admin Form)
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailTo || !testEmailSubject || !testEmailBody) {
      showToast("Vui lòng nhập đầy đủ các thông tin: Người nhận, Tiêu đề và Nội dung!", "warning");
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const response = await fetch(`${API_URL}/settings/send-test-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getAdminKey(),
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

    const limit = Number(newUsageLimit);
    const newCoupon: Coupon = { 
      code, 
      discountAmount: amount, 
      isExclusive: newCouponExclusive,
      usageLimit: limit > 0 ? limit : undefined,
      usageCount: 0,
      applyToSaleItems: newApplyToSaleItems
    };
    const updatedCoupons = [...coupons, newCoupon];
    
    setCoupons(updatedCoupons);
    saveCoupons(updatedCoupons); // Lưu đồng bộ xuống localStorage
    syncCouponsToServer(updatedCoupons);

    // Reset Form
    setNewCouponCode("");
    setNewDiscountAmount("");
    setNewUsageLimit("");
    setNewCouponExclusive(false);
    setNewApplyToSaleItems(true);
    showToast(`Đã kích hoạt mã giảm giá ${code} thành công!`, "success");
  };

  // Xóa mã giảm giá
  const handleDeleteCoupon = (code: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa mã giảm giá ${code} không?`)) {
      const updatedCoupons = coupons.filter((c) => c.code !== code);
      setCoupons(updatedCoupons);
      saveCoupons(updatedCoupons); // Lưu đồng bộ xuống localStorage
      syncCouponsToServer(updatedCoupons);
    }
  };

  // 💾 Backup Dữ liệu (Export CSV)
  const handleExportBackup = async () => {
    try {
      const ordersRes = await fetch(`${API_URL}/orders`, {
        headers: { "x-admin-key": getAdminKey() }
      });
      const orders = await ordersRes.json();
      
      const membersRes = await fetch(`${API_URL}/members`, {
        headers: { "x-admin-key": getAdminKey() }
      });
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

      showToast("Đã tải xuống thành công bản sao lưu Dữ liệu Đơn hàng và Thành viên VIP!", "success");
    } catch (error) {
      console.error(error);
      showToast("Lỗi khi tải bản sao lưu. Vui lòng kiểm tra lại kết nối mạng!", "error");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-black uppercase sm:text-2xl">CÀI ĐẶT HỆ THỐNG</h1>
          <p className="text-xs text-black/50">Quản lý nhận diện thương hiệu MADMAD và các chương trình khuyến mãi VIP</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/storefront" className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors hover:bg-stone-50">
            Storefront Settings
          </Link>
        </div>
      </div>

      {/* Tabs Sleek Navigation */}
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex min-w-max border-b border-black/10">
        <button
          onClick={() => setActiveTab("branding")}
          className={`shrink-0 px-4 py-3 text-xs font-extrabold tracking-widest uppercase border-b-2 transition-all md:px-6 ${
            activeTab === "branding"
              ? "border-black text-black"
              : "border-transparent text-black/40 hover:text-black"
          }`}
        >
          Nhận Diện Thương Hiệu
        </button>
        <button
          onClick={() => setActiveTab("coupons")}
          className={`shrink-0 px-4 py-3 text-xs font-extrabold tracking-widest uppercase border-b-2 transition-all md:px-6 ${
            activeTab === "coupons"
              ? "border-black text-black"
              : "border-transparent text-black/40 hover:text-black"
          }`}
        >
          Khuyến Mãi & Coupons ({coupons.length})
        </button>
        <button
          onClick={() => setActiveTab("sizeguide")}
          className={`shrink-0 px-4 py-3 text-xs font-extrabold tracking-widest uppercase border-b-2 transition-all md:px-6 ${
            activeTab === "sizeguide"
              ? "border-black text-black"
              : "border-transparent text-black/40 hover:text-black"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Ruler className="h-3.5 w-3.5" />
            Gợi Ý Size
          </span>
        </button>
        <button
          onClick={() => setActiveTab("gateways")}
          className={`shrink-0 px-4 py-3 text-xs font-extrabold tracking-widest uppercase border-b-2 transition-all md:px-6 ${
            activeTab === "gateways"
              ? "border-black text-black"
              : "border-transparent text-black/40 hover:text-black"
          }`}
        >
          Thanh Toán & Vận Chuyển
        </button>
        <button
          onClick={() => setActiveTab("invoice")}
          className={`shrink-0 px-4 py-3 text-xs font-extrabold tracking-widest uppercase border-b-2 transition-all md:px-6 ${
            activeTab === "invoice"
              ? "border-black text-black"
              : "border-transparent text-black/40 hover:text-black"
          }`}
        >
          Mẫu In Hóa Đơn
        </button>
        <button
          onClick={() => setActiveTab("smtp")}
          className={`shrink-0 px-4 py-3 text-xs font-extrabold tracking-widest uppercase border-b-2 transition-all md:px-6 ${
            activeTab === "smtp"
              ? "border-black text-black"
              : "border-transparent text-black/40 hover:text-black"
          }`}
        >
          SMTP & Gửi Email
        </button>
        <button
          onClick={() => setActiveTab("backup")}
          className={`shrink-0 px-4 py-3 text-xs font-extrabold tracking-widest uppercase border-b-2 transition-all md:px-6 ${
            activeTab === "backup"
              ? "border-red-600 text-red-600"
              : "border-transparent text-black/40 hover:text-black"
          }`}
        >
          Sao Lưu Dữ Liệu
        </button>
        </div>
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

              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">
                  Số lượng phát hành (Tùy chọn)
                </label>
                <input
                  type="number"
                  min={1}
                  value={newUsageLimit}
                  onChange={(e) => setNewUsageLimit(e.target.value)}
                  placeholder="VÍ DỤ: 100 (Bỏ trống nếu không giới hạn)..."
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 focus:bg-white focus:border-black/60 focus:outline-none focus:ring-0 transition-all font-bold"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCouponExclusive}
                    onChange={(e) => setNewCouponExclusive(e.target.checked)}
                    className="accent-black h-4 w-4"
                  />
                  <span className="text-[10px] font-extrabold tracking-wider uppercase text-black">Mã Đặc Quyền (Ẩn)</span>
                </label>
                <p className="text-[9px] text-black/40 mt-1 pl-6 normal-case">
                  Mã này sẽ không được gợi ý công khai trên web. Chỉ khách hàng có mã bí mật này mới dùng được.
                </p>
              </div>

              <div className="pt-2 border-t border-black/5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newApplyToSaleItems}
                    onChange={(e) => setNewApplyToSaleItems(e.target.checked)}
                    className="accent-black h-4 w-4"
                  />
                  <span className="text-[10px] font-extrabold tracking-wider uppercase text-black">ÁP DỤNG CHO SẢN PHẨM GIẢM GIÁ (SALE)</span>
                </label>
                <p className="text-[9px] text-black/40 mt-1 pl-6 normal-case">
                  Nếu tắt, mã này sẽ hoàn toàn bị chặn và không hoạt động nếu đơn hàng của khách chứa sản phẩm đang sale.
                </p>
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
                        <div className="flex gap-2 mt-1">
                          {coupon.isExclusive && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                              Đặc quyền (Ẩn)
                            </span>
                          )}
                          {coupon.usageLimit && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
                              Đã dùng: {coupon.usageCount || 0} / {coupon.usageLimit}
                            </span>
                          )}
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            coupon.applyToSaleItems !== false 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {coupon.applyToSaleItems !== false ? "Áp dụng cả hàng Sale" : "Chặn hàng Sale"}
                          </span>
                        </div>
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

      {activeTab === "sizeguide" && <SizeGuideSettingsPanel />}

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
                <div>
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">Mã Tỉnh/Thành hỗ trợ Hỏa Tốc (cách nhau bằng dấu phẩy)</label>
                  <input
                    type="text"
                    value={shippingExpressCities}
                    onChange={(e) => setShippingExpressCities(e.target.value)}
                    placeholder="Ví dụ: 79,01 (79: TP.HCM, 01: Hà Nội)"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-mono font-bold focus:border-black/60 focus:outline-none"
                  />
                  <p className="text-[8px] text-black/35 mt-1 leading-relaxed">
                    Khách hàng chọn đúng các Tỉnh/Thành này tại trang Thanh Toán mới hiện tùy chọn Ship Hỏa Tốc (Ví dụ: 79 là TP.HCM, 01 là Hà Nội, 48 là Đà Nẵng).
                  </p>
                </div>

                <div className="rounded-xl border border-black/5 bg-white p-3.5 text-[9px] text-black/55 leading-normal space-y-1.5 mt-4">
                  <p className="font-bold text-black uppercase">💡 Hướng dẫn kiểm thử thực tế:</p>
                  <p>• Phí ship và các thông số tài khoản ngân hàng/momo sẽ tự động cập nhật đồng bộ trực tiếp lên Trang Thanh Toán (Checkout).</p>
                  <p>• Khách hàng có thể quét mã QR thanh toán nhanh bằng VietQR được sinh động tự động với đúng giá trị đơn hàng thực tế!</p>
                </div>
              </div>

              {/* Tùy chọn Thanh toán & Tự động hủy */}
              <div className="border border-black/5 rounded-2xl p-5 bg-stone-50/50 space-y-3.5">
                <h4 className="text-[10px] font-black tracking-widest text-black/60 uppercase border-b border-black/5 pb-2">
                  ⚙️ TRẠNG THÁI THANH TOÁN & HỦY ĐƠN
                </h4>
                
                <div className="space-y-2">
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">Phương thức thanh toán khả dụng</label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={enableCod} onChange={(e) => setEnableCod(e.target.checked)} className="accent-black h-4 w-4" />
                    Thanh toán khi nhận hàng (COD)
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={enableBank} onChange={(e) => setEnableBank(e.target.checked)} className="accent-black h-4 w-4" />
                    Chuyển khoản ngân hàng (VietQR)
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={enableMomo} onChange={(e) => setEnableMomo(e.target.checked)} className="accent-black h-4 w-4" />
                    Ví điện tử MoMo
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={enablePaypal} onChange={(e) => setEnablePaypal(e.target.checked)} className="accent-black h-4 w-4" />
                    Ví PayPal (USD)
                  </label>
                </div>

                <div className="pt-2">
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">Thời gian tự động hủy đơn chưa thanh toán (Giờ)</label>
                  <input
                    type="number"
                    value={orderAutoCancelHours}
                    onChange={(e) => setOrderAutoCancelHours(e.target.value)}
                    placeholder="24"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold focus:border-black/60 focus:outline-none"
                  />
                  <p className="text-[8px] text-black/35 mt-1">Hệ thống sẽ tự động hủy đơn sau khoảng thời gian này nếu khách không chuyển khoản.</p>
                </div>
              </div>
            </div>

            {/* 🌐 CẤU HÌNH TIỀN TỆ QUỐC TẾ & BẢNG SO SÁNH BIÊN LỢI NHUẬN */}
            <div className="border border-black/5 rounded-2xl p-6 bg-stone-50/30 space-y-5 mt-6">
              <div className="border-b border-black/5 pb-2.5">
                <h4 className="text-[11px] font-black tracking-widest text-black uppercase flex items-center gap-2">
                  🌐 CẤU HÌNH TIỀN TỆ QUỐC TẾ & BIÊN LỢI NHUẬN (PAYPAL RATE CALCULATOR)
                </h4>
                <p className="text-[9px] text-black/45 mt-1 leading-relaxed">
                  Thiết lập tỷ giá quy đổi, phụ thu nâng giá quốc tế, và tính toán biên lợi nhuận thực tế sau các loại chi phí giao dịch của PayPal/Stripe.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Cấu hình Tỷ giá */}
                <div>
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">
                    Chế độ tỷ giá (Currency Mode)
                  </label>
                  <select
                    value={currencyMode}
                    onChange={(e) => {
                      const mode = e.target.value as "auto" | "manual";
                      setCurrencyMode(mode);
                      if (mode === "auto") {
                        setExchangeRate("26280");
                      }
                    }}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold focus:border-black/60 focus:outline-none"
                  >
                    <option value="auto">Tự động (Theo thế giới: 1 USD = 26.280₫)</option>
                    <option value="manual">Thủ công (Cố định theo ý bạn)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1 flex items-center justify-between">
                    <span>Tỷ giá quy đổi (1 USD = ? VNĐ)</span>
                    {currencyMode === "manual" && (
                      <button
                        type="button"
                        onClick={() => setExchangeRate("26280")}
                        className="text-[8px] font-black text-red-600 hover:text-black uppercase tracking-wider transition-colors"
                      >
                        [Lấy Tỷ Giá Tự Động]
                      </button>
                    )}
                  </label>
                  <input
                    type="number"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    disabled={currencyMode === "auto"}
                    placeholder="25000"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold disabled:bg-stone-100 disabled:text-stone-400 focus:border-black/60 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">
                    % Phụ thu nâng giá quốc tế (Markup)
                  </label>
                  <input
                    type="number"
                    value={intlMarkupPercent}
                    onChange={(e) => setIntlMarkupPercent(e.target.value)}
                    placeholder="10"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold focus:border-black/60 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">
                    % Phí chuyển đổi PayPal / Stripe
                  </label>
                  <input
                    type="number"
                    value={intlConversionFeePercent}
                    onChange={(e) => setIntlConversionFeePercent(e.target.value)}
                    placeholder="3.5"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold focus:border-black/60 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/50 mb-1">
                    Phí ship quốc tế dự phòng / đơn hàng (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={intlShippingFee}
                    onChange={(e) => setIntlShippingFee(e.target.value)}
                    placeholder="250000"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold focus:border-black/60 focus:outline-none"
                  />
                </div>
              </div>

              {/* LIVE COMPARISON CALCULATOR (Thực tế & Trực quan) */}
              <div className="border border-black/10 rounded-2xl bg-black p-5 text-white space-y-4">
                <h5 className="text-[10px] font-black tracking-widest uppercase border-b border-white/10 pb-2 flex items-center justify-between">
                  <span>📈 BẢNG TÍNH & SO SÁNH DOANH THU THỰC TẾ (LIVE COMMERCIAL CALCULATOR)</span>
                  <span className="text-[8px] bg-red-600 px-2 py-0.5 rounded tracking-wide text-white font-black">CHẠY TỰ ĐỘNG</span>
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[10px] leading-relaxed">
                  {/* Cột 1: Sản phẩm tự nhập tính toán */}
                  <div className="space-y-2 border-r border-white/10 pr-0 md:pr-6 last:border-0 last:pr-0">
                    <div className="flex justify-between font-extrabold text-xs pb-1 border-b border-white/10 text-stone-200 items-center">
                      <span>Tự tính giá tùy chọn</span>
                      <input
                        type="number"
                        step={10000}
                        value={customCalculatorPrice}
                        onChange={(e) => setCustomCalculatorPrice(e.target.value)}
                        placeholder="290000"
                        className="w-24 bg-white/15 border border-white/20 text-white rounded px-2 py-0.5 font-bold focus:outline-none focus:border-white/50 text-right text-[10px]"
                      />
                    </div>
                    {(() => {
                      const customPrice = Number(customCalculatorPrice) || 0;
                      const rate = Number(exchangeRate) || 25000;
                      const markup = Number(intlMarkupPercent) || 0;
                      const fee = Number(intlConversionFeePercent) || 0;
                      const ship = Number(intlShippingFee) || 0;

                      // Calculate live pricing
                      const rawUsd = customPrice / rate;
                      const baseUsdWithMarkup = rawUsd * (1 + markup / 100);
                      const finalUsd = baseUsdWithMarkup / (1 - fee / 100);
                      const roundedUsd = Math.round(finalUsd);

                      // Calculations
                      const totalRevenueVnd = roundedUsd * rate * (1 - fee / 100);
                      const netProfitVnd = totalRevenueVnd - ship;

                      return (
                        <div className="space-y-1.5 font-mono text-[9px] text-stone-300">
                          <div className="flex justify-between">
                            <span>Giá bán VN gốc:</span>
                            <span className="font-bold text-white">{customPrice.toLocaleString()}₫</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Tỷ giá quy đổi:</span>
                            <span>1 USD = {rate.toLocaleString()}₫</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Giá thực tế (Thế giới):</span>
                            <span>${rawUsd.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Giá sau phụ thu (+{markup}%):</span>
                            <span>${baseUsdWithMarkup.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Giá sau bù phí PayPal (-{fee}%):</span>
                            <span>${finalUsd.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-white/10 pt-1 text-white">
                            <span className="font-extrabold text-[10px] text-stone-200">Giá hiển thị (Làm tròn):</span>
                            <span className="font-black text-red-500 text-xs">${roundedUsd}.00</span>
                          </div>
                          <div className="flex justify-between border-t border-white/10 pt-1">
                            <span>Doanh thu quy đổi thực nhận:</span>
                            <span>{Math.round(totalRevenueVnd).toLocaleString()}₫</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Trừ phí ship nước ngoài dự phòng:</span>
                            <span>-{ship.toLocaleString()}₫</span>
                          </div>
                          <div className="flex justify-between border-t border-white/15 pt-1.5 text-xs">
                            <span className="font-extrabold text-stone-200">Lợi nhuận thực thu:</span>
                            <span className={`font-black ${netProfitVnd >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {Math.round(netProfitVnd).toLocaleString()}₫
                            </span>
                          </div>
                          <div className="text-[8px] text-stone-400 leading-normal mt-1 font-semibold">
                            {netProfitVnd >= 0 
                              ? `✓ Lợi nhuận gộp quốc tế cao hơn trong nước khi chưa tính ship: +${Math.round(totalRevenueVnd - customPrice).toLocaleString()}₫ (+${customPrice > 0 ? ((totalRevenueVnd / customPrice - 1) * 100).toFixed(1) : 0}%)`
                              : `⚠️ Phí ship nước ngoài cao hơn doanh số thực nhận sau chuyển đổi.`}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Cột 2: Sản phẩm giá trung bình */}
                  <div className="space-y-2 border-r border-white/10 pr-0 md:pr-6 last:border-0 last:pr-0 pl-0 md:pl-4">
                    <div className="flex justify-between font-extrabold text-xs pb-1 border-b border-white/10 text-stone-200">
                      <span>Mẫu áo thun thường (350.000₫)</span>
                      <span className="text-red-500 font-extrabold">Giá mẫu</span>
                    </div>
                    {(() => {
                      const rate = Number(exchangeRate) || 25000;
                      const markup = Number(intlMarkupPercent) || 0;
                      const fee = Number(intlConversionFeePercent) || 0;
                      const ship = Number(intlShippingFee) || 0;

                      // Calculate live pricing
                      const rawUsd = 350000 / rate;
                      const baseUsdWithMarkup = rawUsd * (1 + markup / 100);
                      const finalUsd = baseUsdWithMarkup / (1 - fee / 100);
                      const roundedUsd = Math.round(finalUsd);

                      // Calculations
                      const totalRevenueVnd = roundedUsd * rate * (1 - fee / 100);
                      const netProfitVnd = totalRevenueVnd - ship;

                      return (
                        <div className="space-y-1.5 font-mono text-[9px] text-stone-300">
                          <div className="flex justify-between">
                            <span>Giá bán VN gốc:</span>
                            <span className="font-bold text-white">350.000₫</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Tỷ giá quy đổi:</span>
                            <span>1 USD = {rate.toLocaleString()}₫</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Giá thực tế (Thế giới):</span>
                            <span>${rawUsd.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Giá sau phụ thu (+{markup}%):</span>
                            <span>${baseUsdWithMarkup.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Giá sau bù phí PayPal (-{fee}%):</span>
                            <span>${finalUsd.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-white/10 pt-1 text-white">
                            <span className="font-extrabold text-[10px] text-stone-200">Giá hiển thị (Làm tròn):</span>
                            <span className="font-black text-red-500 text-xs">${roundedUsd}.00</span>
                          </div>
                          <div className="flex justify-between border-t border-white/10 pt-1">
                            <span>Doanh thu quy đổi thực nhận:</span>
                            <span>{Math.round(totalRevenueVnd).toLocaleString()}₫</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Trừ phí ship nước ngoài dự phòng:</span>
                            <span>-{ship.toLocaleString()}₫</span>
                          </div>
                          <div className="flex justify-between border-t border-white/15 pt-1.5 text-xs">
                            <span className="font-extrabold text-stone-200">Lợi nhuận thực thu:</span>
                            <span className={`font-black ${netProfitVnd >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {Math.round(netProfitVnd).toLocaleString()}₫
                            </span>
                          </div>
                          <div className="text-[8px] text-stone-400 leading-normal mt-1 font-semibold">
                            {netProfitVnd >= 0 
                              ? `✓ Lợi nhuận gộp quốc tế cao hơn trong nước khi chưa tính ship: +${Math.round(totalRevenueVnd - 350000).toLocaleString()}₫ (+${((totalRevenueVnd / 350000 - 1) * 100).toFixed(1)}%)`
                              : `⚠️ Phí ship nước ngoài cao hơn doanh số thực nhận sau chuyển đổi.`}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Cột 3: Sản phẩm cao cấp 1M */}
                  <div className="space-y-2 border-r border-white/10 pr-0 md:pr-6 last:border-0 last:pr-0 pl-0 md:pl-4">
                    <div className="flex justify-between font-extrabold text-xs pb-1 border-b border-white/10 text-stone-200">
                      <span>Mẫu áo Hoodie cao cấp (1.000.000₫)</span>
                      <span className="text-red-500 font-extrabold">Giá mẫu</span>
                    </div>
                    {(() => {
                      const rate = Number(exchangeRate) || 25000;
                      const markup = Number(intlMarkupPercent) || 0;
                      const fee = Number(intlConversionFeePercent) || 0;
                      const ship = Number(intlShippingFee) || 0;

                      // Calculate live pricing
                      const rawUsd = 1000000 / rate;
                      const baseUsdWithMarkup = rawUsd * (1 + markup / 100);
                      const finalUsd = baseUsdWithMarkup / (1 - fee / 100);
                      const roundedUsd = Math.round(finalUsd);

                      // Calculations
                      const totalRevenueVnd = roundedUsd * rate * (1 - fee / 100);
                      const netProfitVnd = totalRevenueVnd - ship;

                      return (
                        <div className="space-y-1.5 font-mono text-[9px] text-stone-300">
                          <div className="flex justify-between">
                            <span>Giá bán VN gốc:</span>
                            <span className="font-bold text-white">1.000.000₫</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Tỷ giá quy đổi:</span>
                            <span>1 USD = {rate.toLocaleString()}₫</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Giá thực tế (Thế giới):</span>
                            <span>${rawUsd.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Giá sau phụ thu (+{markup}%):</span>
                            <span>${baseUsdWithMarkup.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Giá sau bù phí PayPal (-{fee}%):</span>
                            <span>${finalUsd.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-white/10 pt-1 text-white">
                            <span className="font-extrabold text-[10px] text-stone-200">Giá hiển thị (Làm tròn):</span>
                            <span className="font-black text-red-500 text-xs">${roundedUsd}.00</span>
                          </div>
                          <div className="flex justify-between border-t border-white/10 pt-1">
                            <span>Doanh thu quy đổi thực nhận:</span>
                            <span>{Math.round(totalRevenueVnd).toLocaleString()}₫</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Trừ phí ship nước ngoài dự phòng:</span>
                            <span>-{ship.toLocaleString()}₫</span>
                          </div>
                          <div className="flex justify-between border-t border-white/15 pt-1.5 text-xs">
                            <span className="font-extrabold text-stone-200">Lợi nhuận thực thu:</span>
                            <span className={`font-black ${netProfitVnd >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {Math.round(netProfitVnd).toLocaleString()}₫
                            </span>
                          </div>
                          <div className="text-[8px] text-stone-400 leading-normal mt-1 font-semibold">
                            {netProfitVnd >= 0 
                              ? `✓ Lợi nhuận gộp quốc tế cao hơn trong nước khi chưa tính ship: +${Math.round(totalRevenueVnd - 1000000).toLocaleString()}₫ (+${((totalRevenueVnd / 1000000 - 1) * 100).toFixed(1)}%)`
                              : `⚠️ Phí ship nước ngoài cao hơn doanh số thực nhận sau chuyển đổi.`}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
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
                Tùy chỉnh thông tin hiển thị trên phiếu giao hàng và hóa đơn của MADMAD Studio. Thiết kế đã được tối giản hóa dạng biên lai cao cấp.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Tiêu đề hóa đơn</label>
                  <input
                    value={printInvoiceTitle}
                    onChange={(e) => setPrintInvoiceTitle(e.target.value)}
                    className="w-full rounded-none border border-black/20 bg-stone-50/50 px-4 py-3 focus:bg-white focus:border-black focus:outline-none transition-all font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Slogan phụ / Manifesto</label>
                  <input
                    value={printInvoiceSubheader}
                    onChange={(e) => setPrintInvoiceSubheader(e.target.value)}
                    className="w-full rounded-none border border-black/20 bg-stone-50/50 px-4 py-3 focus:bg-white focus:border-black focus:outline-none transition-all font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Địa chỉ Showroom hiển thị</label>
                  <input
                    value={printInvoiceAddress}
                    onChange={(e) => setPrintInvoiceAddress(e.target.value)}
                    className="w-full rounded-none border border-black/20 bg-stone-50/50 px-4 py-3 focus:bg-white focus:border-black focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Hotline CSKH hiển thị</label>
                  <input
                    value={printInvoicePhone}
                    onChange={(e) => setPrintInvoicePhone(e.target.value)}
                    className="w-full rounded-none border border-black/20 bg-stone-50/50 px-4 py-3 focus:bg-white focus:border-black focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Lời chào chân hóa đơn (Slogan)</label>
                <input
                  value={printInvoiceFooterSlogan}
                  onChange={(e) => setPrintInvoiceFooterSlogan(e.target.value)}
                  className="w-full rounded-none border border-black/20 bg-stone-50/50 px-4 py-3 focus:bg-white focus:border-black focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/50 mb-1.5">Chính sách đổi trả & Ghi chú</label>
                <textarea
                  rows={4}
                  value={printInvoicePolicy}
                  onChange={(e) => setPrintInvoicePolicy(e.target.value)}
                  placeholder="Điền quy định đổi trả hàng..."
                  className="w-full rounded-none border border-black/20 bg-stone-50/50 px-4 py-3 focus:bg-white focus:border-black focus:outline-none transition-all font-medium leading-relaxed resize-none"
                />
              </div>


            </div>

            <div className="pt-4 border-t border-black/10">
              <button
                onClick={handleSaveInvoiceSettings}
                className="w-full rounded-none bg-black px-6 py-4 text-xs font-black tracking-widest uppercase text-white hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 hover:tracking-[0.2em]"
              >
                <Save className="h-4.5 w-4.5" />
                LƯU THIẾT LẬP MẪU IN
              </button>
            </div>
          </div>

          {/* Cột phải (Live Preview mô phỏng chân thực hóa đơn giấy) */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="text-xs font-extrabold tracking-widest text-black/45 uppercase">Live Preview (Khổ giấy A6)</h3>
            <div className="rounded-2xl border border-black/10 bg-[#e8e8e5] p-8 flex items-center justify-center min-h-[500px] overflow-hidden">
              {/* Giả lập tờ giấy in hóa đơn dạng A6 */}
              <div className="w-full max-w-[420px] bg-white shadow-2xl p-6 text-black font-mono scale-[0.85] origin-center" style={{ fontSize: "9px", lineHeight: "1.4" }}>
                
                {/* Header */}
                <div className="text-center space-y-1 mb-4 pb-4 border-b-2 border-dashed border-black">
                  <div className="flex items-center justify-between">
                    <img src={brandLogo} alt="MADMAD Studio" className="h-8 w-auto" />
                    <div className="text-right font-mono">
                      <h1 className="text-sm font-black tracking-widest font-sans">MADMAD STUDIO</h1>
                      <p className="text-[7px] uppercase tracking-wider text-black/60 font-sans">{printInvoiceSubheader}</p>
                      <p className="text-[7px] text-black/60">{printInvoiceAddress}</p>
                      <p className="text-[7px] text-black/60">{printInvoicePhone}</p>
                    </div>
                  </div>
                </div>

                {/* Tiêu đề chính */}
                <div className="text-center space-y-0.5 mb-4">
                  <h2 className="text-xs font-black tracking-widest uppercase">{printInvoiceTitle}</h2>
                  <p className="text-[10px] font-mono font-bold tracking-wider">M-1002</p>
                  <p className="text-[7px] text-black/50">Ngày in: 12/05/2026 - 15:30:00</p>
                </div>

                {/* Thông tin 2 cột */}
                <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-black text-[8px]">
                  <div>
                    <h3 className="font-black border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider text-[8px]">Thông tin người nhận</h3>
                    <div className="space-y-0.5">
                      <p>Họ tên: <span className="font-bold uppercase">NGUYỄN VĂN A</span></p>
                      <p>Điện thoại: <span className="font-bold">0909123456</span></p>
                      <p>Phương thức: <span className="uppercase font-bold">CHUYỂN KHOẢN (BANKING)</span></p>
                      <p>Vận chuyển: <span className="font-bold uppercase">HỎA TỐC (2H)</span></p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-black border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider text-[8px]">Địa chỉ giao hàng</h3>
                    <div className="space-y-0.5 leading-normal">
                      <p>254 Nguyễn Trãi</p>
                      <p>Phường 3, Quận 5</p>
                      <p>TP. Hồ Chí Minh</p>
                    </div>
                  </div>
                </div>

                {/* Bảng sản phẩm */}
                <table className="w-full text-left text-[8px] border-collapse mb-4 font-mono">
                  <thead>
                    <tr className="border-b-2 border-black font-black uppercase text-black font-sans">
                      <th className="py-1">Sản phẩm</th>
                      <th className="py-1 text-center">SL</th>
                      <th className="py-1 text-right">Đơn giá</th>
                      <th className="py-1 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black/10">
                      <td className="py-1.5 uppercase font-bold font-sans">Noir Distressed Hoodie<br/><span className="text-[7px] font-normal text-black/60 font-mono">Size: L | Màu: Đen</span></td>
                      <td className="py-1.5 text-center">1</td>
                      <td className="py-1.5 text-right">650.000₫</td>
                      <td className="py-1.5 text-right font-bold">650.000₫</td>
                    </tr>
                    <tr className="border-b border-black/10">
                      <td className="py-1.5 uppercase font-bold font-sans">Raw Edges Cargo Shorts<br/><span className="text-[7px] font-normal text-black/60 font-mono">Size: M | Màu: Stone</span></td>
                      <td className="py-1.5 text-center">1</td>
                      <td className="py-1.5 text-right">420.000₫</td>
                      <td className="py-1.5 text-right font-bold">420.000₫</td>
                    </tr>
                  </tbody>
                </table>

                {/* Tổng kết chi phí */}
                <div className="mb-4 pb-4 border-b border-black font-mono">
                  <div className="w-full space-y-1 font-sans font-semibold text-[8px]">
                    <div className="flex justify-between text-black/70">
                      <span>Tạm tính:</span>
                      <span className="font-mono">1.070.000₫</span>
                    </div>
                    <div className="flex justify-between font-bold text-red-600">
                      <span>Giảm giá:</span>
                      <span className="font-mono">-53.500₫</span>
                    </div>
                    <div className="flex justify-between text-black/70">
                      <span>Phí giao hàng:</span>
                      <span className="font-mono">+0₫</span>
                    </div>
                    <div className="flex justify-between font-black text-[9px] border-t border-black pt-1 mt-1">
                      <span>TỔNG TIỀN:</span>
                      <span className="font-mono">1.016.500₫</span>
                    </div>
                  </div>
                </div>

                {/* Slogan */}
                <div className="text-center space-y-1 mt-4">
                  <p className="font-black uppercase tracking-widest text-[8px] font-sans">{printInvoiceFooterSlogan}</p>
                  <p className="text-black/50 text-[7px] leading-relaxed max-w-[90%] mx-auto font-sans">
                    {printInvoicePolicy}
                  </p>
                  <div className="pt-1 text-black/25 text-[6px] font-mono tracking-widest">
                    MADMAD STUDIO - NOIR NO DESIGN STANDARD
                  </div>
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
