import { useState, useEffect } from "react";
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
  ChevronRight,
  UserCheck,
  Sparkles,
  Award,
  TrendingUp,
  Boxes,
  FileText,
  QrCode,
  Copy,
  Users,
  UserPlus,
  User
} from "lucide-react";

import { brandLogo } from "@/assets/images";
import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useOrders } from "@/features/orders/context/order-context";
import { useProducts } from "@/features/products/context/product-context";
import { useMembership } from "@/features/membership/context/membership-context";
import type { Order, OrderItem } from "@/types/order";
import type { Product } from "@/types/product";

export function AdminOrdersPage() {
  const { orders, updateOrderStatus, addOrder } = useOrders();
  const { products } = useProducts();
  const { members } = useMembership(); // Đọc danh sách tất cả thành viên VIP

  // Local storage state cho danh sách thành viên để đồng bộ thăng hạng realtime
  const [localMembers, setLocalMembers] = useState<any[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("madmad_members");
    if (raw) {
      setLocalMembers(JSON.parse(raw));
    } else {
      setLocalMembers(members);
    }
  }, [members]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterCustomerType, setFilterCustomerType] = useState("all"); // all, vip, returning, first_time

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

  // Internal Packing Note
  const [internalPackingNotes, setInternalPackingNotes] = useState<Record<string, string>>(() => {
    const local = localStorage.getItem("madmad_internal_notes");
    return local ? JSON.parse(local) : {};
  });

  // Visual Product Selector States
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<Product | "">("");
  const [selectedSizeToAdd, setSelectedSizeToAdd] = useState("M");
  const [selectedColorToAdd, setSelectedColorToAdd] = useState("");
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [manualDiscount, setManualDiscount] = useState(0);

  // Items added in manual order
  const [manualItems, setManualItems] = useState<OrderItem[]>([]);

  // Membership VIP Check States
  const [checkedMember, setCheckedMember] = useState<any | null>(null);
  const [vipCheckMessage, setVipCheckMessage] = useState("");

  // Lưu Internal Notes
  const handleSaveInternalNote = (orderId: string, noteText: string) => {
    const nextNotes = { ...internalPackingNotes, [orderId]: noteText };
    setInternalPackingNotes(nextNotes);
    localStorage.setItem("madmad_internal_notes", JSON.stringify(nextNotes));
  };

  // PHÂN LOẠI KHÁCH HÀNG TỰ ĐỘNG (Realtime Customer Category Calculator)
  const getCustomerCategory = (phone: string, email: string) => {
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    const cleanEmail = email.trim().toLowerCase();

    // 1. Kiểm tra xem có phải VIP Thành viên không
    const vip = localMembers.find(
      (m) => m.phone === cleanPhone || m.email.toLowerCase() === cleanEmail
    );
    if (vip) {
      return {
        type: "VIP",
        label: `👑 VIP ${vip.tier}`,
        badgeClass: vip.tier === "PLATINUM" ? "bg-zinc-950 text-zinc-100 border-zinc-800" :
                    vip.tier === "GOLD" ? "bg-amber-600 text-amber-50 border-amber-500" :
                    vip.tier === "SILVER" ? "bg-slate-400 text-slate-900 border-slate-300" :
                    "bg-neutral-800 text-white border-neutral-700",
        vipDetail: vip
      };
    }

    // 2. Kiểm tra xem có phải khách quen vãng lai mua nhiều lần (Returning Guest) không
    const customerOrders = orders.filter(
      (o) => o.customerPhone.trim().replace(/\s+/g, "") === cleanPhone
    );

    if (customerOrders.length > 1) {
      return {
        type: "RETURNING",
        label: `🔄 Khách Quen (${customerOrders.length} đơn)`,
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        orderCount: customerOrders.length,
        totalSpent: customerOrders.reduce((sum, o) => sum + o.total, 0)
      };
    }

    // 3. Người mua lần đầu (First-time Buyer)
    return {
      type: "FIRST_TIME",
      label: "🆕 Mua lần đầu",
      badgeClass: "bg-stone-100 text-stone-600 border-stone-200"
    };
  };

  // TÌM KIẾM & BỘ LỌC DOANH THU & KÊNH & PHÂN LOẠI KHÁCH
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

    // Lọc theo phân loại khách hàng
    let matchesCustomerType = true;
    if (filterCustomerType !== "all") {
      const cat = getCustomerCategory(order.customerPhone, order.customerEmail);
      if (filterCustomerType === "vip") matchesCustomerType = cat.type === "VIP";
      else if (filterCustomerType === "returning") matchesCustomerType = cat.type === "RETURNING";
      else if (filterCustomerType === "first_time") matchesCustomerType = cat.type === "FIRST_TIME";
    }

    return matchesSearch && matchesStatus && matchesSource && matchesCustomerType;
  });

  // TÍNH TOÁN CÁC CHỈ SỐ DOANH THU CHO DASHBOARD
  const totalRevenue = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.total, 0);

  const pendingOrdersCount = orders.filter((o) => o.status === "pending" || o.status === "processing").length;
  const completedOrdersCount = orders.filter((o) => o.status === "completed").length;

  // Tính số lượng đơn theo nguồn
  const getSourceCounts = () => {
    let website = 0;
    let facebook = 0;
    let instagram = 0;
    let zalo = 0;
    let pos = 0;

    orders.forEach((o) => {
      if (o.orderNumber.startsWith("DH-FB")) facebook++;
      else if (o.orderNumber.startsWith("DH-IG")) instagram++;
      else if (o.orderNumber.startsWith("DH-ZALO")) zalo++;
      else if (o.orderNumber.startsWith("DH-POS")) pos++;
      else website++;
    });

    const total = orders.length || 1;
    return {
      website: { count: website, pct: Math.round((website / total) * 100) },
      facebook: { count: facebook, pct: Math.round((facebook / total) * 100) },
      instagram: { count: instagram, pct: Math.round((instagram / total) * 100) },
      zalo: { count: zalo, pct: Math.round((zalo / total) * 100) },
      pos: { count: pos, pct: Math.round((pos / total) * 100) },
    };
  };

  const channelStats = getSourceCounts();

  // Tra cứu sản phẩm
  const filteredProductsToSelect = products.filter((p) => {
    return (
      p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearchQuery.toLowerCase())
    );
  });

  // Nhận diện nguồn
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

  // Tra cứu VIP
  const handleCheckVIPMember = () => {
    setVipCheckMessage("");
    setCheckedMember(null);

    const query = manualCustomerPhone.trim().replace(/\s+/g, "");
    const emailQuery = manualCustomerEmail.trim().toLowerCase();

    if (!query && !emailQuery) {
      setVipCheckMessage("⚠️ Vui lòng nhập Số điện thoại hoặc Email để tra cứu VIP!");
      return;
    }

    const found = localMembers.find(
      (m) =>
        (query && m.phone === query) ||
        (emailQuery && m.email.toLowerCase() === emailQuery)
    );

    if (found) {
      setCheckedMember(found);
      setManualCustomerName(found.fullName);
      if (found.email) setManualCustomerEmail(found.email);
      
      const discountVal = Math.round(manualSubtotal * 0.05);
      setManualDiscount(discountVal);

      setVipCheckMessage(`✓ Khách hàng VIP hạng ${found.tier} (MM Card: ${found.memberCardId}). Tích lũy: ${found.points} điểm. Tự động chiết khấu VIP 5%!`);
    } else {
      setVipCheckMessage("❌ Không tìm thấy thông tin thành viên VIP với SĐT/Email này.");
    }
  };

  const manualSubtotal = manualItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const manualShipping = manualSubtotal > 500000 || manualSource === "pos" ? 0 : 30000;
  const finalDiscount = checkedMember ? Math.round(manualSubtotal * 0.05) : manualDiscount;
  const manualTotal = Math.max(0, manualSubtotal - finalDiscount) + manualShipping;

  const handleAddManualItem = () => {
    if (!selectedProductToAdd) return;
    
    const colors = Object.keys(selectedProductToAdd.colorImages || {});
    const finalColor = selectedColorToAdd || (colors.length > 0 ? colors[0] : "Default");

    const newItem: OrderItem = {
      product: selectedProductToAdd,
      quantity: quantityToAdd,
      size: selectedSizeToAdd,
      color: finalColor,
      price: selectedProductToAdd.price,
    };

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

    setSelectedProductToAdd("");
    setSelectedColorToAdd("");
    setQuantityToAdd(1);
    setProductSearchQuery("");
  };

  // Cập nhật trạng thái đơn hàng & Tự động cộng điểm VIP thăng hạng
  const handleStatusUpdate = (order: Order, newStatus: Order["status"]) => {
    updateOrderStatus(order.id, newStatus);
    setSelectedOrder({ ...order, status: newStatus });

    if (newStatus === "completed") {
      const targetPhone = order.customerPhone.trim().replace(/\s+/g, "");
      const targetEmail = order.customerEmail.trim().toLowerCase();

      let pointsEarned = Math.floor(order.total / 100000);
      if (pointsEarned === 0) pointsEarned = 1;

      const updatedMembersList = localMembers.map((m) => {
        if (m.phone === targetPhone || m.email.toLowerCase() === targetEmail) {
          const nextPoints = m.points + pointsEarned;
          let nextTier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" = "BRONZE";
          if (nextPoints >= 1500) nextTier = "PLATINUM";
          else if (nextPoints >= 800) nextTier = "GOLD";
          else if (nextPoints >= 300) nextTier = "SILVER";

          window.alert(`👑 THÀNH VIÊN THÂN THIẾT! Đã tự động tích lũy thêm +${pointsEarned} điểm VIP cho khách hàng ${m.fullName}. (Tổng tích lũy hiện tại: ${nextPoints}đ - Hạng: ${nextTier})`);

          return {
            ...m,
            points: nextPoints,
            tier: nextTier,
          };
        }
        return m;
      });

      setLocalMembers(updatedMembersList);
      localStorage.setItem("madmad_members", JSON.stringify(updatedMembersList));
    }
  };

  // Tạo đơn thủ công
  const handleCreateManualOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (manualItems.length === 0) {
      window.alert("Vui lòng thêm ít nhất một sản phẩm vào đơn hàng!");
      return;
    }

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
      id: 0,
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
      discount: finalDiscount,
      shipping: manualShipping,
      total: manualTotal,
      paymentMethod: manualPaymentMethod,
      status: manualSource === "pos" ? "completed" : "pending",
      createdAt: new Date().toISOString(),
      notes: manualNotes.trim() || `Đơn hàng tạo thủ công qua kênh ${manualSource.toUpperCase()}${checkedMember ? ` (Thành viên VIP: ${checkedMember.memberCardId})` : ""}`,
    };

    addOrder(newOrder);

    if (manualSource === "pos" && checkedMember) {
      const pointsEarned = Math.max(1, Math.floor(manualTotal / 100000));
      const updatedMembersList = localMembers.map((m) => {
        if (m.phone === checkedMember.phone) {
          const nextPoints = m.points + pointsEarned;
          let nextTier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" = "BRONZE";
          if (nextPoints >= 1500) nextTier = "PLATINUM";
          else if (nextPoints >= 800) nextTier = "GOLD";
          else if (nextPoints >= 300) nextTier = "SILVER";

          return { ...m, points: nextPoints, tier: nextTier };
        }
        return m;
      });
      setLocalMembers(updatedMembersList);
      localStorage.setItem("madmad_members", JSON.stringify(updatedMembersList));
      window.alert(`👑 Đơn hàng POS thành công! Đã tích +${pointsEarned} điểm VIP cho khách hàng.`);
    }

    if (manualNotes) {
      handleSaveInternalNote(newOrderNumber, manualNotes);
    }

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
    setCheckedMember(null);
    setVipCheckMessage("");
    setShowCreateModal(false);

    window.alert("Tạo đơn hàng thủ công thành công!");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-black uppercase">HỆ THỐNG VẬN HÀNH ĐƠN HÀNG</h1>
          <p className="text-xs text-black/50">
            Trung tâm kiểm soát đơn hàng Realtime & Quản lý Loyalty thăng hạng VIP.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-black hover:bg-red-700 text-white px-5 py-3 text-xs font-bold tracking-widest uppercase transition-all shadow-md shadow-black/10"
        >
          <Plus className="h-4 w-4" />
          Tạo Đơn Offline
        </button>
      </div>

      {/* 📊 MINI ANALYTICS DASHBOARD - ĐẲNG CẤP ERP NOIR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Thẻ Doanh Thu */}
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm space-y-2.5">
          <div className="flex justify-between items-center text-black/45">
            <span className="text-[10px] font-extrabold tracking-widest uppercase">Doanh Thu Thực Tế</span>
            <TrendingUp className="h-4.5 w-4.5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-black tracking-tight font-mono">
              {totalRevenue.toLocaleString("vi-VN")}₫
            </p>
            <p className="text-[10px] text-green-700 font-bold mt-1">✓ Chỉ tính đơn giao thành công</p>
          </div>
        </div>

        {/* Thẻ Đơn Chờ Xử Lý */}
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm space-y-2.5">
          <div className="flex justify-between items-center text-black/45">
            <span className="text-[10px] font-extrabold tracking-widest uppercase">Đơn Cần Xử Lý</span>
            <Boxes className="h-4.5 w-4.5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-black tracking-tight font-mono">{pendingOrdersCount} ĐƠN</p>
            <p className="text-[10px] text-amber-700 font-bold mt-1">⚡ Đang chờ xác nhận / đóng hàng</p>
          </div>
        </div>

        {/* Thẻ Đơn Hoàn Tất */}
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm space-y-2.5">
          <div className="flex justify-between items-center text-black/45">
            <span className="text-[10px] font-extrabold tracking-widest uppercase">Đã Hoàn Thành</span>
            <CheckCircle2 className="h-4.5 w-4.5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-black tracking-tight font-mono">{completedOrdersCount} ĐƠN</p>
            <p className="text-[10px] text-black/40 font-semibold mt-1">Tỷ lệ hoàn thành: {Math.round((completedOrdersCount / (orders.length || 1)) * 100)}%</p>
          </div>
        </div>

        {/* Biểu đồ Kênh Bán Hàng Mini */}
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm space-y-2.5">
          <span className="text-[10px] font-extrabold tracking-widest uppercase text-black/45 block">
            Tỉ Lệ Doanh Số Kênh Bán
          </span>
          <div className="space-y-1.5 pt-0.5 font-mono">
            <div className="flex items-center justify-between text-[9px] font-bold text-black/75">
              <span className="flex items-center gap-1 font-sans font-bold"><ShoppingBag className="h-3 w-3" /> WEB</span>
              <span>{channelStats.website.count}đ ({channelStats.website.pct}%)</span>
            </div>
            <div className="flex items-center justify-between text-[9px] font-bold text-blue-700">
              <span className="flex items-center gap-1 font-sans font-bold"><Facebook className="h-3 w-3" /> FB</span>
              <span>{channelStats.facebook.count}đ ({channelStats.facebook.pct}%)</span>
            </div>
            <div className="flex items-center justify-between text-[9px] font-bold text-pink-700">
              <span className="flex items-center gap-1 font-sans font-bold"><Instagram className="h-3 w-3" /> IG</span>
              <span>{channelStats.instagram.count}đ ({channelStats.instagram.pct}%)</span>
            </div>
            <div className="flex items-center justify-between text-[9px] font-bold text-neutral-900">
              <span className="flex items-center gap-1 font-sans font-bold"><Store className="h-3 w-3" /> POS</span>
              <span>{channelStats.pos.count}đ ({channelStats.pos.pct}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm Sleek Noir */}
      <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
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
            {/* 👑 BỘ LỌC PHÂN LOẠI LOYALTY KHÁCH HÀNG */}
            <select
              value={filterCustomerType}
              onChange={(event) => setFilterCustomerType(event.target.value)}
              className="rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs font-bold text-black/70 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all"
            >
              <option value="all">TẤT CẢ PHÂN LOẠI KHÁCH</option>
              <option value="vip">👑 THÀNH VIÊN VIP</option>
              <option value="returning">🔄 KHÁCH QUEN VÃNG LAI</option>
              <option value="first_time">🆕 KHÁCH MUA LẦN ĐẦU</option>
            </select>

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
                  <th className="px-6 py-4">Khách Hàng (Phân Loại)</th>
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
                    <td colSpan={8} className="px-6 py-12 text-center text-black/40 bg-stone-50/50">
                      Không tìm thấy đơn hàng nào tương ứng.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const source = getOrderSourceDetails(order.orderNumber);
                    const SourceIcon = source.icon;
                    
                    // Tính toán Phân loại khách hàng realtime
                    const customerType = getCustomerCategory(order.customerPhone, order.customerEmail);

                    return (
                      <tr key={order.id} className="transition-colors hover:bg-stone-50/50">
                        <td className="px-6 py-4 font-mono font-bold text-black">{order.orderNumber}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] border font-bold uppercase ${source.badgeClass}`}>
                            <SourceIcon className="h-3 w-3" />
                            {source.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 space-y-1">
                          <p className="font-bold text-black text-xs uppercase">{order.customerName}</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase border ${customerType.badgeClass}`}>
                            {customerType.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-black/60">{order.customerPhone}</td>
                        <td className="px-6 py-4 text-black/65 font-mono">
                          {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] border font-bold uppercase ${getStatusBadge(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-extrabold text-black font-mono">
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

      {/* MODAL TẠO ĐƠN HÀNG THỦ CÔNG */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white border border-black/10 shadow-2xl animate-scaleUp">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-black/10 p-6">
              <div>
                <span className="text-[10px] font-bold text-black/45 tracking-wider uppercase">Trung tâm vận hành offline</span>
                <h2 className="text-xl font-black text-black">TẠO ĐƠN HÀNG THỦ CÔNG</h2>
              </div>
              <button
                onClick={() => {
                  setCheckedMember(null);
                  setVipCheckMessage("");
                  setShowCreateModal(false);
                }}
                className="rounded-xl p-2 border border-black/5 hover:border-black/20 hover:bg-stone-50 transition-colors"
              >
                <X className="h-5 w-5 text-black/75" />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrderSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 text-xs font-semibold">
              
              {/* CỘT TRÁI (Lg: 7): Trình chọn sản phẩm hình ảnh */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Chọn sản phẩm thực tế */}
                <div className="border border-black/5 rounded-2xl p-5 bg-stone-50 space-y-4">
                  <h3 className="text-[10px] font-extrabold tracking-widest text-black/50 uppercase border-b border-black/5 pb-2">
                    Chọn sản phẩm (Tìm kiếm trực quan)
                  </h3>

                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold text-black/50">Gõ tên sản phẩm cần tìm</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                      <input
                        type="text"
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        placeholder="Tìm sản phẩm (ví dụ: áo phông, jacket...)"
                        className="w-full rounded-xl border border-black/10 bg-white pl-9 pr-4 py-2.5 text-xs placeholder:text-black/30 focus:border-black/60 focus:outline-none transition-all font-semibold"
                      />
                    </div>

                    {productSearchQuery && (
                      <div className="border border-black/10 bg-white rounded-xl max-h-[180px] overflow-y-auto p-2 space-y-1 z-10 relative">
                        {filteredProductsToSelect.length === 0 ? (
                          <p className="text-center text-[10px] text-black/40 py-4">Không tìm thấy sản phẩm phù hợp.</p>
                        ) : (
                          filteredProductsToSelect.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedProductToAdd(p);
                                const colors = Object.keys(p.colorImages || {});
                                setSelectedColorToAdd(colors.length > 0 ? colors[0] : "Default");
                                setProductSearchQuery("");
                              }}
                              className="w-full flex items-center gap-3 p-2 hover:bg-stone-50 rounded-lg text-left transition-colors border border-transparent hover:border-black/5"
                            >
                              <div className="h-10 w-8 overflow-hidden rounded bg-stone-100 flex-shrink-0">
                                <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-black uppercase truncate text-[11px]">{p.name}</p>
                                <p className="text-[9px] text-black/40 uppercase">{p.category}</p>
                              </div>
                              <span className="font-extrabold text-black text-[11px] font-mono">
                                {p.price.toLocaleString("vi-VN")}₫
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {selectedProductToAdd ? (
                    <div className="border border-black/10 bg-white rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center sm:items-start animate-fadeIn">
                      <div className="h-24 w-20 overflow-hidden rounded-xl bg-stone-100 border border-black/5 flex-shrink-0">
                        <img
                          src={selectedProductToAdd.image}
                          alt={selectedProductToAdd.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1 space-y-3 w-full">
                        <div>
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-black text-white rounded-full uppercase">
                            Đang chọn
                          </span>
                          <h4 className="font-black text-black text-sm uppercase mt-1">
                            {selectedProductToAdd.name}
                          </h4>
                          <p className="text-[10px] text-green-700 font-extrabold mt-0.5 font-mono">
                            Đơn giá: {selectedProductToAdd.price.toLocaleString("vi-VN")}₫
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-black/50 mb-1">Chọn Size</label>
                            <select
                              value={selectedSizeToAdd}
                              onChange={(e) => setSelectedSizeToAdd(e.target.value)}
                              className="w-full rounded-lg border border-black/10 bg-stone-50 px-2.5 py-1.5 focus:border-black/60 focus:bg-white focus:outline-none transition-all text-[11px]"
                            >
                              <option value="S">SIZE S</option>
                              <option value="M">SIZE M</option>
                              <option value="L">SIZE L</option>
                              <option value="XL">SIZE XL</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-black/50 mb-1">Chọn Màu</label>
                            <select
                              value={selectedColorToAdd}
                              onChange={(e) => setSelectedColorToAdd(e.target.value)}
                              className="w-full rounded-lg border border-black/10 bg-stone-50 px-2.5 py-1.5 focus:border-black/60 focus:bg-white focus:outline-none transition-all text-[11px] uppercase"
                            >
                              {Object.keys(selectedProductToAdd.colorImages || {}).length > 0 ? (
                                Object.keys(selectedProductToAdd.colorImages || {}).map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))
                              ) : (
                                <option value="Default">TIÊU CHUẨN</option>
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-black/50 mb-1">Số lượng</label>
                            <input
                              type="number"
                              min={1}
                              value={quantityToAdd}
                              onChange={(e) => setQuantityToAdd(Math.max(1, Number(e.target.value)))}
                              className="w-full rounded-lg border border-black/10 bg-stone-50 px-2 py-1.5 text-center focus:border-black/60 focus:bg-white focus:outline-none transition-all text-[11px]"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setSelectedProductToAdd("")}
                            className="px-4 py-2 border border-black/10 hover:border-black hover:bg-stone-50 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors"
                          >
                            Hủy chọn
                          </button>
                          <button
                            type="button"
                            onClick={handleAddManualItem}
                            className="flex-1 bg-black text-white hover:bg-red-700 font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-colors text-[10px]"
                          >
                            <PlusCircle className="h-4 w-4" />
                            Xác nhận thêm
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-black/15 bg-white rounded-2xl p-6 text-center text-black/45 text-[10px] font-semibold leading-relaxed">
                      💡 Vui lòng gõ tìm kiếm ở ô trên để hiển thị sản phẩm kèm hình ảnh trực quan!
                    </div>
                  )}
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
                    <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-2 font-mono">
                      {manualItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-4 rounded-xl border border-black/5 p-3.5 bg-white hover:shadow-sm transition-all duration-300 font-sans"
                        >
                          <div className="h-12 w-10 overflow-hidden rounded bg-stone-100 border border-black/5 flex-shrink-0 font-mono">
                            <ImageWithFallback
                              src={item.product.image}
                              alt={item.product.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-black uppercase truncate text-xs">{item.product.name}</p>
                            <p className="text-[9px] text-black/45 mt-0.5 uppercase">
                              Size: {item.size} | Màu: {item.color} | SL: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-4 font-mono">
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
                              className="text-stone-400 hover:text-red-600 rounded-lg p-1.5 hover:bg-red-50 transition-all font-sans"
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

              {/* CỘT PHẢI (Lg: 5): Check VIP Membership */}
              <div className="lg:col-span-5 space-y-6 border-t lg:border-t-0 lg:border-l border-black/15 lg:pl-8 pt-6 lg:pt-0">
                
                {/* 👑 KHU VỰC LIVE CHECK VIP MEMBERSHIP */}
                <div className="bg-stone-50 border border-black/10 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-1.5 border-b border-black/5 pb-2">
                    <Award className="h-4.5 w-4.5 text-black" />
                    <h3 className="text-[10px] font-extrabold tracking-widest text-black uppercase">
                      MADMAD VIP CLUB CHECK
                    </h3>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] text-black/50 uppercase">Tra cứu thẻ VIP bằng Số điện thoại hoặc Email</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualCustomerPhone}
                        onChange={(e) => setManualCustomerPhone(e.target.value)}
                        placeholder="Nhập SĐT cần check..."
                        className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs focus:border-black/60 focus:outline-none transition-all font-semibold"
                      />
                      <button
                        type="button"
                        onClick={handleCheckVIPMember}
                        className="bg-black hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider px-4 rounded-xl transition-colors flex items-center gap-1"
                      >
                        <UserCheck className="h-4.5 w-4.5" />
                        Check VIP
                      </button>
                    </div>
                  </div>

                  {vipCheckMessage && (
                    <div className={`p-3 rounded-xl border text-[10px] leading-relaxed font-bold ${
                      checkedMember 
                        ? "bg-green-50/70 border-green-200 text-green-800" 
                        : "bg-red-50/70 border-red-200 text-red-800"
                    }`}>
                      {checkedMember && <Sparkles className="h-3.5 w-3.5 inline mr-1 text-green-700 animate-pulse" />}
                      {vipCheckMessage}
                    </div>
                  )}

                  {checkedMember && (
                    <div className={`rounded-xl p-3 border flex justify-between items-center ${
                      checkedMember.tier === "PLATINUM" ? "bg-zinc-950 text-zinc-100 border-zinc-800" :
                      checkedMember.tier === "GOLD" ? "bg-amber-600 text-amber-50 border-amber-500" :
                      checkedMember.tier === "SILVER" ? "bg-slate-400 text-slate-900 border-slate-300" :
                      "bg-neutral-800 text-white border-neutral-700"
                    }`}>
                      <div>
                        <p className="text-[8px] tracking-wider opacity-60 uppercase">MADMAD BLACK VIP</p>
                        <p className="font-extrabold text-[11px] uppercase mt-0.5">{checkedMember.fullName}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2.5 py-0.5 text-[8px] font-black tracking-widest border border-white/20 bg-white/10 rounded-full uppercase">
                          {checkedMember.tier}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

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
                      value={finalDiscount}
                      disabled={!!checkedMember}
                      onChange={(e) => setManualDiscount(Math.max(0, Number(e.target.value)))}
                      placeholder={checkedMember ? "VIP Auto Apply" : "Số tiền giảm..."}
                      className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-2.5 focus:border-black/60 focus:bg-white transition-all disabled:bg-stone-200 text-stone-500 font-extrabold"
                    />
                  </div>
                </div>

                {/* Ghi chú đơn / Staff Internal Notes */}
                <div>
                  <label className="block text-[10px] font-bold text-black/50 mb-1">Ghi chú đóng hàng (Nội bộ nhân viên)</label>
                  <textarea
                    rows={2}
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="Ghi chú nội bộ: Ví dụ gói hộp quà, tặng sticker, kiểm tra kỹ vải..."
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-2 focus:border-black/60 focus:bg-white transition-all resize-none border-dashed border-red-500/30"
                  />
                </div>

                {/* Tổng kết tiền đơn hàng */}
                <div className="bg-stone-50 rounded-2xl p-5 border border-black/5 space-y-2.5 font-mono">
                  <div className="flex justify-between text-black/55 font-sans font-semibold">
                    <span>Tạm tính ({manualItems.length} SP)</span>
                    <span className="font-bold font-mono">{manualSubtotal.toLocaleString("vi-VN")}₫</span>
                  </div>
                  {finalDiscount > 0 && (
                    <div className="flex justify-between text-red-600 font-sans font-semibold">
                      <span>Giảm giá {checkedMember ? "(VIP 5% Cashback)" : ""}</span>
                      <span className="font-bold font-mono">-{finalDiscount.toLocaleString("vi-VN")}₫</span>
                    </div>
                  )}
                  {manualSource !== "pos" && (
                    <div className="flex justify-between text-black/55 font-sans font-semibold">
                      <span>Phí giao hàng</span>
                      <span className="font-bold font-mono">+{manualShipping.toLocaleString("vi-VN")}₫</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-black text-sm border-t border-black/10 pt-2.5 font-sans">
                    <span>TỔNG ĐƠN HÀNG</span>
                    <span className="font-mono">{manualTotal.toLocaleString("vi-VN")}₫</span>
                  </div>
                </div>

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
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white border border-black/10 shadow-2xl animate-scaleUp">
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
                  <p className="text-xs text-black/50">Cộng điểm tích lũy VIP tự động khi chọn "Thành công"</p>
                </div>
                <select
                  value={selectedOrder.status}
                  onChange={(event) => handleStatusUpdate(selectedOrder, event.target.value as Order["status"])}
                  className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-bold uppercase text-black/70 focus:border-black/60 focus:outline-none focus:ring-0 transition-all"
                >
                  <option value="pending">CHỜ XÁC NHẬN</option>
                  <option value="processing">ĐANG CHUẨN BỊ</option>
                  <option value="shipping">ĐANG GIAO HÀNG</option>
                  <option value="completed">ĐÃ GIAO THÀNH CÔNG</option>
                  <option value="cancelled">ĐÃ HỦY ĐƠN</option>
                </select>
              </div>

              {/* 👑 BẢNG INSIGHT TIÊU DÙNG VÀ TRUNG THÀNH KHÁCH HÀNG (LOYALTY INSIGHT) */}
              <div className="bg-stone-900 text-white rounded-2xl p-5 border border-stone-800 space-y-3.5">
                <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4.5 w-4.5 text-red-500" />
                    <h4 className="font-black tracking-widest text-xs uppercase text-stone-200">
                      MADMAD CUSTOMER LOYALTY INSIGHT
                    </h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase border ${
                    getCustomerCategory(selectedOrder.customerPhone, selectedOrder.customerEmail).badgeClass
                  }`}>
                    {getCustomerCategory(selectedOrder.customerPhone, selectedOrder.customerEmail).label}
                  </span>
                </div>

                {/* Nội dung Phân loại Insight */}
                {(() => {
                  const insight = getCustomerCategory(selectedOrder.customerPhone, selectedOrder.customerEmail);
                  if (insight.type === "VIP" && insight.vipDetail) {
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                        <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800">
                          <p className="text-[8px] opacity-40 uppercase">MM VIP CARD ID</p>
                          <p className="font-extrabold text-white text-[11px] mt-1">{insight.vipDetail.memberCardId}</p>
                        </div>
                        <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800">
                          <p className="text-[8px] opacity-40 uppercase">TIER THẺ THÀNH VIÊN</p>
                          <p className="font-extrabold text-amber-500 text-[11px] mt-1 uppercase">👑 HẠNG {insight.vipDetail.tier}</p>
                        </div>
                        <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800">
                          <p className="text-[8px] opacity-40 uppercase">ĐIỂM VIP HIỆN TẠI</p>
                          <p className="font-extrabold text-green-400 text-[11px] mt-1">{insight.vipDetail.points} ĐIỂM</p>
                        </div>
                      </div>
                    );
                  }
                  if (insight.type === "RETURNING") {
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                        <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800">
                          <p className="text-[8px] opacity-40 uppercase">SỐ ĐƠN ĐÃ ĐẶT (VÃNG LAI)</p>
                          <p className="font-extrabold text-emerald-400 text-[11px] mt-1">{insight.orderCount} ĐƠN HÀNG</p>
                        </div>
                        <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800">
                          <p className="text-[8px] opacity-40 uppercase">TỔNG GIÁ TRỊ CHI TIÊU</p>
                          <p className="font-extrabold text-white text-[11px] mt-1">{(insight.totalSpent || 0).toLocaleString("vi-VN")}₫</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="p-3 bg-stone-950/40 rounded-xl border border-stone-800 flex items-center gap-3">
                      <UserPlus className="h-8 w-8 text-stone-500 flex-shrink-0" />
                      <div className="text-[11px] leading-relaxed text-stone-400 font-semibold">
                        Đây là **Đơn hàng đầu tiên** của khách hàng này tại MADMAD Studio. Hãy gói hàng thật đẹp, gửi kèm thiệp chào mừng và hướng dẫn họ đăng ký thẻ VIP Thành viên để được hoàn tiền 5% cho các đơn hàng tiếp theo nhé!
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* DYNAMIC VIETQR GENERATOR */}
              {(selectedOrder.paymentMethod === "bank" || selectedOrder.paymentMethod === "chuyen_khoan") && (
                <div className="bg-neutral-950 text-white rounded-2xl p-5 border border-neutral-800 flex flex-col md:flex-row gap-6 items-center justify-between shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-[2px] w-full bg-gradient-to-r from-red-600/40 via-white/20 to-red-600/40" />
                  
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-1.5">
                      <QrCode className="h-5 w-5 text-red-500 animate-pulse" />
                      <h4 className="font-black tracking-widest text-xs uppercase text-stone-200">
                        MADMAD AUTOMATIC VIETQR PAY
                      </h4>
                    </div>
                    <p className="text-[11px] text-stone-400 leading-relaxed font-semibold">
                      Hệ thống tự động đồng bộ hóa mã QR chuyển khoản chính xác số tiền đơn hàng. Chụp ảnh gửi cho khách qua Facebook/Instagram để nhận tiền 1 giây!
                    </p>
                    <div className="text-[10px] space-y-1 font-mono text-stone-300 bg-stone-900/50 p-3 rounded-xl border border-stone-800/80">
                      <p>🏦 Ngân hàng: <span className="text-white font-bold">MB BANK (Quân Đội)</span></p>
                      <p>💳 Số tài khoản: <span className="text-white font-bold">0999999999</span></p>
                      <p>👤 Chủ tài khoản: <span className="text-white font-bold">MADMAD STUDIO</span></p>
                      <p>💰 Số tiền: <span className="text-red-400 font-extrabold">{selectedOrder.total.toLocaleString("vi-VN")}₫</span></p>
                      <p>📝 Nội dung: <span className="text-green-400 font-bold uppercase">MADMAD {selectedOrder.orderNumber}</span></p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`0999999999 - MB Bank - MADMAD STUDIO. Chuyển khoản số tiền ${selectedOrder.total.toLocaleString("vi-VN")}đ với nội dung: MADMAD ${selectedOrder.orderNumber}`);
                        window.alert("Đã copy thông tin thanh toán chuyển khoản của khách hàng!");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-[9px] font-black tracking-wider uppercase text-stone-300 rounded-lg transition-all font-mono"
                    >
                      <Copy className="h-3.5 w-3.5 font-sans" />
                      Sao chép text thanh toán
                    </button>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl flex-shrink-0 shadow-xl border border-neutral-800/20 text-center space-y-1.5">
                    <img
                      src={`https://img.vietqr.io/image/MB-0999999999-compact.png?amount=${selectedOrder.total}&addInfo=MADMAD%20${selectedOrder.orderNumber}&accountName=MADMAD%20STUDIO`}
                      alt="VietQR MADMAD"
                      className="h-36 w-36 object-contain"
                    />
                    <span className="text-[8px] font-bold text-stone-500 uppercase tracking-widest block">
                      QUÉT ĐỂ THANH TOÁN
                    </span>
                  </div>
                </div>
              )}

              {/* GHI CHÚ VẬN HÀNH NỘI BỘ (BẢO MẬT NHÂN VIÊN - ẨN KHI IN) */}
              <div className="border border-dashed border-red-500/20 rounded-2xl p-5 bg-red-50/10 space-y-3 print:hidden">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4.5 w-4.5 text-red-600" />
                  <h4 className="text-[10px] font-extrabold tracking-widest text-red-800 uppercase">
                    Ghi Chú Đóng Hàng & Vận Hành Nội Bộ (Bảo Mật Nhân Viên)
                  </h4>
                </div>
                <textarea
                  rows={2}
                  value={internalPackingNotes[selectedOrder.orderNumber] || ""}
                  onChange={(e) => handleSaveInternalNote(selectedOrder.orderNumber, e.target.value)}
                  placeholder="Nhân viên đóng gói điền ghi chú đóng hàng tại đây..."
                  className="w-full rounded-xl border border-red-500/10 bg-white px-4 py-2.5 text-xs placeholder:text-stone-400 focus:border-red-500/40 focus:outline-none transition-all resize-none font-medium leading-relaxed"
                />
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
                    <p><span className="text-black/45">Thanh toán:</span> <span className="uppercase font-bold text-black font-mono">{selectedOrder.paymentMethod}</span></p>
                  </div>
                </div>

                <div className="border border-black/5 rounded-xl p-5 bg-white space-y-3">
                  <h3 className="text-[10px] font-extrabold tracking-widest text-black/50 uppercase border-b border-black/5 pb-2">
                    Địa Chỉ Nhận Hàng
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
                      <div className="text-right font-mono">
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
              <div className="border-t border-black/10 pt-5 flex justify-end font-mono">
                <div className="w-full sm:w-64 space-y-2 text-xs font-sans font-semibold">
                  <div className="flex justify-between text-black/55">
                    <span>Tạm tính</span>
                    <span className="font-mono">{selectedOrder.subtotal.toLocaleString("vi-VN")}₫</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-red-600 font-bold">
                      <span>Mã giảm giá/Khuyến mãi</span>
                      <span className="font-mono">-{selectedOrder.discount.toLocaleString("vi-VN")}₫</span>
                    </div>
                  )}
                  {selectedOrder.shippingAddress.street !== "Mua trực tiếp tại Shop" && (
                    <div className="flex justify-between text-black/55">
                      <span>Phí giao hàng</span>
                      <span className="font-mono">+{selectedOrder.shipping.toLocaleString("vi-VN")}₫</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-black text-sm border-t border-black/5 pt-2">
                    <span>TỔNG TIỀN</span>
                    <span className="font-mono">{selectedOrder.total.toLocaleString("vi-VN")}₫</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🧾 THIẾT KẾ MỚI HÓA ĐƠN ULTRA-MINIMALIST PACKING SLIP (IN ẤN - PRINT ONLY) */}
      {selectedOrder && (
        <div className="hidden print:block">
          <div className="mx-auto max-w-4xl p-10 text-black bg-white" style={{ fontFamily: "monospace", fontSize: "11px" }}>
            
            {/* Header */}
            <div className="text-center space-y-2 mb-8 pb-6 border-b-2 border-dashed border-black">
              <div className="flex items-center justify-between">
                <img src={brandLogo} alt="MADMAD Studio" className="h-14 w-auto" />
                <div className="text-right font-mono">
                  <h1 className="text-lg font-black tracking-widest font-sans">MADMAD STUDIO</h1>
                  <p className="text-[9px] uppercase tracking-wider text-black/60 font-sans">Tối giản . Độc bản . Cao cấp</p>
                  <p className="text-[9px] text-black/60">Showroom: 254 Nguyễn Trãi, Q.5, TP.HCM</p>
                  <p className="text-[9px] text-black/60">Hotline: 099.999.9999</p>
                </div>
              </div>
            </div>

            {/* Tiêu đề chính */}
            <div className="text-center space-y-1 mb-8">
              <h2 className="text-base font-black tracking-widest uppercase">HÓA ĐƠN VẬN CHUYỂN & GÓI HÀNG</h2>
              <p className="text-xs font-mono font-bold tracking-wider">{selectedOrder.orderNumber}</p>
              <p className="text-[9px] text-black/50">Ngày in: {new Date().toLocaleDateString("vi-VN")} - {new Date().toLocaleTimeString("vi-VN")}</p>
            </div>

            {/* Thông tin 2 cột */}
            <div className="grid grid-cols-2 gap-8 mb-8 pb-6 border-b border-black">
              <div>
                <h3 className="font-black border-b border-black pb-1 mb-3 uppercase tracking-wider">Thông tin người nhận</h3>
                <div className="space-y-1">
                  <p>Họ tên: <span className="font-bold uppercase">{selectedOrder.customerName}</span></p>
                  <p>Điện thoại: <span className="font-bold">{selectedOrder.customerPhone}</span></p>
                  <p>Email: {selectedOrder.customerEmail}</p>
                  <p>Phương thức: <span className="uppercase font-bold">{selectedOrder.paymentMethod}</span></p>
                  <p>Khách hàng: <span className="font-bold uppercase">{getCustomerCategory(selectedOrder.customerPhone, selectedOrder.customerEmail).label}</span></p>
                </div>
              </div>
              <div>
                <h3 className="font-black border-b border-black pb-1 mb-3 uppercase tracking-wider">Địa chỉ giao hàng</h3>
                <div className="space-y-1 leading-relaxed">
                  {selectedOrder.shippingAddress.street === "Mua trực tiếp tại Shop" ? (
                    <p className="font-bold">⚡ ĐƠN MUA TRỰC TIẾP TẠI CỬA HÀNG (POS)</p>
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
            </div>

            {/* Bảng sản phẩm */}
            <table className="w-full text-left text-[11px] border-collapse mb-8 font-mono">
              <thead>
                <tr className="border-b-2 border-black font-black uppercase text-black font-sans">
                  <th className="py-2.5">Sản phẩm</th>
                  <th className="py-2.5">Phân loại</th>
                  <th className="py-2.5 text-center">SL</th>
                  <th className="py-2.5 text-right">Đơn giá</th>
                  <th className="py-2.5 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((item, index) => (
                  <tr key={index} className="border-b border-black/10">
                    <td className="py-3 uppercase font-bold font-sans">{item.product.name}</td>
                    <td className="py-3 uppercase text-black/70">Size: {item.size} | Màu: {item.color}</td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">{item.price.toLocaleString("vi-VN")}₫</td>
                    <td className="py-3 text-right font-bold">{(item.price * item.quantity).toLocaleString("vi-VN")}₫</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Chi phí & Quét mã QR */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-8 pb-6 border-b border-black font-mono">
              <div className="md:col-span-6 flex items-center gap-4 border border-black/10 rounded-xl p-3.5 bg-stone-50 font-sans">
                <div className="bg-white p-1 rounded border border-black/5 flex-shrink-0">
                  <img
                    src={`https://img.vietqr.io/image/MB-0999999999-compact.png?amount=${selectedOrder.total}&addInfo=MADMAD%20${selectedOrder.orderNumber}&accountName=MADMAD%20STUDIO`}
                    alt="VietQR MADMAD"
                    className="h-20 w-20 object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-[10px] tracking-wider uppercase flex items-center gap-1">
                    <QrCode className="h-3.5 w-3.5" />
                    QUÉT THANH TOÁN
                  </p>
                  <p className="text-[8px] leading-relaxed text-black/60 font-semibold">
                    Dùng app Ngân hàng để quét chuyển khoản tự động chính xác số tiền & nội dung đơn hàng này.
                  </p>
                </div>
              </div>

              <div className="md:col-span-6 flex justify-end text-[11px]">
                <div className="w-full space-y-2 font-sans font-semibold">
                  <div className="flex justify-between text-black/70">
                    <span>Tạm tính:</span>
                    <span className="font-mono">{selectedOrder.subtotal.toLocaleString("vi-VN")}₫</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between font-bold text-red-600">
                      <span>Giảm giá/Khuyến mãi:</span>
                      <span className="font-mono">-{selectedOrder.discount.toLocaleString("vi-VN")}₫</span>
                    </div>
                  )}
                  {selectedOrder.shippingAddress.street !== "Mua trực tiếp tại Shop" && (
                    <div className="flex justify-between text-black/70">
                      <span>Phí giao hàng:</span>
                      <span className="font-mono">+{selectedOrder.shipping.toLocaleString("vi-VN")}₫</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm border-t-2 border-black pt-2">
                    <span>TỔNG CỘNG TIỀN:</span>
                    <span className="font-mono">{selectedOrder.total.toLocaleString("vi-VN")}₫</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Slogan */}
            <div className="text-center space-y-2 mt-8">
              <p className="font-black uppercase tracking-widest text-[10px] font-sans">CẢM ƠN QUÝ KHÁCH ĐÃ CHỌN MADMAD STUDIO!</p>
              <p className="text-black/50 text-[9px] leading-relaxed max-w-lg mx-auto font-sans">
                * Quý khách vui lòng kiểm tra kỹ sản phẩm khi nhận hàng. Đối với các yêu cầu đổi trả sản phẩm nguyên tag mác, xin hãy nhắn tin trực tiếp fanpage Facebook/Instagram của MADMAD Studio trong vòng 3 ngày kể từ ngày nhận hàng.
              </p>
              <div className="pt-4 text-black/25 text-[8px] font-mono tracking-widest">
                MADMAD STUDIO - NOIR NO DESIGN STANDARD
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
