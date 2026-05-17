import { useState } from "react";
import { useMembership } from "@/features/membership/context/membership-context";
import { useOrders } from "@/features/orders/context/order-context";
import { Sparkles, Award, Receipt, LogOut, ArrowRight, UserCheck, ShieldCheck, Lock, XCircle, MessageCircle } from "lucide-react";
import { useTransitionTo } from "@/components/common/page-transition";

export function MembershipPage() {
  const { currentMember, registerMember, loginMember, logoutMember, tierConfigs } = useMembership();
  const { orders, updateOrderStatus } = useOrders();
  const navigate = useTransitionTo();

  const [isRegister, setIsRegister] = useState(false);
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(""); // State cho password nhập vào
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Lọc lịch sử mua sắm của thành viên dựa trên Số điện thoại hoặc Email
  const memberOrders = currentMember
    ? orders.filter(
        (o) =>
          o.customerPhone.replace(/\s+/g, "") === currentMember.phone ||
          o.customerEmail.toLowerCase() === currentMember.email.toLowerCase()
      )
    : [];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!phoneOrEmail || !password) {
      setError("Vui lòng nhập đầy đủ thông tin Email/SĐT và Mật khẩu!");
      return;
    }
    const res = loginMember(phoneOrEmail, password);
    if (!res.success) {
      setError(res.error || "");
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!fullName || !email || !phone || !password) {
      setError("Vui lòng nhập đầy đủ thông tin và thiết lập Mật khẩu!");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu bảo mật phải có ít nhất 6 ký tự!");
      return;
    }

    const res = registerMember(fullName, email, phone, password);
    if (res.success) {
      setMessage("Chúc mừng! Kích hoạt tài khoản VIP MADMAD thành công!");
    } else {
      setError(res.error || "");
    }
  };

  // Thực hiện hủy đơn của thành viên
  const handleCancelOrder = (orderId: number) => {
    if (window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này không? Hành động này không thể hoàn tác!")) {
      updateOrderStatus(orderId, "cancelled");
    }
  };

  // Xác định Class màu thẻ dựa trên Tier
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
            <p className="text-black/50 text-sm">Chào mừng thành viên danh giá trở lại</p>
          </div>
          <button
            onClick={logoutMember}
            className="flex items-center justify-center gap-2 border border-black/15 hover:border-red-600 hover:text-red-600 px-5 py-2.5 text-xs font-bold tracking-widest uppercase transition-all rounded-sm"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* CỘT 1: THẺ THÀNH VIÊN + ĐIỂM */}
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
                  <p className="font-bold text-xs tracking-widest mt-1">BLACK CARD EDITION</p>
                </div>
                <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-extrabold tracking-widest border border-white/10 uppercase">
                  {currentMember.tier}
                </div>
              </div>

              <div>
                <p className="font-mono text-xl tracking-[0.25em] font-medium opacity-90">
                  {currentMember.memberCardId}
                </p>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[8px] tracking-[0.15em] opacity-40 uppercase">Chủ thẻ</p>
                  <p className="font-bold text-sm tracking-wider uppercase mt-0.5">{currentMember.fullName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] tracking-[0.15em] opacity-40 uppercase">Gia nhập</p>
                  <p className="font-medium text-xs opacity-80 mt-0.5">
                    {new Date(currentMember.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
            </div>

            {/* BOX ĐIỂM */}
            <div className="border border-black/10 rounded-xl p-6 bg-stone-50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold tracking-wider text-black/50 uppercase">ĐIỂM TÍCH LŨY</span>
                <Sparkles className="h-5 w-5 text-red-600 animate-pulse" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-black">{currentMember.points}</span>
                <span className="text-xs font-bold text-black/60">ĐIỂM</span>
              </div>
              {(() => {
                const currentTierConfig = tierConfigs.find((c) => c.tier === currentMember.tier);
                const cashbackPercent = currentTierConfig ? currentTierConfig.discountPercent : 2;
                return (
                  <p className="text-[11px] text-black/40 mt-2">
                    * 1 điểm tương đương 10.000₫ chi tiêu thực tế. Bạn đang hưởng đặc quyền giảm giá trực tiếp {cashbackPercent}% cho mọi đơn hàng tiếp theo!
                  </p>
                );
              })()}
            </div>
          </div>

          {/* CỘT 2 & 3: QUYỀN LỢI & LỊCH SỬ ĐƠN HÀNG */}
          <div className="lg:col-span-2 space-y-12">
            {/* Lịch sử mua hàng */}
            <div>
              <h2 className="text-lg font-bold tracking-wider uppercase mb-6 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-black/70" />
                LỊCH SỬ ĐƠN HÀNG ({memberOrders.length})
              </h2>

              {memberOrders.length === 0 ? (
                <div className="border border-dashed border-black/15 rounded-xl p-8 text-center bg-white">
                  <p className="text-sm text-black/40 mb-4">Bạn chưa thực hiện đơn hàng thành viên nào.</p>
                  <button
                    onClick={() => navigate("/shop")}
                    className="inline-flex items-center gap-2 bg-black text-white hover:bg-red-700 text-xs font-bold tracking-widest uppercase px-6 py-3 transition-all rounded-sm"
                  >
                    Mua sắm ngay
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="border border-black/10 rounded-xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-black/10 text-[10px] font-extrabold tracking-wider text-black/60 uppercase">
                          <th className="p-4">Mã Đơn</th>
                          <th className="p-4">Ngày mua</th>
                          <th className="p-4">Trạng thái</th>
                          <th className="p-4 text-right">Tổng tiền</th>
                          <th className="p-4 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 text-xs">
                        {memberOrders.map((order) => {
                          const createdTime = new Date(order.createdAt).getTime();
                          const diffMs = Date.now() - createdTime;
                          const isWithin5Min = diffMs >= 0 && diffMs <= 5 * 60 * 1000;
                          const isCancelled = order.status === "cancelled";

                          return (
                            <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                              <td className="p-4 font-mono font-bold text-black">{order.orderNumber}</td>
                              <td className="p-4 text-black/60">
                                {new Date(order.createdAt).toLocaleDateString("vi-VN")}
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
                                    ? "Thành công"
                                    : order.status === "cancelled"
                                    ? "Đã hủy"
                                    : "Đang xử lý"}
                                </span>
                              </td>
                              <td className="p-4 text-right font-bold text-black">
                                {order.total.toLocaleString("vi-VN")}₫
                              </td>
                              <td className="p-4 text-center">
                                {isCancelled ? (
                                  <span className="text-[10px] font-bold text-stone-400 uppercase">Đã hủy</span>
                                ) : isWithin5Min ? (
                                  <button
                                    onClick={() => handleCancelOrder(order.id)}
                                    className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-extrabold tracking-wider uppercase px-3 py-1.5 rounded-md transition-all shadow-sm"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    Hủy Đơn
                                  </button>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <a
                                      href="https://facebook.com"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Liên hệ Facebook để hủy đơn"
                                      className="text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                    </a>
                                    <span className="text-[9px] text-black/35 font-bold uppercase">CSKH</span>
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
                ĐẶC QUYỀN MA TRẬN THÀNH VIÊN VIP
              </h2>
              <div className="border border-black/10 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="bg-stone-50 border-b border-black/10 px-6 py-4">
                  <h3 className="font-extrabold text-[10px] tracking-wider uppercase text-black">Bảng đặc quyền & chiết khấu thành viên active</h3>
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
                        <span className="text-black/40 font-bold uppercase tracking-wider text-[10px]">Từ {config.minPoints.toLocaleString()} điểm</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-6 sm:text-right">
                        <span className="font-extrabold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">
                          GIẢM {config.discountPercent}% MỌI HÓA ĐƠN
                        </span>
                        <span className="text-black/60 font-bold text-[11px] uppercase tracking-wide">
                          🎁 {config.gifts || "Quà tặng thương hiệu"}
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

  // CHƯA ĐĂNG NHẬP: HIỂN THỊ FORM SPLIT-SCREEN
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
            <p className="text-[10px] tracking-[0.3em] font-extrabold uppercase text-red-600 mb-2">JOIN THE CLUB</p>
            <h2 className="font-black text-3xl tracking-wider uppercase mb-4 leading-none">MADMAD MEMBERSHIP</h2>
            <p className="text-white/60 text-xs leading-relaxed max-w-sm">
              Trở thành thành viên của MADMAD để mở khóa các đặc quyền cao cấp, giảm giá tích điểm 5% và nhận quyền ưu tiên đặt hàng sớm.
            </p>
          </div>
        </div>

        {/* BÊN PHẢI: LOGIN/REGISTER FORM */}
        <div className="lg:col-span-6 px-8 py-16 sm:px-12 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            {/* Header Form */}
            <div className="mb-8">
              <h2 className="font-extrabold text-2xl tracking-tight text-black uppercase mb-2">
                {isRegister ? "ĐĂNG KÝ THÀNH VIÊN" : "MADMAD MEMBER"}
              </h2>
              <p className="text-xs text-black/50">
                {isRegister
                  ? "Điền thông tin bên dưới để kích hoạt tài khoản VIP bảo mật của bạn"
                  : "Nhập Email hoặc SĐT và mật khẩu bảo mật để mở khóa Black Card VIP"}
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

            {/* Form */}
            {isRegister ? (
              // FORM ĐĂNG KÝ BẢO MẬT
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/70 mb-1.5">
                    Họ và Tên
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="VÍ DỤ: NGUYỄN VĂN A"
                    className="w-full rounded-lg border border-black/10 bg-stone-50 px-4 py-3 text-xs placeholder:text-black/30 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/70 mb-1.5">
                    Địa chỉ Email
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
                    Số Điện thoại
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
                    Thiết lập mật khẩu bảo mật (Tối thiểu 6 ký tự)
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu tài khoản..."
                    className="w-full rounded-lg border border-black/10 bg-stone-50 px-4 py-3 text-xs placeholder:text-black/30 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 text-[10px] text-black/40">
                  <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                  Hệ thống bảo mật dữ liệu khách hàng theo chuẩn quốc tế.
                </div>

                <button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-red-700 h-12 text-xs font-bold tracking-widest uppercase transition-all rounded-lg flex items-center justify-center gap-2 mt-4"
                >
                  <UserCheck className="h-4 w-4" />
                  Đăng ký thành viên VIP
                </button>
              </form>
            ) : (
              // FORM ĐĂNG NHẬP BẢO MẬT
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/70 mb-1.5">
                    Email hoặc Số điện thoại
                  </label>
                  <input
                    type="text"
                    required
                    value={phoneOrEmail}
                    onChange={(e) => setPhoneOrEmail(e.target.value)}
                    placeholder="Nhập email hoặc SĐT thành viên..."
                    className="w-full rounded-lg border border-black/10 bg-stone-50 px-4 py-3 text-xs placeholder:text-black/30 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/70 mb-1.5 flex items-center gap-1">
                    <Lock className="h-3 w-3 text-black/50" />
                    Mật khẩu bảo mật
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu tài khoản..."
                    className="w-full rounded-lg border border-black/10 bg-stone-50 px-4 py-3 text-xs placeholder:text-black/30 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-red-700 h-12 text-xs font-bold tracking-widest uppercase transition-all rounded-lg flex items-center justify-center gap-2 mt-4"
                >
                  Đăng nhập
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* Toggle State */}
            <div className="mt-8 border-t border-black/5 pt-6 text-center">
              <p className="text-xs text-black/50">
                {isRegister ? "Đã đăng ký trước đây?" : "Bạn là thành viên mới?"}{" "}
                <button
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError("");
                    setMessage("");
                    setPassword(""); // Reset password state
                  }}
                  className="font-bold text-red-600 hover:text-red-700 transition-colors uppercase ml-1"
                >
                  {isRegister ? "Đăng nhập ngay" : "Đăng ký ngay"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
