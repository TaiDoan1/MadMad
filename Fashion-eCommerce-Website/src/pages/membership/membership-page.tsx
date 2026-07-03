import { useState, useEffect } from "react";
import { useMembership } from "@/features/membership/context/membership-context";
import { Sparkles, Award, Receipt, LogOut, ArrowRight, UserCheck, ShieldCheck, Lock, XCircle, MessageCircle, Edit2, CheckCircle2, User, Phone, Mail } from "lucide-react";
import { useTransitionTo } from "@/components/common/page-transition";
import { API_URL, GOOGLE_CLIENT_ID } from "@/config/api";
import { useLanguage } from "@/features/settings/context/language-context";

export function MembershipPage() {
  const { currentMember, registerMember, loginMember, loginWithGoogle, updateMemberProfile, logoutMember, tierConfigs } = useMembership();
  const { formatPrice, t } = useLanguage();
  const navigate = useTransitionTo();

  const [isRegister, setIsRegister] = useState(false);
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Realtime Orders loaded from neon backend matching logged-in member's Gmail
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Profile Edit states
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");

  // Sync profile editing fields when member is loaded/updates
  useEffect(() => {
    if (currentMember) {
      setProfileName(currentMember.fullName);
      setProfilePhone(currentMember.phone || "");
    }
  }, [currentMember]);

  // Load Google Identity Services SDK dynamically
  useEffect(() => {
    if (currentMember) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID, // Google Client ID
          callback: handleGoogleResponse,
        });

        // Render Google Sign-in button inside our container
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn-container"),
          {
            theme: "outline",
            size: "large",
            width: 320,
            text: "signin_with",
            shape: "rectangular"
          }
        );
      }
    };

    return () => {
      // Clean up script on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [currentMember]);

  // Fetch Member's Realtime Orders List from Postgres DB
  useEffect(() => {
    if (currentMember) {
      setLoadingOrders(true);
      fetch(`${API_URL}/auth/my-orders`, {
        headers: {
          "x-member-email": currentMember.email
        }
      })
        .then(res => {
          if (!res.ok) throw new Error("API error");
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            setMyOrders(data);
          }
        })
        .catch(() => { /* ignore fetch errors silently */ })
        .finally(() => setLoadingOrders(false));
    }
  }, [currentMember]);

  // Handle Google OAuth Sign-In callback token
  const handleGoogleResponse = async (response: any) => {
    setError("");
    setMessage("");
    try {
      const res = await loginWithGoogle(response.credential);
      if (res.success) {
        setMessage(t("Đăng nhập tài khoản Google thành công!", "Google login successful!"));
      } else {
        setError(res.error || t("Không thể đồng bộ tài khoản Google!", "Failed to synchronize Google account!"));
      }
    } catch (err) {
      setError(t("Không kết nối được dịch vụ Google OAuth!", "Could not connect to Google OAuth service!"));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!phoneOrEmail || !password) {
      setError(t("Vui lòng nhập đầy đủ thông tin Email/SĐT và Mật khẩu!", "Please fill in Email/Phone and Password!"));
      return;
    }
    const res = await loginMember(phoneOrEmail, password);
    if (!res.success) {
      setError(res.error || "");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!fullName || !email || !phone || !password) {
      setError(t("Vui lòng nhập đầy đủ thông tin và thiết lập Mật khẩu!", "Please enter full details and establish a Password!"));
      return;
    }

    if (password.length < 6) {
      setError(t("Mật khẩu bảo mật phải có ít nhất 6 ký tự!", "Security password must be at least 6 characters long!"));
      return;
    }

    const res = await registerMember(fullName, email, phone, password);
    if (res.success) {
      setMessage(t("Chúc mừng! Đăng ký tài khoản VIP MADMAD thành công!", "Congratulations! MADMAD VIP account registered successfully!"));
    } else {
      setError(res.error || "");
    }
  };

  // Profile Edit Submit handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!profileName.trim()) {
      setError(t("Họ tên không được để trống!", "Full name cannot be blank!"));
      return;
    }
    const res = await updateMemberProfile(profileName, profilePhone);
    if (res.success) {
      setMessage(t("Cập nhật thông tin thành viên thành công!", "Member profile updated successfully!"));
      setEditingProfile(false);
    } else {
      setError(res.error || t("Không thể cập nhật thông tin!", "Failed to update profile info!"));
    }
  };

  // Perform order cancellation
  const handleCancelOrder = (orderId: number) => {
    if (window.confirm(t("Bạn có chắc chắn muốn hủy đơn hàng này không? Hành động này không thể hoàn tác!", "Are you sure you want to cancel this order? This action cannot be undone!"))) {
      fetch(`${API_URL}/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })
        .then(res => {
          if (res.ok) {
            setMessage(t("Đã gửi yêu cầu hủy đơn hàng thành công!", "Cancellation request submitted successfully!"));
            // Refresh order history list in-place
            setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "cancelled" } : o));
          } else {
            setError(t("Gặp sự cố khi gửi yêu cầu hủy đơn hàng.", "Failed to submit cancellation request."));
          }
        })
        .catch(() => setError(t("Lỗi kết nối máy chủ khi hủy đơn.", "Server connection error.")));
    }
  };

  // Format Card Hologram Color based on Membership Tier
  const getCardColorClass = (tier: string) => {
    switch (tier) {
      case "PLATINUM":
        return "bg-gradient-to-br from-zinc-800 via-zinc-950 to-black text-white border border-zinc-700 shadow-zinc-800/40";
      case "GOLD":
        return "bg-gradient-to-br from-amber-600 via-amber-950 to-neutral-950 text-amber-100 border border-amber-800 shadow-amber-800/30";
      case "SILVER":
        return "bg-gradient-to-br from-slate-400 via-slate-800 to-neutral-900 text-slate-100 border border-slate-700 shadow-slate-700/30";
      default:
        return "bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-white border border-neutral-800 shadow-black/60";
    }
  };

  if (currentMember) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header thành viên */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-black/10 pb-8 mb-12">
          <div>
            <h1 className="font-bold text-3xl tracking-tight text-black mb-2 uppercase">MADMAD CLUB</h1>
            <p className="text-black/50 text-sm">{t("Chào mừng thành viên danh giá trở lại", "Welcome back, honored member")}</p>
          </div>
          <button
            onClick={logoutMember}
            className="flex items-center justify-center gap-2 border border-black/15 hover:border-red-600 hover:text-red-600 px-5 py-2.5 text-xs font-bold tracking-widest uppercase transition-all rounded-sm"
          >
            <LogOut className="h-4 w-4" />
            {t("Đăng xuất", "Log Out")}
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 text-xs font-medium rounded-lg">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* CỘT 1: THẺ THÀNH VIÊN + ĐIỂM + CẬP NHẬT HỒ SƠ */}
          <div className="lg:col-span-1 space-y-8">
            {/* MADMAD BLACK CARD */}
            <div
              className={`relative rounded-2xl p-6 h-56 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-3xl ${getCardColorClass(
                currentMember.tier
              )}`}
            >
              {/* Card Hologram Line */}
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-red-600/30 via-white/10 to-red-600/30 blur-[2px]" />

              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] tracking-[0.2em] font-bold opacity-60">MADMAD CLUB</p>
                  <p className="font-bold text-xs tracking-widest mt-1">{t("BLACK CARD EDITION", "BLACK CARD EDITION")}</p>
                </div>
                <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-extrabold tracking-widest border border-white/10 uppercase">
                  {currentMember.tier}
                </div>
              </div>

              <div>
                <p className="font-mono text-xl tracking-[0.25em] font-medium opacity-90">
                  {currentMember.memberCardId || `MM-${String(currentMember.id).padStart(6, "0")}`}
                </p>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[8px] tracking-[0.15em] opacity-40 uppercase">{t("Chủ thẻ", "Card Holder")}</p>
                  <p className="font-bold text-sm tracking-wider uppercase mt-0.5">{currentMember.fullName}</p>
                </div>
                {currentMember.avatarUrl ? (
                  <img src={currentMember.avatarUrl} alt="Avatar" className="h-10 w-10 rounded-full border-2 border-white/20 object-cover" />
                ) : (
                  <div className="text-right">
                    <p className="text-[8px] tracking-[0.15em] opacity-40 uppercase">{t("Gia nhập", "Joined")}</p>
                    <p className="font-medium text-xs opacity-80 mt-0.5 font-mono">
                      {new Date(currentMember.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* BOX ĐIỂM */}
            <div className="border border-black/10 rounded-xl p-6 bg-stone-50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold tracking-wider text-black/50 uppercase">{t("ĐIỂM TÍCH LŨY", "LOYALTY POINTS")}</span>
                <Sparkles className="h-5 w-5 text-red-600 animate-pulse" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-black">{currentMember.points}</span>
                <span className="text-xs font-bold text-black/60">{t("ĐIỂM", "POINTS")}</span>
              </div>
              {(() => {
                const currentTierConfig = tierConfigs.find((c) => c.tier === currentMember.tier);
                const cashbackPercent = currentTierConfig ? currentTierConfig.discountPercent : 2;
                return (
                  <p className="text-[11px] text-black/40 mt-2">
                    {t("* 1 điểm tương đương 10.000₫ chi tiêu thực tế. Bạn đang hưởng đặc quyền giảm giá trực tiếp", "* 1 point equals 10,000₫ spent. You enjoy a direct discount of")} {cashbackPercent}% {t("cho mọi đơn hàng tiếp theo!", "on all subsequent orders!")}
                  </p>
                );
              })()}
            </div>

            {/* BOX CHỈNH SỬA THÔNG TIN CÁ NHÂN */}
            <div className="border border-black/10 rounded-xl p-6 bg-white shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-black/5 pb-2">
                <span className="text-xs font-bold tracking-wider text-black/80 uppercase flex items-center gap-1.5">
                  <User className="h-4 w-4 text-black/60" />
                  {t("HỒ SƠ THÀNH VIÊN", "MEMBER PROFILE")}
                </span>
                <button
                  onClick={() => setEditingProfile(!editingProfile)}
                  className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition-all"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  {editingProfile ? t("Hủy bỏ", "Cancel") : t("Chỉnh sửa", "Edit")}
                </button>
              </div>

              {editingProfile ? (
                // FORM CHỈNH SỬA
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/60 mb-1">
                      {t("Họ và Tên", "Full Name")}
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder={t("Nhập họ và tên mới...", "Enter new full name...")}
                      className="w-full rounded-lg border border-black/10 bg-stone-50 px-3 py-2 text-xs placeholder:text-black/30 focus:border-black/60 focus:bg-white focus:outline-none transition-all uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/60 mb-1">
                      {t("Số điện thoại", "Phone Number")}
                    </label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder={t("Nhập số điện thoại liên hệ...", "Enter contact phone number...")}
                      className="w-full rounded-lg border border-black/10 bg-stone-50 px-3 py-2 text-xs placeholder:text-black/30 focus:border-black/60 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-black text-white hover:bg-red-700 py-2.5 text-xs font-bold tracking-widest uppercase transition-all rounded-lg"
                  >
                    {t("Lưu thông tin", "Save Profile")}
                  </button>
                </form>
              ) : (
                // HIỂN THỊ CHI TIẾT
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between text-black/60">
                    <span className="flex items-center gap-1.5 font-medium">
                      <User className="h-4 w-4 opacity-50" />
                      {t("Tên thành viên:", "Full Name:")}
                    </span>
                    <span className="font-extrabold text-black uppercase">{currentMember.fullName}</span>
                  </div>

                  <div className="flex items-center justify-between text-black/60">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Mail className="h-4 w-4 opacity-50" />
                      {t("Địa chỉ Gmail:", "Gmail Address:")}
                    </span>
                    <span className="font-semibold text-black">{currentMember.email}</span>
                  </div>

                  <div className="flex items-center justify-between text-black/60">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Phone className="h-4 w-4 opacity-50" />
                      {t("Số điện thoại:", "Phone Number:")}
                    </span>
                    <span className="font-semibold text-black">{currentMember.phone || t("Chưa cập nhật", "Not updated")}</span>
                  </div>

                  {/* Cảnh báo nếu chưa có sđt */}
                  {!currentMember.phone && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px] leading-relaxed">
                      💡 {t("Mẹo: Hãy bấm Chỉnh sửa để bổ sung Số điện thoại liên lạc! Điều này giúp bạn tự động tích lũy điểm khi mua hàng.", "Tip: Click Edit to add your contact phone number! This helps you automatically earn points upon purchase.")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CỘT 2 & 3: LỊCH SỬ ĐƠN HÀNG (REALTIME TRỰC TIẾP) & ĐẶC QUYỀN VIP */}
          <div className="lg:col-span-2 space-y-12">
            {/* Lịch sử mua hàng */}
            <div>
              <h2 className="text-lg font-bold tracking-wider uppercase mb-6 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-black/70" />
                {t("LỊCH SỬ ĐƠN HÀNG", "ORDER HISTORY")} ({myOrders.length})
              </h2>

              {loadingOrders ? (
                <div className="border border-black/10 rounded-xl p-12 text-center bg-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
                  <p className="text-xs text-black/50">{t("Đang quét tìm đơn hàng trên đám mây...", "Scanning orders in the cloud...")}</p>
                </div>
              ) : myOrders.length === 0 ? (
                <div className="border border-dashed border-black/15 rounded-xl p-8 text-center bg-white">
                  <p className="text-sm text-black/40 mb-4">{t("Gmail không tồn tại hoặc chưa từng phát sinh mua hàng bằng Gmail này:", "Gmail does not exist or has never been used for any purchase:")} <strong>{currentMember.email}</strong>.</p>
                  <button
                    onClick={() => navigate("/shop")}
                    className="inline-flex items-center gap-2 bg-black text-white hover:bg-red-700 text-xs font-bold tracking-widest uppercase px-6 py-3 transition-all rounded-sm"
                  >
                    {t("Mua sắm ngay", "Shop Now")}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="border border-black/10 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-black/10 text-[10px] font-extrabold tracking-wider text-black/60 uppercase">
                          <th className="p-4">{t("Mã Đơn", "Order ID")}</th>
                          <th className="p-4">{t("Ngày mua", "Date")}</th>
                          <th className="p-4">{t("Trạng thái", "Status")}</th>
                          <th className="p-4 text-right">{t("Tổng tiền", "Total")}</th>
                          <th className="p-4 text-center">{t("Thao tác", "Action")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 text-xs">
                        {myOrders.map((order) => {
                          const createdTime = new Date(order.createdAt).getTime();
                          const diffMs = Date.now() - createdTime;
                          const isWithin5Min = diffMs >= 0 && diffMs <= 5 * 60 * 1000;
                          const isCancelled = order.status === "cancelled";

                          return (
                            <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                              <td className="p-4 font-mono font-bold text-black">{order.orderNumber}</td>
                              <td className="p-4 text-black/60 font-mono">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-4">
                                <span
                                  className={`inline-block px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded-full ${
                                    order.status === "completed"
                                      ? "bg-green-50 text-green-700 border border-green-200"
                                      : order.status === "cancelled"
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                  }`}
                                >
                                  {order.status === "completed"
                                    ? t("Thành công", "Success")
                                    : order.status === "cancelled"
                                    ? t("Đã hủy", "Cancelled")
                                    : t("Đang xử lý", "Processing")}
                                </span>
                              </td>
                              <td className="p-4 text-right font-bold text-black font-mono">
                                {formatPrice(order.total)}
                              </td>
                              <td className="p-4 text-center">
                                {isCancelled ? (
                                  <span className="text-[10px] font-bold text-stone-400 uppercase">{t("Đã hủy", "Cancelled")}</span>
                                ) : isWithin5Min ? (
                                  <button
                                    onClick={() => handleCancelOrder(order.id)}
                                    className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-extrabold tracking-wider uppercase px-3 py-1.5 rounded-md transition-all shadow-sm"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    {t("Hủy Đơn", "Cancel")}
                                  </button>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <a
                                      href="https://facebook.com"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={t("Liên hệ Facebook để hủy đơn", "Contact Facebook to cancel order")}
                                      className="text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                    </a>
                                    <span className="text-[9px] text-black/35 font-bold uppercase">{t("CSKH", "Support")}</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Quyền lợi VIP */}
            <div>
              <h2 className="text-sm font-black tracking-widest uppercase mb-6 flex items-center gap-2 text-black/60">
                <Award className="h-4.5 w-4.5 text-black/70" />
                {t("ĐẶC QUYỀN MA TRẬN THÀNH VIÊN VIP", "VIP MEMBER PRIVILEGE MATRIX")}
              </h2>
              <div className="border border-black/10 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="bg-stone-50 border-b border-black/10 px-6 py-4">
                  <h3 className="font-extrabold text-[10px] tracking-wider uppercase text-black">{t("Bảng đặc quyền & chiết khấu thành viên active", "Active membership perks & discount table")}</h3>
                </div>
                <div className="divide-y divide-black/5">
                  {tierConfigs.map((config) => (
                    <div key={config.tier} className="px-6 py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-colors hover:bg-stone-50/40">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border ${
                          config.tier === "PLATINUM" ? "bg-zinc-950 text-zinc-100 border-zinc-800" :
                          config.tier === "GOLD" ? "bg-amber-600 text-amber-50 border-amber-500" :
                          config.tier === "SILVER" ? "bg-slate-400 text-slate-900 border-slate-300" :
                          "bg-amber-900/10 text-amber-900 border-amber-900/20"
                        }`}>
                          {config.tier}
                        </span>
                        <span className="text-black/40 font-bold uppercase tracking-wider text-[10px]">{t("Từ", "From")} {config.minPoints.toLocaleString()} {t("điểm", "points")}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-6 sm:text-right">
                        <span className="font-extrabold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">
                          {t("GIẢM", "GET")} {config.discountPercent}% {t("MỌI HÓA ĐƠN", "OFF ALL INVOICES")}
                        </span>
                        <span className="text-black/60 font-bold text-[11px] uppercase tracking-wide">
                          🎁 {config.gifts || t("Quà tặng thương hiệu", "Brand Gift")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CHƯA ĐĂNG NHẬP: HIỂN THỊ FORM SPLIT-SCREEN & ĐĂNG NHẬP GOOGLE
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 min-h-[80vh] flex items-center">
      <div className="w-full border border-black/10 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-2xl">
        {/* BÊN TRÁI: Editorial Poster */}
        <div className="hidden lg:block lg:col-span-6 bg-black relative min-h-[600px] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80"
            alt="MADMAD Editorial"
            className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute bottom-12 left-12 right-12 text-white z-10">
            <p className="text-[10px] tracking-[0.3em] font-extrabold uppercase text-red-600 mb-2">{t("JOIN THE CLUB", "JOIN THE CLUB")}</p>
            <h2 className="font-black text-3xl tracking-wider uppercase mb-4 leading-none">{t("MADMAD MEMBERSHIP", "MADMAD MEMBERSHIP")}</h2>
            <p className="text-white/60 text-xs leading-relaxed max-w-sm">
              {t("Trở thành thành viên của MADMAD để mở khóa các đặc quyền cao cấp, giảm giá tích điểm 5% và nhận quyền ưu tiên đặt hàng sớm.", "Become a MADMAD member to unlock high-tier privileges, 5% point discounts, and receive early access privileges.")}
            </p>
          </div>
        </div>

        {/* BÊN PHẢI: LOGIN/REGISTER FORM & GOOGLE SIGN IN */}
        <div className="lg:col-span-6 px-8 py-16 sm:px-12 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            {/* Header Form */}
            <div className="mb-6">
              <h2 className="font-extrabold text-2xl tracking-tight text-black uppercase mb-1.5">
                {isRegister ? t("ĐĂNG KÝ THÀNH VIÊN", "REGISTER MEMBERSHIP") : t("MADMAD MEMBER", "MADMAD MEMBER")}
              </h2>
              <p className="text-xs text-black/50">
                {isRegister
                  ? t("Điền thông tin bên dưới để kích hoạt tài khoản VIP bảo mật của bạn", "Fill in the details below to activate your secure VIP account")
                  : t("Nhập Email hoặc SĐT và mật khẩu bảo mật để mở khóa Black Card VIP", "Enter Email or Phone and password to unlock your VIP Black Card")}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                {error}
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div className="mb-6 p-3 bg-green-50 border border-green-200 text-green-700 text-xs font-medium rounded-lg flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                {message}
              </div>
            )}

            {/* Google OAuth Login Button CONTAINER */}
            <div className="mb-6 flex flex-col items-center justify-center border-b border-black/5 pb-6">
              <p className="text-[10px] font-extrabold tracking-widest text-black/40 mb-3 uppercase">{t("ĐĂNG NHẬP NHANH BẰNG GOOGLE", "QUICK SIGN IN WITH GOOGLE")}</p>
              <div id="google-signin-btn-container" className="shadow-sm border border-black/10 rounded overflow-hidden"></div>
            </div>

            {/* Form */}
            {isRegister ? (
              // FORM ĐĂNG KÝ BẢO MẬT
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/70 mb-1.5">
                    {t("Họ và Tên", "Full Name")}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("VÍ DỤ: NGUYỄN VĂN A", "EXAMPLE: JOHN DOE")}
                    className="w-full rounded-lg border border-black/10 bg-stone-50 px-4 py-3 text-xs placeholder:text-black/30 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/70 mb-1.5">
                    {t("Địa chỉ Email", "Email Address")}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@madmad.vn"
                    className="w-full rounded-lg border border-black/10 bg-stone-50 px-4 py-3 text-xs placeholder:text-black/30 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/70 mb-1.5">
                    {t("Số Điện thoại", "Phone Number")}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09XXXXXXXX"
                    className="w-full rounded-lg border border-black/10 bg-stone-50 px-4 py-3 text-xs placeholder:text-black/30 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/70 mb-1.5 flex items-center gap-1">
                    <Lock className="h-3 w-3 text-black/50" />
                    {t("Thiết lập mật khẩu bảo mật (Tối thiểu 6 ký tự)", "Setup secure password (Min 6 characters)")}
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("Nhập mật khẩu tài khoản...", "Enter account password...")}
                    className="w-full rounded-lg border border-black/10 bg-stone-50 px-4 py-3 text-xs placeholder:text-black/30 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 text-[10px] text-black/40">
                  <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                  {t("Hệ thống bảo mật dữ liệu khách hàng theo chuẩn quốc tế.", "Customer data secured according to international standards.")}
                </div>

                <button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-red-700 h-12 text-xs font-bold tracking-widest uppercase transition-all rounded-lg flex items-center justify-center gap-2 mt-4"
                >
                  <UserCheck className="h-4 w-4" />
                  {t("Đăng ký thành viên VIP", "Register VIP Member")}
                </button>
              </form>
            ) : (
              // FORM ĐĂNG NHẬP BẢO MẬT
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/70 mb-1.5">
                    {t("Email hoặc Số điện thoại", "Email or Phone Number")}
                  </label>
                  <input
                    type="text"
                    required
                    value={phoneOrEmail}
                    onChange={(e) => setPhoneOrEmail(e.target.value)}
                    placeholder={t("Nhập email hoặc SĐT thành viên...", "Enter member email or phone...")}
                    className="w-full rounded-lg border border-black/10 bg-stone-50 px-4 py-3 text-xs placeholder:text-black/30 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/70 mb-1.5 flex items-center gap-1">
                    <Lock className="h-3 w-3 text-black/50" />
                    {t("Mật khẩu bảo mật", "Password")}
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("Nhập mật khẩu tài khoản...", "Enter account password...")}
                    className="w-full rounded-lg border border-black/10 bg-stone-50 px-4 py-3 text-xs placeholder:text-black/30 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-red-700 h-12 text-xs font-bold tracking-widest uppercase transition-all rounded-lg flex items-center justify-center gap-2 mt-4"
                >
                  {t("Đăng nhập", "Sign In")}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* Toggle State */}
            <div className="mt-8 border-t border-black/5 pt-6 text-center">
              <p className="text-xs text-black/50">
                {isRegister ? t("Đã đăng ký trước đây?", "Already registered?") : t("Bạn là thành viên mới?", "New member?")}{" "}
                <button
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError("");
                    setMessage("");
                    setPassword("");
                  }}
                  className="font-bold text-red-600 hover:text-red-700 transition-colors uppercase ml-1"
                >
                  {isRegister ? t("Đăng nhập ngay", "Sign In Now") : t("Đăng ký ngay", "Register Now")}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
