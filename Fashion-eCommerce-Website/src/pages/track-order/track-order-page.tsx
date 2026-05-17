import { useState } from "react";
import { useOrders } from "@/features/orders/context/order-context";
import { Search, MapPin, Truck, ShieldCheck, DollarSign, Calendar, Clock, Lock, XCircle, MessageCircle } from "lucide-react";

export function TrackOrderPage() {
  const { orders, updateOrderStatus } = useOrders();
  const [orderNumberInput, setOrderNumberInput] = useState("");
  const [phoneOrEmailInput, setPhoneOrEmailInput] = useState("");
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    
    const cleanOrderNumber = orderNumberInput.trim().toLowerCase();
    const cleanContact = phoneOrEmailInput.trim().toLowerCase().replace(/\s+/g, "");

    if (!cleanOrderNumber || !cleanContact) {
      setResults([]);
      return;
    }

    // Bắt buộc trùng khớp đồng thời cả 2 yếu tố để bảo mật tuyệt đối thông tin khách hàng
    const found = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase() === cleanOrderNumber &&
        (o.customerPhone.replace(/\s+/g, "") === cleanContact ||
          o.customerEmail.toLowerCase() === cleanContact)
    );
    setResults(found);
  };

  // Xác định vị trí/độ rộng tiến trình dựa trên Status
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
        return "Đã giao thành công";
      case "shipping":
        return "Đang vận chuyển";
      case "processing":
        return "Đang chuẩn bị hàng";
      case "pending":
      default:
        return "Chờ xác nhận";
    }
  };

  // Thực hiện hủy đơn hàng
  const handleCancelOrder = (orderId: number) => {
    if (window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này để đặt lại không? Hành động này không thể hoàn tác!")) {
      updateOrderStatus(orderId, "cancelled");
      // Cập nhật lại state kết quả tìm kiếm hiển thị
      setResults((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o))
      );
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-lg mx-auto mb-12">
        <h1 className="font-extrabold text-3xl tracking-tight text-black uppercase mb-2">TRA CỨU ĐƠN HÀNG</h1>
        <p className="text-black/50 text-xs leading-relaxed">
          Nhập mã đơn hàng và thông tin liên hệ của bạn để theo dõi tiến độ giao hàng. Vì lý do bảo mật, thông tin chỉ được hiển thị khi khớp hoàn toàn cả 2 yếu tố.
        </p>
      </div>

      {/* Form tìm kiếm bảo mật hai yếu tố */}
      <form onSubmit={handleSearch} className="mb-16 max-w-2xl mx-auto border border-black/10 rounded-2xl p-6 sm:p-8 bg-stone-50/50 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/70 mb-1.5 flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-black/55" />
              Mã đơn hàng
            </label>
            <input
              type="text"
              required
              value={orderNumberInput}
              onChange={(e) => setOrderNumberInput(e.target.value)}
              placeholder="VÍ DỤ: DH2026..."
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-xs placeholder:text-black/35 focus:border-black/60 focus:outline-none focus:ring-0 transition-all uppercase font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold tracking-wider uppercase text-black/70 mb-1.5">
              Số điện thoại hoặc Email
            </label>
            <input
              type="text"
              required
              value={phoneOrEmailInput}
              onChange={(e) => setPhoneOrEmailInput(e.target.value)}
              placeholder="SĐT hoặc Email đặt hàng..."
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-xs placeholder:text-black/35 focus:border-black/60 focus:outline-none focus:ring-0 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white hover:bg-red-700 h-12 text-xs font-bold tracking-widest uppercase transition-all rounded-xl flex items-center justify-center gap-2"
        >
          <Search className="h-4 w-4" />
          Xác minh và Tra cứu đơn hàng
        </button>
      </form>

      {/* Hiển thị kết quả */}
      {searched && (
        <div className="space-y-12 animate-fadeIn">
          {results.length === 0 ? (
            <div className="border border-dashed border-black/15 rounded-2xl p-12 text-center bg-stone-50 max-w-xl mx-auto">
              <p className="text-sm font-semibold text-black/70 mb-2">Thông tin tra cứu không trùng khớp</p>
              <p className="text-xs text-black/40 leading-relaxed">
                Vui lòng kiểm tra lại Mã đơn hàng (ví dụ: DH2026...) và Số điện thoại hoặc Email đặt hàng của bạn. Hãy đảm bảo cả 2 thông tin đã được điền chính xác.
              </p>
            </div>
          ) : (
            results.map((order) => {
              const currentStep = getStatusStep(order.status);
              const progressWidth = `${((currentStep - 1) / 3) * 100}%`;

              // Tính toán xem đơn hàng có nằm trong 5 phút đầu từ lúc tạo không
              const createdTime = new Date(order.createdAt).getTime();
              const diffMs = Date.now() - createdTime;
              const isWithin5Min = diffMs >= 0 && diffMs <= 5 * 60 * 1000;
              const isCancelled = order.status === "cancelled";

              return (
                <div key={order.id} className="border border-black/10 rounded-2xl p-6 sm:p-8 bg-white shadow-xl">
                  {/* Mã đơn và ngày mua */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-black/10 pb-6 mb-8">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-black/40 uppercase">Đơn hàng xác minh thành công</span>
                      <h2 className="font-mono font-bold text-xl text-black mt-0.5">{order.orderNumber}</h2>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-black/50">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(order.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {/* Thanh tiến trình Sleek Progress Tracking */}
                  {!isCancelled && (
                    <div className="mb-12">
                      <div className="relative">
                        {/* Đường line xám nền */}
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-stone-100 -translate-y-1/2 z-0 rounded-full" />
                        {/* Đường line tiến trình đỏ */}
                        <div
                          className="absolute top-1/2 left-0 h-1 bg-red-600 -translate-y-1/2 z-0 rounded-full transition-all duration-1000"
                          style={{ width: progressWidth }}
                        />

                        {/* Các node trạng thái */}
                        <div className="relative z-10 flex justify-between">
                          {[
                            { step: 1, label: "Đã đặt hàng" },
                            { step: 2, label: "Đang chuẩn bị" },
                            { step: 3, label: "Đang vận chuyển" },
                            { step: 4, label: "Hoàn thành" },
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
                      <h3 className="text-xs font-bold tracking-wider text-black/40 uppercase mb-4">Sản phẩm</h3>
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="flex gap-4 items-center">
                            <div className="w-14 h-16 bg-stone-50 border border-black/5 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={item.productImage || item.product?.image || ""}
                                alt={item.productName || item.product?.name || ""}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-black truncate uppercase">{item.productName || item.product?.name || ""}</h4>
                              <p className="text-[10px] text-black/40 mt-1 uppercase">
                                Size: {item.size} | Màu: {item.color} | SL: {item.quantity}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-black flex-shrink-0">
                              {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cột phải: Thông tin giao hàng */}
                    <div className="md:col-span-5 bg-stone-50 rounded-xl p-5 border border-black/5 space-y-4">
                      <h3 className="text-xs font-bold tracking-wider text-black/60 uppercase">Thông tin giao nhận</h3>

                      <div className="space-y-3">
                        <div className="flex gap-3 text-xs">
                          <MapPin className="h-4 w-4 text-black/40 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-black">{order.customerName}</p>
                            <p className="text-black/50 mt-1">
                              {order.shippingAddress.street}, {order.shippingAddress.ward}, {order.shippingAddress.district}, {order.shippingAddress.province}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3 text-xs">
                          <Truck className="h-4 w-4 text-black/40 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-black uppercase">Trạng thái: </span>
                            {isCancelled ? (
                              <span className="font-bold text-stone-500">ĐÃ HỦY ĐƠN</span>
                            ) : (
                              <span className="font-bold text-red-600">{getStatusLabel(order.status)}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-3 text-xs">
                          <DollarSign className="h-4 w-4 text-black/40 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-black uppercase">Thanh toán: </span>
                            <span className="text-black/50">{order.paymentMethod}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-black/5 pt-3 mt-4 space-y-1.5 text-xs">
                        <div className="flex justify-between text-black/50">
                          <span>Tạm tính</span>
                          <span>{order.subtotal.toLocaleString("vi-VN")}₫</span>
                        </div>
                        {order.discount > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Giảm giá</span>
                            <span>-{order.discount.toLocaleString("vi-VN")}₫</span>
                          </div>
                        )}
                        <div className="flex justify-between font-extrabold text-black text-sm pt-1.5 border-t border-black/5">
                          <span>TỔNG TIỀN</span>
                          <span>{order.total.toLocaleString("vi-VN")}₫</span>
                        </div>
                      </div>

                      {/* ── NÚT BẤM HỦY ĐƠN 5 PHÚT / LIÊN HỆ CSKH ── */}
                      <div className="border-t border-black/5 pt-4 mt-4">
                        {isCancelled ? (
                          <div className="text-[10px] text-center font-bold text-stone-500 uppercase py-2 bg-stone-100 rounded-lg">
                            Đơn hàng đã được hủy thành công
                          </div>
                        ) : isWithin5Min ? (
                          <div className="space-y-2">
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="w-full bg-red-600 text-white hover:bg-red-700 py-3 text-[10px] font-extrabold tracking-widest uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-600/10"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Hủy Đơn Hàng Tự Động (Còn 5 Phút)
                            </button>
                            <p className="text-[9px] text-black/40 text-center leading-relaxed">
                              * Bạn có thể tự hủy đơn hàng trong vòng 5 phút đầu kể từ khi đặt để điều chỉnh lại thông tin hoặc đặt đơn mới.
                            </p>
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
                            <p className="text-[9px] text-red-600/80 font-bold text-center leading-relaxed">
                              * Đã quá 5 phút để tự hủy. Vui lòng liên hệ CSKH qua Facebook hoặc Instagram của MADMAD để được hỗ trợ điều chỉnh/hủy đơn.
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
