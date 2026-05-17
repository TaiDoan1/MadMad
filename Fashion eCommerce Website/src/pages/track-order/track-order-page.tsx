import { useState } from "react";
import { useOrders } from "@/features/orders/context/order-context";
import { Search, MapPin, Truck, ShieldCheck, DollarSign, Calendar, Clock } from "lucide-react";

export function TrackOrderPage() {
  const { orders } = useOrders();
  const [keyword, setKeyword] = useState("");
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    const cleanedKeyword = keyword.trim().toLowerCase();

    if (!cleanedKeyword) {
      setResults([]);
      return;
    }

    // Tìm kiếm đơn hàng khớp với Mã Đơn hàng hoặc Số điện thoại
    const found = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase() === cleanedKeyword ||
        o.customerPhone.replace(/\s+/g, "") === cleanedKeyword.replace(/\s+/g, "")
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
        return 2; // Mặc định là Chờ xác nhận / Đang chuẩn bị
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-lg mx-auto mb-12">
        <h1 className="font-extrabold text-3xl tracking-tight text-black uppercase mb-2">TRA CỨU ĐƠN HÀNG</h1>
        <p className="text-black/50 text-sm">
          Nhập mã đơn hàng (ví dụ: DH2026...) hoặc Số điện thoại để theo dõi hành trình vận chuyển
        </p>
      </div>

      {/* Ô tìm kiếm */}
      <form onSubmit={handleSearch} className="mb-12 max-w-xl mx-auto flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-black/35" />
          <input
            type="text"
            required
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Nhập Mã đơn hàng hoặc Số điện thoại..."
            className="w-full rounded-xl border border-black/10 bg-stone-50 pl-12 pr-4 py-3.5 text-xs placeholder:text-black/30 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all uppercase font-semibold"
          />
        </div>
        <button
          type="submit"
          className="bg-black text-white hover:bg-red-700 px-6 py-3.5 text-xs font-bold tracking-widest uppercase transition-all rounded-xl"
        >
          TRA CỨU
        </button>
      </form>

      {/* Hiển thị kết quả */}
      {searched && (
        <div className="space-y-12">
          {results.length === 0 ? (
            <div className="border border-dashed border-black/15 rounded-2xl p-12 text-center bg-stone-50 max-w-xl mx-auto">
              <p className="text-sm font-semibold text-black/70 mb-2">Không tìm thấy đơn hàng tương ứng</p>
              <p className="text-xs text-black/40">
                Hãy kiểm tra lại mã đơn hàng (ví dụ: DH2026...) hoặc SĐT của bạn có chính xác không.
              </p>
            </div>
          ) : (
            results.map((order) => {
              const currentStep = getStatusStep(order.status);
              const progressWidth = `${((currentStep - 1) / 3) * 100}%`;

              return (
                <div key={order.id} className="border border-black/10 rounded-2xl p-6 sm:p-8 bg-white shadow-xl">
                  {/* Mã đơn và ngày mua */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-black/10 pb-6 mb-8">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-black/40 uppercase">Đơn hàng</span>
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

                  {/* Chi tiết đơn hàng */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Cột trái: Sản phẩm */}
                    <div className="md:col-span-7 space-y-4">
                      <h3 className="text-xs font-bold tracking-wider text-black/40 uppercase mb-4">Sản phẩm</h3>
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="flex gap-4 items-center">
                            <div className="w-14 h-16 bg-stone-50 border border-black/5 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold text-black/30">
                              IMG
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-black truncate uppercase">{item.product.name}</h4>
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
                            <span className="font-bold text-red-600">{getStatusLabel(order.status)}</span>
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
