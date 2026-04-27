import { useState } from "react";
import { Eye, Printer, Search, X } from "lucide-react";

import { brandLogo } from "@/assets/images";
import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useOrders } from "@/features/orders/context/order-context";
import type { Order } from "@/types/order";

export function AdminOrdersPage() {
  const { orders, updateOrderStatus } = useOrders();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) || order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="mb-2 text-3xl">Quản Lý Đơn Hàng</h1>
        <p className="text-muted-foreground">Theo dõi và quản lý đơn hàng khách hàng</p>
      </div>

      <div className="rounded-lg border border-border bg-white p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="w-full rounded border border-border py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Tìm kiếm theo mã đơn hàng hoặc tên khách hàng..." />
          </div>
          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="rounded border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">Tất Cả Trạng Thái</option>
            <option value="pending">Chờ Xác Nhận</option>
            <option value="confirmed">Đã Xác Nhận</option>
            <option value="shipping">Đang Giao</option>
            <option value="delivered">Đã Giao</option>
            <option value="cancelled">Đã Hủy</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Mã Đơn Hàng</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Khách Hàng</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Ngày Đặt</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Tổng Tiền</th>
                <th className="px-6 py-3 text-right text-xs uppercase tracking-wider">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-6 py-4 font-medium">{order.orderNumber}</td>
                  <td className="px-6 py-4">{order.customerName}</td>
                  <td className="px-6 py-4">{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td className="px-6 py-4">{order.total.toLocaleString("vi-VN")}₫</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setSelectedOrder(order); setShowOrderDetail(true); }} className="rounded p-2 transition-colors hover:bg-muted"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => { setSelectedOrder(order); window.print(); }} className="rounded p-2 text-blue-600 transition-colors hover:bg-blue-100"><Printer className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white">
            <div className="flex items-center justify-between border-b border-border p-6">
              <div>
                <h2 className="text-2xl">Chi Tiết Đơn Hàng</h2>
                <p className="mt-1 text-sm text-muted-foreground">{selectedOrder.orderNumber}</p>
              </div>
              <button onClick={() => { setShowOrderDetail(false); setSelectedOrder(null); }} className="rounded p-2 transition-colors hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="mb-3">Thông Tin Khách Hàng</h3>
                  <p>{selectedOrder.customerName}</p>
                  <p>{selectedOrder.customerEmail}</p>
                  <p>{selectedOrder.customerPhone}</p>
                </div>
                <div>
                  <h3 className="mb-3">Địa Chỉ Giao Hàng</h3>
                  <p>{selectedOrder.shippingAddress.street}</p>
                  <p>{selectedOrder.shippingAddress.ward}</p>
                  <p>{selectedOrder.shippingAddress.district}</p>
                  <p>{selectedOrder.shippingAddress.province}</p>
                </div>
              </div>
              <div>
                <select value={selectedOrder.status} onChange={(event) => { updateOrderStatus(selectedOrder.id, event.target.value as Order["status"]); setSelectedOrder({ ...selectedOrder, status: event.target.value as Order["status"] }); }} className="rounded border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="pending">Chờ Xác Nhận</option>
                  <option value="confirmed">Đã Xác Nhận</option>
                  <option value="shipping">Đang Giao</option>
                  <option value="delivered">Đã Giao</option>
                  <option value="cancelled">Đã Hủy</option>
                </select>
              </div>
              <div className="space-y-4">
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 rounded-lg border border-border p-4">
                    <div className="h-16 w-16 overflow-hidden rounded bg-muted">
                      <ImageWithFallback src={item.product.image} alt={item.product.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">Size: {item.size} | Màu: {item.color}</p>
                    </div>
                    <p>{(item.price * item.quantity).toLocaleString("vi-VN")}₫</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="hidden print:block">
          <div className="mx-auto max-w-4xl p-8">
            <div className="mb-8 flex items-start justify-between border-b-2 border-gray-300 pb-6">
              <div className="flex items-center gap-4">
                <img src={brandLogo} alt="MADMAD Studio" className="h-20 w-auto" />
                <div>
                  <h1 className="text-3xl font-bold">MADMAD STUDIO</h1>
                  <p>123 Nguyễn Huệ, Quận 1</p>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold">HÓA ĐƠN BÁN HÀNG</h2>
                <p>{selectedOrder.orderNumber}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
