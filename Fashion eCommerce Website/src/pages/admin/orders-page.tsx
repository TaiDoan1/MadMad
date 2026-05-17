import { useState } from "react";
import {
  Eye,
  Printer,
  Search,
  X,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  RefreshCw,
  ShoppingBag,
  Facebook,
  Instagram,
  Store,
  MessageSquare,
  Tag,
  PlusCircle,
  ChevronRight
} from "lucide-react";

import { brandLogo } from "@/assets/images";
import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useOrders } from "@/features/orders/context/order-context";
import { useProducts } from "@/features/products/context/product-context";
import type { Order, OrderItem } from "@/types/order";
import type { Product } from "@/types/product";

export function AdminOrdersPage() {
  const { orders, updateOrderStatus, addOrder } = useOrders();
  const { products } = useProducts();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");

  // Selected order details modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  // Manual Order Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [manualCustomerPhone, setManualCustomerPhone] = useState("");
  const [manualCustomerEmail, setManualCustomerEmail] = useState("");
  const [manualSource, setManualSource] = useState("facebook"); // facebook, instagram, zalo, pos
  const [manualNotes, setManualNotes] = useState("");
  const [manualPaymentMethod, setManualPaymentMethod] = useState("cod");

  // Manual Address
  const [manualStreet, setManualStreet] = useState("");
  const [manualWard, setManualWard] = useState("");
  const [manualDistrict, setManualDistrict] = useState("");
  const [manualProvince, setManualProvince] = useState("");

  // Items added in manual order
  const [manualItems, setManualItems] = useState<OrderItem[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<Product | "">("");
  const [selectedSizeToAdd, setSelectedSizeToAdd] = useState("M");
  const [selectedColorToAdd, setSelectedColorToAdd] = useState("");
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [manualDiscount, setManualDiscount] = useState(0);

  // Lọc tìm kiếm đơn hàng theo mã đơn, tên, sđt và nguồn đơn hàng
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone.includes(searchTerm);
    const matchesStatus = filterStatus === "all" || order.status === filterStatus;

    // Lọc theo nguồn đơn
    let matchesSource = true;
    if (filterSource !== "all") {
      const isFb = order.orderNumber.startsWith("DH-FB");
      const isIg = order.orderNumber.startsWith("DH-IG");
      const isZalo = order.orderNumber.startsWith("DH-ZALO");
      const isPos = order.orderNumber.startsWith("DH-POS");
      const isWeb = !isFb && !isIg && !isZalo && !isPos;

      if (filterSource === "facebook") matchesSource = isFb;
      else if (filterSource === "instagram") matchesSource = isIg;
      else if (filterSource === "zalo") matchesSource = isZalo;
      else if (filterSource === "pos") matchesSource = isPos;
      else if (filterSource === "website") matchesSource = isWeb;
    }

    return matchesSearch && matchesStatus && matchesSource;
  });

  // Nhận diện nguồn từ Mã đơn hàng
  const getOrderSourceDetails = (orderNumber: string) => {
    if (orderNumber.startsWith("DH-FB")) {
      return { label: "Facebook", badgeClass: "bg-blue-50 text-blue-700 border-blue-200", icon: Facebook };
    }
    if (orderNumber.startsWith("DH-IG")) {
      return { label: "Instagram", badgeClass: "bg-pink-50 text-pink-700 border-pink-200", icon: Instagram };
    }
    if (orderNumber.startsWith("DH-ZALO")) {
      return { label: "Zalo", badgeClass: "bg-sky-50 text-sky-700 border-sky-200", icon: MessageSquare };
    }
    if (orderNumber.startsWith("DH-POS")) {
      return { label: "Cửa hàng (POS)", badgeClass: "bg-neutral-900 text-white border-neutral-800", icon: Store };
    }
    return { label: "Website", badgeClass: "bg-stone-100 text-stone-600 border-stone-200", icon: ShoppingBag };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 text-green-700 border-green-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      case "shipping":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
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

  // Tính toán tiền cho đơn thủ công đang tạo
  const manualSubtotal = manualItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const manualShipping = manualSubtotal > 500000 || manualSource === "pos" ? 0 : 30000;
  const manualTotal = Math.max(0, manualSubtotal - manualDiscount) + manualShipping;

  // Thêm sản phẩm vào giỏ hàng đơn thủ công
  const handleAddManualItem = () => {
    if (!selectedProductToAdd) {
      window.alert("Vui lòng chọn một sản phẩm!");
      return;
    }
    
    // Kiểm tra nếu sản phẩm có màu sắc mà chưa chọn màu
    const colors = Object.keys(selectedProductToAdd.colorImages || {});
    const finalColor = selectedColorToAdd || (colors.length > 0 ? colors[0] : "Default");

    const newItem: OrderItem = {
      product: selectedProductToAdd,
      quantity: quantityToAdd,
      size: selectedSizeToAdd,
      color: finalColor,
      price: selectedProductToAdd.price,
    };

    // Kiểm tra trùng lắp thuộc tính trong đơn hàng đang tạo
    const existingIndex = manualItems.findIndex(
      (item) =>
        item.product.id === newItem.product.id &&
        item.size === newItem.size &&
        item.color === newItem.color
    );

    if (existingIndex > -1) {
      const updated = [...manualItems];
      updated[existingIndex].quantity += newItem.quantity;
      setManualItems(updated);
    } else {
      setManualItems([...manualItems, newItem]);
    }

    // Reset bộ chọn sản phẩm
    setSelectedProductToAdd("");
    setSelectedColorToAdd("");
    setQuantityToAdd(1);
  };

  // Tạo đơn hàng thủ công hoàn tất
  const handleCreateManualOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (manualItems.length === 0) {
      window.alert("Vui lòng thêm ít nhất một sản phẩm vào đơn hàng!");
      return;
    }

    // Tạo mã đơn hàng độc quyền dựa trên nguồn đơn
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    let orderPrefix = "DH";
    if (manualSource === "facebook") orderPrefix = "DH-FB";
    else if (manualSource === "instagram") orderPrefix = "DH-IG";
    else if (manualSource === "zalo") orderPrefix = "DH-ZALO";
    else if (manualSource === "pos") orderPrefix = "DH-POS";

    const newOrderNumber = `${orderPrefix}${new Date().getFullYear().toString().slice(-2)}${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${randomNum}`;

    const newOrder: Order = {
      id: 0, // Sẽ được sinh tự động bởi OrderProvider
      orderNumber: newOrderNumber,
      customerName: manualCustomerName.trim(),
      customerPhone: manualCustomerPhone.trim(),
      customerEmail: manualCustomerEmail.trim() || `${manualCustomerPhone}@madmad-offline.vn`,
      shippingAddress: {
        street: manualStreet.trim() || "Mua trực tiếp tại Shop",
        ward: manualWard.trim() || "",
        district: manualDistrict.trim() || "",
        province: manualProvince.trim() || "",
      },
      items: manualItems,
      subtotal: manualSubtotal,
      discount: manualDiscount,
      shipping: manualShipping,
      total: manualTotal,
      paymentMethod: manualPaymentMethod,
      status: manualSource === "pos" ? "delivered" : "pending", // Đơn tại quầy POS mặc định là Thành công luôn
      createdAt: new Date().toISOString(),
      notes: manualNotes.trim() || `Đơn hàng tạo thủ công qua kênh ${manualSource.toUpperCase()}`,
    };

    addOrder(newOrder);

    // Reset toàn bộ form
    setManualCustomerName("");
    setManualCustomerPhone("");
    setManualCustomerEmail("");
    setManualSource("facebook");
    setManualNotes("");
    setManualStreet("");
    setManualWard("");
    setManualDistrict("");
    setManualProvince("");
    setManualItems([]);
    setManualDiscount(0);
    setManualPaymentMethod("cod");
    setShowCreateModal(false);

    window.alert("Tạo đơn hàng thủ công thành công!");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-black uppercase">QUẢN LÝ ĐƠN HÀNG</h1>
          <p className="text-xs text-black/50">
            Duyệt đơn tự động từ Web và Tạo hóa đơn thủ công từ Facebook, Instagram, Zalo, POS.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-black hover:bg-red-700 text-white px-5 py-3 text-xs font-bold tracking-widest uppercase transition-all shadow-md shadow-black/10"
        >
          <Plus className="h-4 w-4" />
          Tạo Đơn Hủy / Thủ Công
        </button>
      </div>

      {/* Bộ lọc & Tìm kiếm Sleek Noir */}
      <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Tìm kiếm */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-black/10 bg-stone-50 pl-10 pr-4 py-3 text-xs placeholder:text-black/30 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all font-semibold"
              placeholder="Tìm theo Mã đơn hàng, Tên hoặc Số điện thoại khách..."
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Lọc nguồn đơn */}
            <select
              value={filterSource}
              onChange={(event) => setFilterSource(event.target.value)}
              className="rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs font-bold text-black/70 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all"
            >
              <option value="all">TẤT CẢ NGUỒN ĐƠN</option>
              <option value="website">WEBSITE</option>
              <option value="facebook">FACEBOOK</option>
              <option value="instagram">INSTAGRAM</option>
              <option value="zalo">ZALO</option>
              <option value="pos">CỬA HÀNG (POS)</option>
            </select>

            {/* Lọc trạng thái */}
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
        </div>

        {/* Danh sách đơn hàng dạng bảng Noir */}
        <div className="overflow-hidden border border-black/5 rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-black/10 font-bold uppercase tracking-wider text-black/60">
                  <th className="px-6 py-4">Mã Đơn Hàng</th>
                  <th className="px-6 py-4">Nguồn</th>
                  <th className="px-6 py-4">Khách Hàng</th>
                  <th className="px-6 py-4">SĐT</th>
                  <th className="px-6 py-4">Ngày Đặt</th>
                  <th className="px-6 py-4 text-center">Trạng Thế</th>
                  <th className="px-6 py-4 text-right">Tổng Tiền</th>
                  <th className="px-6 py-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 font-semibold text-black/85">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-black/40 bg-stone-50/50">
                      Không tìm thấy đơn hàng nào tương ứng.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const source = getOrderSourceDetails(order.orderNumber);
                    const SourceIcon = source.icon;

                    return (
                      <tr key={order.id} className="transition-colors hover:bg-stone-50/50">
                        <td className="px-6 py-4 font-mono font-bold text-black">{order.orderNumber}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] border font-bold uppercase ${source.badgeClass}`}>
                            <SourceIcon className="h-3 w-3" />
                            {source.label}
                          </span>
                        </td>
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL TẠO ĐƠN HÀNG THỦ CÔNG (OFFLINE ORDER CREATOR) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white border border-black/10 shadow-2xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-black/10 p-6">
              <div>
                <span className="text-[10px] font-bold text-black/45 tracking-wider uppercase">Trung tâm vận hành offline</span>
                <h2 className="text-xl font-black text-black">TẠO ĐƠN HÀNG THỦ CÔNG</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl p-2 border border-black/5 hover:border-black/20 hover:bg-stone-50 transition-colors"
              >
                <X className="h-5 w-5 text-black/75" />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrderSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 text-xs font-semibold">
              
              {/* CỘT TRÁI (Lg: 7): Nhập sản phẩm & Giỏ hàng */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Chọn sản phẩm thực tế */}
                <div className="border border-black/5 rounded-2xl p-5 bg-stone-50 space-y-4">
                  <h3 className="text-[10px] font-extrabold tracking-widest text-black/50 uppercase border-b border-black/5 pb-2">
                    Chọn sản phẩm từ kho hàng
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-black/50 mb-1.5">Tên sản phẩm</label>
                      <select
                        value={selectedProductToAdd === "" ? "" : selectedProductToAdd.id}
                        onChange={(e) => {
                          const prod = products.find((p) => p.id === Number(e.target.value));
                          setSelectedProductToAdd(prod || "");
                          // Tự động set màu đầu tiên
                          if (prod) {
                            const colors = Object.keys(prod.colorImages || {});
                            setSelectedColorToAdd(colors.length > 0 ? colors[0] : "Default");
                          }
                        }}
                        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 focus:border-black/60 focus:outline-none transition-all uppercase"
                      >
                        <option value="">-- CHỌN SẢN PHẨM --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.price.toLocaleString("vi-VN")}₫)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-black/50 mb-1.5">Chọn Size</label>
                      <select
                        value={selectedSizeToAdd}
                        onChange={(e) => setSelectedSizeToAdd(e.target.value)}
                        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 focus:border-black/60 focus:outline-none transition-all"
                      >
                        <option value="S">SIZE S</option>
                        <option value="M">SIZE M</option>
                        <option value="L">SIZE L</option>
                        <option value="XL">SIZE XL</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-black/50 mb-1.5">Màu sắc</label>
                      <select
                        value={selectedColorToAdd}
                        onChange={(e) => setSelectedColorToAdd(e.target.value)}
                        disabled={!selectedProductToAdd}
                        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 focus:border-black/60 focus:outline-none transition-all uppercase"
                      >
                        {selectedProductToAdd &&
                        Object.keys(selectedProductToAdd.colorImages || {}).length > 0 ? (
                          Object.keys(selectedProductToAdd.colorImages || {}).map((c) => (
                            <option key={c} value={c}>
                              MÀU {c.toUpperCase()}
                            </option>
                          ))
                        ) : (
                          <option value="Default">MÀU TIÊU CHUẨN</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-black/50 mb-1.5">Số lượng</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          value={quantityToAdd}
                          onChange={(e) => setQuantityToAdd(Math.max(1, Number(e.target.value)))}
                          className="w-20 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-center focus:border-black/60 focus:outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={handleAddManualItem}
                          disabled={!selectedProductToAdd}
                          className="flex-1 bg-black text-white hover:bg-red-700 disabled:bg-stone-300 disabled:hover:bg-stone-300 font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Thêm vào đơn
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Giỏ hàng đơn thủ công */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-extrabold tracking-widest text-black/50 uppercase">
                    Danh sách sản phẩm đã thêm ({manualItems.length})
                  </h3>
                  
                  {manualItems.length === 0 ? (
                    <div className="border border-dashed border-black/15 rounded-2xl p-8 text-center text-black/35 bg-white">
                      Chưa có sản phẩm nào được chọn cho đơn hàng này.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-2">
                      {manualItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-4 rounded-xl border border-black/5 p-3.5 bg-white hover:shadow-sm transition-all duration-300"
                        >
                          <div className="h-12 w-10 overflow-hidden rounded bg-stone-100 border border-black/5 flex-shrink-0">
                            <ImageWithFallback
                              src={item.product.image}
                              alt={item.product.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-black uppercase truncate">{item.product.name}</p>
                            <p className="text-[9px] text-black/45 mt-0.5 uppercase">
                              Size: {item.size} | Màu: {item.color} | SL: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div>
                              <p className="font-extrabold text-black">
                                {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setManualItems(manualItems.filter((_, i) => i !== index));
                              }}
                              className="text-stone-400 hover:text-red-600 rounded-lg p-1.5 hover:bg-red-50 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* CỘT PHẢI (Lg: 5): Thông tin khách hàng & Nguồn đơn */}
              <div className="lg:col-span-5 space-y-6 border-t lg:border-t-0 lg:border-l border-black/15 lg:pl-8 pt-6 lg:pt-0">
                <h3 className="text-[10px] font-extrabold tracking-widest text-black/50 uppercase border-b border-black/5 pb-2">
                  Thông Tin Hóa Đơn & Khách Hàng
                </h3>

                {/* Chọn Nguồn Đơn Hàng */}
                <div>
                  <label className="block text-[10px] font-bold text-black/50 mb-1.5">Nguồn Đơn Hàng (Kênh Bán)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "facebook", label: "Facebook", icon: Facebook },
                      { value: "instagram", label: "Instagram", icon: Instagram },
                      { value: "zalo", label: "Zalo", icon: MessageSquare },
                      { value: "pos", label: "Tại Quầy (POS)", icon: Store },
                    ].map((s) => {
                      const Icon = s.icon;
                      const active = manualSource === s.value;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setManualSource(s.value)}
                          className={`flex items-center gap-2 border px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${
                            active
                              ? "border-black bg-black text-white"
                              : "border-black/10 hover:border-black text-black/70"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Thông tin liên hệ */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-black/50 mb-1">Họ và Tên Khách Hàng</label>
                    <input
                      type="text"
                      required
                      value={manualCustomerName}
                      onChange={(e) => setManualCustomerName(e.target.value)}
                      placeholder="VÍ DỤ: LÊ VĂN B"
                      className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-2.5 focus:border-black/60 focus:bg-white transition-all uppercase font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-black/50 mb-1">Số Điện Thoại</label>
                      <input
                        type="tel"
                        required
                        value={manualCustomerPhone}
                        onChange={(e) => setManualCustomerPhone(e.target.value)}
                        placeholder="09XXXXXXXX"
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-2.5 focus:border-black/60 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-black/50 mb-1">Email (Không bắt buộc)</label>
                      <input
                        type="email"
                        value={manualCustomerEmail}
                        onChange={(e) => setManualCustomerEmail(e.target.value)}
                        placeholder="khachhang@gmail.com"
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-2.5 focus:border-black/60 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Địa chỉ giao hàng - Ẩn nếu là bán tại quầy POS */}
                {manualSource !== "pos" ? (
                  <div className="space-y-3 bg-stone-50/50 p-4 rounded-2xl border border-black/5">
                    <p className="text-[10px] font-extrabold tracking-wider text-black/50 uppercase mb-1">
                      Địa Chỉ Nhận Hàng (Giao Ship)
                    </p>
                    <input
                      type="text"
                      required
                      value={manualStreet}
                      onChange={(e) => setManualStreet(e.target.value)}
                      placeholder="Số nhà, Tên đường..."
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 focus:border-black/60 transition-all text-xs"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        value={manualWard}
                        onChange={(e) => setManualWard(e.target.value)}
                        placeholder="Phường/Xã"
                        className="w-full rounded-xl border border-black/10 bg-white px-2 py-2 focus:border-black/60 transition-all text-xs"
                      />
                      <input
                        type="text"
                        required
                        value={manualDistrict}
                        onChange={(e) => setManualDistrict(e.target.value)}
                        placeholder="Quận/Huyện"
                        className="w-full rounded-xl border border-black/10 bg-white px-2 py-2 focus:border-black/60 transition-all text-xs"
                      />
                      <input
                        type="text"
                        required
                        value={manualProvince}
                        onChange={(e) => setManualProvince(e.target.value)}
                        placeholder="Tỉnh/Thành"
                        className="w-full rounded-xl border border-black/10 bg-white px-2 py-2 focus:border-black/60 transition-all text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-stone-50 border border-black/5 p-4 rounded-xl text-center text-stone-500 text-[11px] font-semibold">
                    ⚡ Đơn bán tại quầy (POS) sẽ giao hàng trực tiếp cho khách tại cửa hàng.
                  </div>
                )}

                {/* Thanh toán & Giảm giá */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-black/50 mb-1">Thanh toán</label>
                    <select
                      value={manualPaymentMethod}
                      onChange={(e) => setManualPaymentMethod(e.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2.5 focus:border-black/60 focus:bg-white transition-all uppercase"
                    >
                      <option value="cod">COD (Khi nhận)</option>
                      <option value="bank">Chuyển khoản</option>
                      <option value="cash">Tiền mặt (POS)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-black/50 mb-1 flex items-center gap-1">
                      <Tag className="h-3 w-3 text-red-600" />
                      Giảm giá trực tiếp (₫)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={manualDiscount}
                      onChange={(e) => setManualDiscount(Math.max(0, Number(e.target.value)))}
                      placeholder="Số tiền giảm..."
                      className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-2.5 focus:border-black/60 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Ghi chú đơn */}
                <div>
                  <label className="block text-[10px] font-bold text-black/50 mb-1">Ghi chú (Tùy chọn)</label>
                  <textarea
                    rows={2}
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="Ghi chú đơn hàng..."
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-2 focus:border-black/60 focus:bg-white transition-all resize-none"
                  />
                </div>

                {/* Tổng kết tiền đơn hàng thủ công */}
                <div className="bg-stone-50 rounded-2xl p-5 border border-black/5 space-y-2.5">
                  <div className="flex justify-between text-black/55">
                    <span>Tạm tính ({manualItems.length} SP)</span>
                    <span className="font-bold">{manualSubtotal.toLocaleString("vi-VN")}₫</span>
                  </div>
                  {manualDiscount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Giảm giá</span>
                      <span className="font-bold">-{manualDiscount.toLocaleString("vi-VN")}₫</span>
                    </div>
                  )}
                  {manualSource !== "pos" && (
                    <div className="flex justify-between text-black/55">
                      <span>Phí giao hàng</span>
                      <span className="font-bold">+{manualShipping.toLocaleString("vi-VN")}₫</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-black text-sm border-t border-black/10 pt-2.5">
                    <span>TỔNG ĐƠN HÀNG</span>
                    <span>{manualTotal.toLocaleString("vi-VN")}₫</span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-red-700 h-12 text-xs font-bold tracking-widest uppercase transition-all rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-black/25"
                >
                  <Check className="h-4.5 w-4.5" />
                  Kích hoạt & Tạo hóa đơn
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT ĐƠN HÀNG & DUYỆT TRẠNG THÁI */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white border border-black/10 shadow-2xl">
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
                    Địa Chi Nhận Hàng
                  </h3>
                  <div className="space-y-1.5 leading-relaxed">
                    {selectedOrder.shippingAddress.street === "Mua trực tiếp tại Shop" ? (
                      <p className="font-bold text-black">⚡ ĐƠN MUA TRỰC TIẾP TẠI CỬA HÀNG (POS)</p>
                    ) : (
                      <>
                        <p><span className="text-black/45">Địa chỉ cụ thể:</span> {selectedOrder.shippingAddress.street}</p>
                        {selectedOrder.shippingAddress.ward && <p><span className="text-black/45">Phường / Xã:</span> {selectedOrder.shippingAddress.ward}</p>}
                        {selectedOrder.shippingAddress.district && <p><span className="text-black/45">Quận / Huyện:</span> {selectedOrder.shippingAddress.district}</p>}
                        {selectedOrder.shippingAddress.province && <p><span className="text-black/45">Tỉnh / Thành:</span> {selectedOrder.shippingAddress.province}</p>}
                      </>
                    )}
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
                      <span>Mã giảm giá/Khuyến mãi</span>
                      <span>-{selectedOrder.discount.toLocaleString("vi-VN")}₫</span>
                    </div>
                  )}
                  {selectedOrder.shippingAddress.street !== "Mua trực tiếp tại Shop" && (
                    <div className="flex justify-between text-black/55">
                      <span>Phí giao hàng</span>
                      <span>+{selectedOrder.shipping.toLocaleString("vi-VN")}₫</span>
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
                {selectedOrder.shippingAddress.street === "Mua trực tiếp tại Shop" ? (
                  <p className="font-bold">⚡ MUA TRỰC TIẾP TẠI CỬA HÀNG (POS)</p>
                ) : (
                  <>
                    <p>{selectedOrder.shippingAddress.street}</p>
                    <p>{selectedOrder.shippingAddress.ward}</p>
                    <p>{selectedOrder.shippingAddress.district}</p>
                    <p>{selectedOrder.shippingAddress.province}</p>
                  </>
                )}
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
                    <span>Giảm giá/Khuyến mãi:</span>
                    <span>-{selectedOrder.discount.toLocaleString("vi-VN")}₫</span>
                  </div>
                )}
                {selectedOrder.shippingAddress.street !== "Mua trực tiếp tại Shop" && (
                  <div className="flex justify-between">
                    <span>Phí ship:</span>
                    <span>+{selectedOrder.shipping.toLocaleString("vi-VN")}₫</span>
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
