import { useState } from "react";
import { Eye, Printer, Search, X, Trash2, Calendar, CheckCircle2, AlertCircle, Clock, Check, RefreshCw } from "lucide-react";

import { brandLogo } from "@/assets/images";
import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useOrders } from "@/features/orders/context/order-context";
import type { Order } from "@/types/order";

export function AdminOrdersPage() {
  const { orders, updateOrderStatus, addOrder } = useOrders();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  // Bộ lọc tìm kiếm đơn hàng
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone.includes(searchTerm);
    const matchesStatus = filterStatus === "all" || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 text-green-700 border-green-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      case "shipping":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "processing":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "pending":
      default:
        return "bg-stone-100 text-stone-600 border-stone-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Thành công";
      case "cancelled":
        return "Đã hủy";
      case "shipping":
        return "Đang giao";
      case "processing":
        return "Đang chuẩn bị";
      case "pending":
      default:
        return "Chờ xác nhận";
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-black uppercase">QUẢN LÝ ĐƠN HÀNG</h1>
          <p className="text-xs text-black/50">Theo dõi, duyệt đơn hàng và xử lý trạng thái hóa đơn của khách hàng</p>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm Sleek Noir */}
      <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-black/10 bg-stone-50 pl-10 pr-4 py-3 text-xs placeholder:text-black/30 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all font-semibold"
              placeholder="Tìm theo Mã đơn hàng, Tên hoặc Số điện thoại khách..."
            />
          </div>
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            className="rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs font-bold text-black/70 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all"
          >
            <option value="all">TẤT CẢ TRẠNG THÁI</option>
            <option value="pending">CHỜ XÁC NHẬN</option>
            <option value="processing">ĐANG CHUẨN BỊ</option>
            <option value="shipping">ĐANG GIAO HÀNG</option>
            <option value="completed">ĐÃ GIAO THÀNH CÔNG</option>
            <option value="cancelled">ĐÃ HỦY ĐƠN</option>
          </select>
        </div>

        {/* Danh sách đơn hàng dạng bảng Noir */}
        <div className="overflow-hidden border border-black/5 rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-black/10 font-bold uppercase tracking-wider text-black/60">
                  <th className="px-6 py-4">Mã Đơn Hàng</th>
                  <th className="px-6 py-4">Khách Hàng</th>
                  <th className="px-6 py-4">SĐT</th>
                  <th className="px-6 py-4">Ngày Đặt</th>
                  <th className="px-6 py-4 text-center">Trạng Thái</th>
                  <th className="px-6 py-4 text-right">Tổng Tiền</th>
                  <th className="px-6 py-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 font-semibold text-black/85">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-black/40 bg-stone-50/50">
                      Không tìm thấy đơn hàng nào tương ứng.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-stone-50/50">
                      <td className="px-6 py-4 font-mono font-bold text-black">{order.orderNumber}</td>
                      <td className="px-6 py-4">{order.customerName}</td>
                      <td className="px-6 py-4 text-black/60">{order.customerPhone}</td>
                      <td className="px-6 py-4 text-black/65">
                        {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] border font-bold uppercase ${getStatusBadge(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-black">
                        {order.total.toLocaleString("vi-VN")}₫
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderDetail(true);
                            }}
                            className="rounded-lg p-2 hover:bg-black hover:text-white transition-all"
                            title="Xem chi tiết & duyệt đơn"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setTimeout(() => window.print(), 100);
                            }}
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 transition-all"
                            title="In hóa đơn bán hàng"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL CHI TIẾT ĐƠN HÀNG & DUYỆT TRẠNG THÁI */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white border border-black/10 shadow-2xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-black/10 p-6">
              <div>
                <span className="text-[10px] font-bold text-black/45 tracking-wider uppercase">Duyệt Đơn Hàng</span>
                <h2 className="text-xl font-black text-black font-mono">{selectedOrder.orderNumber}</h2>
              </div>
              <button
                onClick={() => {
                  setShowOrderDetail(false);
                  setSelectedOrder(null);
                }}
                className="rounded-xl p-2 border border-black/5 hover:border-black/20 hover:bg-stone-50 transition-colors"
              >
                <X className="h-5 w-5 text-black/75" />
              </button>
            </div>

            {/* Content Modal */}
            <div className="space-y-8 p-6">
              {/* Trạng thái đơn hàng */}
              <div className="bg-stone-50 rounded-xl p-5 border border-black/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-black/55 uppercase mb-1.5 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Trạng thái vận hành đơn
                  </p>
                  <p className="text-xs text-black/50">Chọn trạng thái để cập nhật tiến độ tự động trên hệ thống</p>
                </div>
                <select
                  value={selectedOrder.status}
                  onChange={(event) => {
                    const newStatus = event.target.value as Order["status"];
                    updateOrderStatus(selectedOrder.id, newStatus);
                    setSelectedOrder({ ...selectedOrder, status: newStatus });
                  }}
                  className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-bold uppercase text-black/70 focus:border-black/60 focus:outline-none focus:ring-0 transition-all"
                >
                  <option value="pending">CHỜ XÁC NHẬN</option>
                  <option value="processing">ĐANG CHUẨN BỊ</option>
                  <option value="shipping">ĐANG GIAO HÀNG</option>
                  <option value="completed">ĐÃ GIAO THÀNH CÔNG</option>
                  <option value="cancelled">ĐÃ HỦY ĐƠN</option>
                </select>
              </div>

              {/* Thông tin khách hàng & Địa chỉ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-black/80 font-medium">
                <div className="border border-black/5 rounded-xl p-5 bg-white space-y-3">
                  <h3 className="text-[10px] font-extrabold tracking-widest text-black/50 uppercase border-b border-black/5 pb-2">
                    Thông Tin Khách Hàng
                  </h3>
                  <div className="space-y-2">
                    <p className="text-black font-bold text-sm uppercase">{selectedOrder.customerName}</p>
                    <p><span className="text-black/45">Email:</span> {selectedOrder.customerEmail}</p>
                    <p><span className="text-black/45">Điện thoại:</span> {selectedOrder.customerPhone}</p>
                    <p><span className="text-black/45">Thanh toán:</span> <span className="uppercase font-bold text-black">{selectedOrder.paymentMethod}</span></p>
                  </div>
                </div>

                <div className="border border-black/5 rounded-xl p-5 bg-white space-y-3">
                  <h3 className="text-[10px] font-extrabold tracking-widest text-black/50 uppercase border-b border-black/5 pb-2">
                    Địa Chỉ Nhận Hàng
                  </h3>
                  <div className="space-y-1.5 leading-relaxed">
                    <p><span className="text-black/45">Địa chỉ cụ thể:</span> {selectedOrder.shippingAddress.street}</p>
                    <p><span className="text-black/45">Phường / Xã:</span> {selectedOrder.shippingAddress.ward}</p>
                    <p><span className="text-black/45">Quận / Huyện:</span> {selectedOrder.shippingAddress.district}</p>
                    <p><span className="text-black/45">Tỉnh / Thành:</span> {selectedOrder.shippingAddress.province}</p>
                  </div>
                </div>
              </div>

              {/* Danh sách sản phẩm mua */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-extrabold tracking-widest text-black/50 uppercase">
                  Sản phẩm trong hóa đơn
                </h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 rounded-xl border border-black/5 p-4 bg-stone-50/50 hover:bg-white hover:shadow-md transition-all duration-300"
                    >
                      <div className="h-16 w-14 overflow-hidden rounded-lg bg-stone-100 border border-black/5 flex-shrink-0">
                        <ImageWithFallback
                          src={item.product.image}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-black uppercase truncate text-xs">{item.product.name}</p>
                        <p className="text-[10px] text-black/45 mt-1 uppercase">
                          Size: {item.size} | Màu: {item.color} | Số lượng: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-black text-xs">
                          {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                        </p>
                        <p className="text-[9px] text-black/40 mt-0.5">
                          Đơn giá: {item.price.toLocaleString("vi-VN")}₫
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tổng kết tiền đơn hàng */}
              <div className="border-t border-black/10 pt-5 flex justify-end">
                <div className="w-full sm:w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-black/55">
                    <span>Tạm tính</span>
                    <span>{selectedOrder.subtotal.toLocaleString("vi-VN")}₫</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-red-600 font-bold">
                      <span>Mã giảm giá</span>
                      <span>-{selectedOrder.discount.toLocaleString("vi-VN")}₫</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-black text-sm border-t border-black/5 pt-2">
                    <span>TỔNG TIỀN</span>
                    <span>{selectedOrder.total.toLocaleString("vi-VN")}₫</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE IN HÓA ĐƠN GỬI KÈM HÀNG (PRINT ONLY) */}
      {selectedOrder && (
        <div className="hidden print:block">
          <div className="mx-auto max-w-4xl p-8 text-black bg-white" style={{ fontFamily: "monospace" }}>
            <div className="mb-8 flex items-start justify-between border-b-2 border-black pb-6">
              <div className="flex items-center gap-4">
                <img src={brandLogo} alt="MADMAD Studio" className="h-16 w-auto" />
                <div>
                  <h1 className="text-xl font-bold tracking-widest uppercase">MADMAD STUDIO</h1>
                  <p className="text-[10px]">Thương hiệu thời trang tối giản & độc bản</p>
                  <p className="text-[10px]">Website: madmad.vn</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold">HÓA ĐƠN BÁN HÀNG</h2>
                <p className="text-xs font-mono font-bold mt-1">{selectedOrder.orderNumber}</p>
                <p className="text-[10px] mt-0.5">Ngày mua: {new Date(selectedOrder.createdAt).toLocaleDateString("vi-VN")}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8 text-[11px]">
              <div>
                <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase">Thông tin khách hàng</h3>
                <p>Khách hàng: <span className="font-bold">{selectedOrder.customerName}</span></p>
                <p>Số điện thoại: {selectedOrder.customerPhone}</p>
                <p>Email: {selectedOrder.customerEmail}</p>
                <p>Thanh toán: <span className="uppercase font-bold">{selectedOrder.paymentMethod}</span></p>
              </div>
              <div>
                <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase">Địa chỉ nhận hàng</h3>
                <p>{selectedOrder.shippingAddress.street}</p>
                <p>{selectedOrder.shippingAddress.ward}</p>
                <p>{selectedOrder.shippingAddress.district}</p>
                <p>{selectedOrder.shippingAddress.province}</p>
              </div>
            </div>

            <table className="w-full text-left text-[11px] border-collapse mb-8">
              <thead>
                <tr className="border-y border-black font-bold">
                  <th className="py-2">Sản phẩm</th>
                  <th className="py-2">Thuộc tính</th>
                  <th className="py-2 text-center">Số lượng</th>
                  <th className="py-2 text-right">Đơn giá</th>
                  <th className="py-2 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((item, index) => (
                  <tr key={index} className="border-b border-black/10">
                    <td className="py-3 uppercase font-bold">{item.product.name}</td>
                    <td className="py-3 uppercase">Size: {item.size} | Màu: {item.color}</td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">{item.price.toLocaleString("vi-VN")}₫</td>
                    <td className="py-3 text-right">{(item.price * item.quantity).toLocaleString("vi-VN")}₫</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end text-[11px]">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span>{selectedOrder.subtotal.toLocaleString("vi-VN")}₫</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between font-bold text-red-600">
                    <span>Mã giảm giá:</span>
                    <span>-{selectedOrder.discount.toLocaleString("vi-VN")}₫</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm border-t border-black pt-1.5">
                  <span>TỔNG CỘNG:</span>
                  <span>{selectedOrder.total.toLocaleString("vi-VN")}₫</span>
                </div>
              </div>
            </div>

            <div className="mt-16 text-center text-[10px] border-t border-black/10 pt-6">
              <p className="font-bold uppercase tracking-widest">CẢM ƠN QUÝ KHÁCH ĐÃ CHỌN MADMAD STUDIO!</p>
              <p className="text-black/50 mt-1">Mọi thông tin đổi trả sản phẩm vui lòng liên hệ Facebook/Instagram trong vòng 3 ngày.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
