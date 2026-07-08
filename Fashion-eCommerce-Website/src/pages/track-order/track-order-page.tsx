import { useState, useEffect } from "react";
import { useOrders } from "@/features/orders/context/order-context";
import { useProducts } from "@/features/products/context/product-context";
import { Search, MapPin, Truck, ShieldCheck, DollarSign, Calendar, Clock, Lock, MessageCircle, Mail, AlertTriangle } from "lucide-react";
import { API_URL, GOOGLE_CLIENT_ID } from "@/config/api";
import { useLanguage } from "@/features/settings/context/language-context";
import { resolveColorCodedItemImage } from "@/utils/product-image";

export function TrackOrderPage() {
  const { orders, updateOrderStatus } = useOrders();
  const { products } = useProducts();
  const { formatPrice, t } = useLanguage();
  
  const maskPhone = (phoneStr: string) => {
    if (!phoneStr) return "********";
    const clean = phoneStr.replace(/\s+/g, "");
    if (clean.length <= 2) return "**";
    return "********" + clean.slice(-2);
  };

  const [orderNumberInput, setOrderNumberInput] = useState("");
  const [phoneOrEmailInput, setPhoneOrEmailInput] = useState("");
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  // Google Login tracking states
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleOrders, setGoogleOrders] = useState<any[]>([]);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  // Load Google Identity Services SDK dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });

        window.google.accounts.id.renderButton(
          document.getElementById("google-track-btn-container"),
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
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Handle Google Login Callback for tracking
  const handleGoogleResponse = async (response: any) => {
    setErrorMsg("");
    setLoadingGoogle(true);
    try {
      const loginRes = await fetch(`${API_URL}/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });

      if (!loginRes.ok) {
        throw new Error(t("Xác thực Google thất bại!", "Google authentication failed!"));
      }

      const data = await loginRes.json();
      setGoogleUser(data.member);

      // Fetch all orders matching this email in Postgres Neon DB
      const ordersRes = await fetch(`${API_URL}/auth/my-orders`, {
        headers: {
          "x-member-email": data.member.email
        }
      });

      if (ordersRes.ok) {
        const orderData = await ordersRes.json();
        setGoogleOrders(orderData);
      }
      setSearched(true);
    } catch (err: any) {
      setErrorMsg(err.message || t("Lỗi xác thực Google!", "Google authentication error!"));
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    setErrorMsg("");
    setGoogleUser(null);
    setGoogleOrders([]);
    
    const cleanOrderNumber = orderNumberInput.trim().toLowerCase();
    const cleanContact = phoneOrEmailInput.trim().toLowerCase().replace(/\s+/g, "");

    if (!cleanOrderNumber || !cleanContact) {
      setResults([]);
      return;
    }

    // 🔒 BẢO MẬT TUYỆT ĐỐI KHÁCH HÀNG:
    // Bắt buộc trùng khớp đồng thời cả 2 yếu tố để ngăn cấm dò quét mã đơn hàng (Brute Force)
    const found = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase() === cleanOrderNumber &&
        (o.customerPhone.replace(/\s+/g, "") === cleanContact ||
          o.customerEmail.toLowerCase() === cleanContact)
    );
    setResults(found);
  };

  // Xác định vị trí tiến trình dựa trên Status
  const getStatusStep = (status: string) => {
    switch (status) {
      case "completed":
        return 4;
      case "shipping":
        return 3;
      case "processing":
      case "pending":
      default:
        return 2;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return t("Đã giao thành công", "Delivered");
      case "shipping":
        return t("Đang vận chuyển", "Shipping");
      case "processing":
        return t("Đang chuẩn bị hàng", "Preparing");
      case "pending":
      default:
        return t("Chờ xác nhận", "Pending");
    }
  };

  // Determine which list to render
  const renderedOrders = googleUser ? googleOrders : results;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-lg mx-auto mb-12">
        <h1 className="font-extrabold text-3xl tracking-tight text-black uppercase mb-2">{t("TRA CỨU ĐƠN HÀNG", "TRACK YOUR ORDER")}</h1>
        <p className="text-black/50 text-xs leading-relaxed">
          {t("Tra cứu nhanh tiến độ giao nhận. Vì lý do an toàn bảo mật thông tin cá nhân, chúng tôi hỗ trợ hai chế độ xác minh tối ưu dưới đây.", "Fast shipping progress search. For safety and personal information security, we support two optimal verification modes below.")}
        </p>
      </div>

      {errorMsg && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-start">
        {/* CHẾ ĐỘ 1: ĐĂNG NHẬP GOOGLE TRA CỨU AN TOÀN */}
        <div className="lg:col-span-5 border border-black/10 rounded-2xl p-6 bg-white shadow-sm flex flex-col items-center justify-center text-center min-h-[290px]">
          <Mail className="h-10 w-10 text-red-600 mb-4" />
          <h3 className="font-extrabold text-sm text-black uppercase mb-2">{t("Cách 1: Xác thực Google", "Method 1: Google Verification")}</h3>
          <p className="text-[11px] text-black/50 mb-6 leading-relaxed max-w-xs">
            {t("Khuyên dùng! Google sẽ xác minh chủ sở hữu Gmail. Bạn sẽ xem được tất cả đơn hàng (cả khách vãng lai và VIP) từng đặt bằng Gmail này.", "Recommended! Google will verify your Gmail ownership. You can view all orders (both guest and VIP) placed using this Gmail.")}
          </p>
          {loadingGoogle ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
          ) : (
            <div id="google-track-btn-container" className="shadow-sm border border-black/10 rounded overflow-hidden"></div>
          )}
        </div>

        {/* CHẾ ĐỘ 2: TRA CỨU ĐƠN LẺ THỦ CÔNG HAI YẾU TỐ */}
        <div className="lg:col-span-7 border border-black/10 rounded-2xl p-6 bg-stone-50/50 shadow-sm min-h-[290px] flex flex-col justify-between">
          <form onSubmit={handleManualSearch} className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-4.5 w-4.5 text-black/60" />
              <h3 className="font-extrabold text-sm text-black uppercase">{t("Cách 2: Xác minh đơn lẻ", "Method 2: Single Order Verification")}</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/60 mb-1 flex items-center gap-1">
                  {t("Mã đơn hàng", "Order ID")}
                </label>
                <input
                  type="text"
                  required
                  value={orderNumberInput}
                  onChange={(e) => setOrderNumberInput(e.target.value)}
                  placeholder={t("VÍ DỤ: DH2026...", "EXAMPLE: DH2026...")}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs placeholder:text-black/35 focus:border-black/60 focus:outline-none transition-all uppercase font-semibold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold tracking-wider uppercase text-black/60 mb-1">
                  {t("Số điện thoại hoặc Email", "Phone Number or Email")}
                </label>
                <input
                  type="text"
                  required
                  value={phoneOrEmailInput}
                  onChange={(e) => setPhoneOrEmailInput(e.target.value)}
                  placeholder={t("Nhập thông tin đặt hàng...", "Enter order contact info...")}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs placeholder:text-black/35 focus:border-black/60 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white hover:bg-red-700 py-3 text-xs font-bold tracking-widest uppercase transition-all rounded-xl flex items-center justify-center gap-2 mt-2"
            >
              <Search className="h-4 w-4" />
              {t("Tra cứu đơn lẻ", "Search Single Order")}
            </button>
          </form>

          <div className="flex items-center gap-2 mt-4 p-3 bg-stone-100 rounded-lg text-[10px] text-black/50 leading-relaxed border border-black/5">
            <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
            <span><strong>{t("Bảo mật:", "Security:")}</strong> {t("Bảo mật: Bắt buộc khớp cả Mã đơn hàng và SĐT/Email để tránh rò rỉ dữ liệu cá nhân của bạn.", "Order ID and Phone/Email must match to prevent personal data leaks.")}</span>
          </div>
        </div>
      </div>

      {/* Hiển thị kết quả */}
      {searched && (
        <div className="space-y-12 animate-fadeIn">
          {googleUser && (
            <div className="max-w-2xl mx-auto p-4 bg-stone-50 border border-black/5 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                {googleUser.avatarUrl && (
                  <img src={googleUser.avatarUrl} alt="Avatar" className="h-9 w-9 rounded-full border border-black/10 object-cover" />
                )}
                <div>
                  <p className="font-bold text-black uppercase">{t("Gmail đã xác thực", "Verified Gmail")}</p>
                  <p className="text-[11px] text-black/50">{googleUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setGoogleUser(null);
                  setGoogleOrders([]);
                  setSearched(false);
                }}
                className="text-[10px] font-bold text-red-600 hover:text-red-700 uppercase"
              >
                {t("Hủy liên kết", "Disconnect")}
              </button>
            </div>
          )}

          {renderedOrders.length === 0 ? (
            <div className="border border-dashed border-black/15 rounded-2xl p-12 text-center bg-stone-50 max-w-xl mx-auto">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-black/70 mb-2">{t("Không tìm thấy đơn hàng", "Order Not Found")}</p>
              <p className="text-xs text-black/40 leading-relaxed">
                {googleUser 
                  ? `${t("Gmail không tồn tại hoặc chưa từng phát sinh mua hàng bằng Gmail này:", "Gmail does not exist or has never been used for any purchase:")} ${googleUser.email}.`
                  : t("Vui lòng kiểm tra lại Mã đơn hàng (DH2026...) và Số điện thoại hoặc Email liên hệ của bạn.", "Please double check the Order ID (DH2026...) and your contact phone or email.")}
              </p>
            </div>
          ) : (
            renderedOrders.map((order) => {
              const currentStep = getStatusStep(order.status);
              const progressWidth = `${((currentStep - 1) / 3) * 100}%`;

              const isCancelled = order.status === "cancelled";
              const isCompletedOrCancelled = order.status === "completed" || order.status === "cancelled";

              return (
                <div key={order.id} className="border border-black/10 rounded-2xl p-6 sm:p-8 bg-white shadow-xl">
                  {/* Mã đơn và ngày mua */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-black/10 pb-6 mb-8">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-black/40 uppercase">{t("Xác minh đơn hàng thành công", "Order Verified Successfully")}</span>
                      <div className="flex items-center gap-3 mt-0.5">
                        <h2 className="font-mono font-bold text-xl text-black">{order.orderNumber}</h2>
                        {isCompletedOrCancelled && (
                          <span className={`text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full ${
                            order.status === "completed" 
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                            {order.status === "completed" ? t("Đã hoàn thành", "Completed") : t("Đã hủy", "Cancelled")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-black/50">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="h-4 w-4" />
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-4 w-4" />
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {/* Thanh tiến trình */}
                  {!isCompletedOrCancelled && (
                    <div className="mb-12">
                      <div className="relative">
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-stone-100 -translate-y-1/2 z-0 rounded-full" />
                        <div
                          className="absolute top-1/2 left-0 h-1 bg-red-600 -translate-y-1/2 z-0 rounded-full transition-all duration-1000"
                          style={{ width: progressWidth }}
                        />

                        <div className="relative z-10 flex justify-between">
                          {[
                            { step: 1, label: t("Đã đặt hàng", "Ordered") },
                            { step: 2, label: t("Đang chuẩn bị", "Preparing") },
                            { step: 3, label: t("Đang vận chuyển", "Shipping") },
                            { step: 4, label: t("Hoàn thành", "Completed") },
                          ].map((node) => {
                            const isActive = currentStep >= node.step;
                            return (
                              <div key={node.step} className="flex flex-col items-center">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 font-extrabold text-xs ${
                                    isActive
                                      ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/30"
                                      : "bg-white border-stone-200 text-black/30"
                                  }`}
                                >
                                  {node.step}
                                </div>
                                <span
                                  className={`text-[10px] font-bold tracking-wider uppercase mt-3 transition-colors ${
                                    isActive ? "text-red-600" : "text-black/35"
                                  }`}
                                >
                                  {node.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chi tiết đơn hàng */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Cột trái: Sản phẩm */}
                    <div className="md:col-span-7 space-y-4">
                      <h3 className="text-xs font-bold tracking-wider text-black/40 uppercase mb-4">{t("Danh sách sản phẩm mua", "Items List")}</h3>
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="flex gap-4 items-center">
                            <div className="w-14 h-16 bg-stone-50 border border-black/5 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={resolveColorCodedItemImage(item, products)}
                                alt={item.productName || item.product?.name || ""}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-black truncate uppercase">{item.productName || item.product?.name || ""}</h4>
                              <p className="text-[10px] text-black/40 mt-1 uppercase">
                                Size: {item.size} | {t("Màu:", "Color:")} {item.color} | {t("SL:", "Qty:")} {item.quantity}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-black flex-shrink-0 font-mono">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cột phải: Thông tin giao nhận */}
                    <div className="md:col-span-5 bg-stone-50 rounded-xl p-5 border border-black/5 space-y-4">
                      <h3 className="text-xs font-bold tracking-wider text-black/60 uppercase">{t("Thông tin nhận hàng", "Delivery Info")}</h3>

                      <div className="space-y-3 text-xs">
                        <div className="flex gap-3">
                          <MapPin className="h-4 w-4 text-black/40 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-black uppercase">{order.customerName}</p>
                            <p className="text-black/50 mt-1 font-mono">
                              {t("SĐT:", "Phone:")} {maskPhone(order.customerPhone || order.phone)}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Truck className="h-4 w-4 text-black/40 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-black uppercase">{t("Vận chuyển:", "Shipping:")} </span>
                            {isCancelled ? (
                              <span className="font-bold text-stone-500">{t("ĐÃ HỦY ĐƠN", "CANCELLED")}</span>
                            ) : (
                              <span className="font-bold text-red-600">{getStatusLabel(order.status)}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <DollarSign className="h-4 w-4 text-black/40 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-black uppercase">{t("Thanh toán:", "Payment:")} </span>
                            <span className="text-black/50 uppercase font-medium">{order.paymentMethod}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-black/5 pt-3 mt-4 space-y-1.5 text-xs">
                        <div className="flex justify-between text-black/50">
                          <span>{t("Tạm tính", "Subtotal")}</span>
                          <span className="font-mono">{formatPrice(order.subtotal)}</span>
                        </div>
                        {order.discount > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>{t("Giảm giá", "Discount")}</span>
                            <span className="font-mono">-{formatPrice(order.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-extrabold text-black text-sm pt-1.5 border-t border-black/5">
                          <span>{t("TỔNG TIỀN THỰC CHI", "TOTAL AMOUNT")}</span>
                          <span className="font-mono">{formatPrice(order.total)}</span>
                        </div>
                      </div>

                      {/* Nút bấm CSKH/Hủy đơn */}
                      <div className="border-t border-black/5 pt-4 mt-4">
                        {isCancelled ? (
                          <div className="text-[10px] text-center font-bold text-stone-500 uppercase py-2 bg-stone-100 rounded-lg">
                            {t("Đơn hàng đã được hủy thành công", "Order has been cancelled successfully")}
                          </div>
                        ) : order.status === "completed" ? (
                          <div className="text-[10px] text-center font-bold text-green-700 uppercase py-2 bg-green-50 border border-green-200 rounded-lg">
                            {t("Đơn hàng đã giao thành công", "Order has been delivered successfully")}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <a
                                href="https://facebook.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 bg-[#1877F2] text-white hover:bg-[#166FE5] py-2.5 text-[9px] font-extrabold tracking-widest uppercase rounded-lg transition-all flex items-center justify-center gap-1"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                FACEBOOK
                              </a>
                              <a
                                href="https://instagram.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] text-white hover:opacity-90 py-2.5 text-[9px] font-extrabold tracking-widest uppercase rounded-lg transition-all flex items-center justify-center gap-1"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                INSTAGRAM
                              </a>
                            </div>
                            <p className="text-[9px] text-red-600/85 font-bold text-center leading-relaxed">
                              {t("* Vui lòng liên hệ CSKH của MADMAD để được hỗ trợ điều chỉnh/hủy đơn.", "* Please contact MADMAD Support for order adjustment/cancellation assistance.")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
