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
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";
import type { Order, OrderItem } from "@/types/order";
import type { Product } from "@/types/product";

export function AdminOrdersPage() {
  const { settings } = useStorefrontSettings();
  const { orders, updateOrderStatus, updateOrderPaymentStatus, addOrder } = useOrders();
  const { products } = useProducts();
  const { members, tierConfigs, setMembers } = useMembership(); // Đọc danh sách tất cả thành viên VIP

  const handleTogglePaid = (order: Order, isPaid: boolean) => {
    updateOrderPaymentStatus(order.id, isPaid);
    setSelectedOrder({ ...order, isPaid });
  };

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
  const [filterShippingMethod, setFilterShippingMethod] = useState("all"); // all, standard, express

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Reset trang về 1 khi đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterSource, filterCustomerType, filterShippingMethod]);

  // Manual Shipping Method State
  const [manualShippingMethod, setManualShippingMethod] = useState<"standard" | "express">("standard");

  // Selected order details modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  // Batch Printing States
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [batchPrintOrders, setBatchPrintOrders] = useState<Order[]>([]);
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);

  const handleBatchPrint = async () => {
    if (selectedOrderIds.length === 0) {
      window.alert("Vui lòng chọn ít nhất 1 đơn hàng để in.");
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn in ${selectedOrderIds.length} đơn hàng đã chọn và tự động chuyển trạng thái sang "Đang chuẩn bị"?`)) {
      setIsBatchPrinting(true);
      const ordersToPrint = orders.filter((o) => selectedOrderIds.includes(o.id));
      setBatchPrintOrders(ordersToPrint);
      setSelectedOrder(null);

      for (const id of selectedOrderIds) {
        const order = orders.find((o) => o.id === id);
        if (order && order.status === "pending") {
          await updateOrderStatus(id, "processing");
        }
      }

      setTimeout(() => {
        window.print();
        setIsBatchPrinting(false);
        setBatchPrintOrders([]);
        setSelectedOrderIds([]);
      }, 500);
    }
  };

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
        label: `VIP ${vip.tier}`,
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
        label: `KHÁCH QUEN (${customerOrders.length} ĐƠN)`,
        badgeClass: "bg-stone-900 text-stone-100 border-stone-800",
        orderCount: customerOrders.length,
        totalSpent: customerOrders.reduce((sum, o) => sum + o.total, 0)
      };
    }

    // 3. Người mua lần đầu (First-time Buyer)
    return {
      type: "FIRST_TIME",
      label: "MUA LẦN ĐẦU",
      badgeClass: "bg-stone-100 text-stone-600 border-stone-200"
    };
  };

  // TÌM KIẾM & BỘ LỌC DOANH THU & KÊNH & PHÂN LOẠI KHÁCH
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone.includes(searchTerm);
    
    let matchesStatus = true;
    if (filterStatus !== "all") {
      if (filterStatus === "waiting_bank") {
        matchesStatus = !order.isPaid && (order.paymentMethod === "bank" || order.paymentMethod === "banking" || order.paymentMethod === "chuyen_khoan" || order.paymentMethod?.toLowerCase().includes("chuyển") || order.paymentMethod?.toLowerCase().includes("khoản"));
      } else if (filterStatus === "waiting_cod") {
        matchesStatus = !order.isPaid && (order.paymentMethod === "cod" || order.paymentMethod === "cash_on_delivery" || order.paymentMethod?.toLowerCase().includes("cod"));
      } else {
        matchesStatus = order.status === filterStatus;
      }
    }

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

    // Lọc theo phương thức vận chuyển
    let matchesShippingMethod = true;
    if (filterShippingMethod !== "all") {
      const isExpress = order.shippingMethod === "express" || order.shipping === 60000;
      if (filterShippingMethod === "express") matchesShippingMethod = isExpress;
      else if (filterShippingMethod === "standard") matchesShippingMethod = !isExpress && order.shippingAddress.street !== "Mua trực tiếp tại Shop";
    }

    return matchesSearch && matchesStatus && matchesSource && matchesCustomerType && matchesShippingMethod;
  });

  // PHÂN TRANG (PAGINATION)
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
      
      const memberConfig = tierConfigs.find((c) => c.tier === found.tier);
      const discountPct = memberConfig ? memberConfig.discountPercent : 2;
      const discountVal = Math.round(manualSubtotal * (discountPct / 100));
      setManualDiscount(discountVal);

      setVipCheckMessage(`✓ Khách hàng VIP hạng ${found.tier} (MM Card: ${found.memberCardId}). Tích lũy: ${found.points} điểm. Tự động chiết khấu VIP ${discountPct}%!`);
    } else {
      setVipCheckMessage("❌ Không tìm thấy thông tin thành viên VIP với SĐT/Email này.");
    }
  };

  const manualSubtotal = manualItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const manualShipping = manualSource === "pos"
    ? 0
    : (manualShippingMethod === "express" ? 60000 : (manualSubtotal > 500000 ? 0 : 30000));
  
  const checkedMemberConfig = checkedMember ? tierConfigs.find((c) => c.tier === checkedMember.tier) : null;
  const checkedMemberDiscountPct = checkedMemberConfig ? checkedMemberConfig.discountPercent : 0;
  const finalDiscount = checkedMember ? Math.round(manualSubtotal * (checkedMemberDiscountPct / 100)) : manualDiscount;
  const manualTotal = Math.max(0, manualSubtotal - finalDiscount) + manualShipping;

  const handleAddManualItem = () => {
    if (!selectedProductToAdd) return;
    
    const colors = Object.keys(selectedProductToAdd.colorImages || {});
    const finalColor = selectedColorToAdd || (colors.length > 0 ? colors[0] : "Default");

    const newItem: OrderItem = {
      product: selectedProductToAdd,
      productId: selectedProductToAdd.id,
      productName: selectedProductToAdd.name,
      productImage: selectedProductToAdd.image,
      quantity: quantityToAdd,
      size: selectedSizeToAdd,
      color: finalColor,
      price: selectedProductToAdd.price,
    };

    const existingIndex = manualItems.findIndex(
      (item) =>
        (item.productId || item.product?.id) === (newItem.productId || newItem.product?.id) &&
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

      const pointsEarned = Math.max(1, Math.floor(order.total / 10000));

      const calculateTierForPoints = (points: number): "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" => {
        const sorted = [...tierConfigs].sort((a, b) => b.minPoints - a.minPoints);
        for (const config of sorted) {
          if (points >= config.minPoints) return config.tier;
        }
        return "BRONZE";
      };

      const updatedMembersList = members.map((m) => {
        if (m.phone === targetPhone || m.email.toLowerCase() === targetEmail) {
          const nextPoints = m.points + pointsEarned;
          const nextTier = calculateTierForPoints(nextPoints);

          window.alert(`👑 THÀNH VIÊN THÂN THIẾT! Đã tự động tích lũy thêm +${pointsEarned} điểm VIP cho khách hàng ${m.fullName}. (Tổng tích lũy hiện tại: ${nextPoints} điểm - Hạng: ${nextTier})`);

          return {
            ...m,
            points: nextPoints,
            tier: nextTier,
          };
        }
        return m;
      });

      setMembers(updatedMembersList);
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
      shippingMethod: manualSource === "pos" ? undefined : manualShippingMethod,
      status: manualSource === "pos" ? "completed" : "pending",
      createdAt: new Date().toISOString(),
      notes: manualNotes.trim() || `Đơn hàng tạo thủ công qua kênh ${manualSource.toUpperCase()}${checkedMember ? ` (Thành viên VIP: ${checkedMember.memberCardId})` : ""}`,
    };

    addOrder(newOrder);

    if (manualSource === "pos" && checkedMember) {
      const pointsEarned = Math.max(1, Math.floor(manualTotal / 10000));
      
      const calculateTierForPoints = (points: number): "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" => {
        const sorted = [...tierConfigs].sort((a, b) => b.minPoints - a.minPoints);
        for (const config of sorted) {
          if (points >= config.minPoints) return config.tier;
        }
        return "BRONZE";
      };

      const updatedMembersList = members.map((m) => {
        if (m.phone === checkedMember.phone) {
          const nextPoints = m.points + pointsEarned;
          return { ...m, points: nextPoints, tier: calculateTierForPoints(nextPoints) };
        }
        return m;
      });
      
      setMembers(updatedMembersList);
      window.alert(`Đơn hàng POS thành công! Đã tích +${pointsEarned} điểm VIP cho khách hàng.`);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return "bg-green-50 text-green-700 border-green-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      case "shipping":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "processing":
      case "confirmed":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "pending":
      default:
        return "bg-stone-100 text-stone-600 border-stone-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return "Thành công";
      case "cancelled":
        return "Đã hủy";
      case "shipping":
        return "Đang giao";
      case "processing":
      case "confirmed":
        return "Đang xử lý";
      case "pending":
      default:
        return "Chờ xác nhận";
    }
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
        <div className="flex items-center gap-2">
          {selectedOrderIds.length > 0 && (
            <button
              onClick={handleBatchPrint}
              disabled={isBatchPrinting}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-5 py-3 text-xs font-bold tracking-widest uppercase transition-all shadow-md shadow-red-600/20 disabled:opacity-50"
            >
              <Printer className="h-4 w-4 animate-bounce" />
              {isBatchPrinting ? "Đang Xử Lý..." : `In ${selectedOrderIds.length} Đơn (Chuyển Đang Chuẩn Bị)`}
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-black hover:bg-red-700 text-white px-5 py-3 text-xs font-bold tracking-widest uppercase transition-all shadow-md shadow-black/10"
          >
            <Plus className="h-4 w-4" />
            Tạo Đơn Offline
          </button>
        </div>
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
              <option value="vip">THÀNH VIÊN VIP</option>
              <option value="returning">KHÁCH QUEN VÃNG LAI</option>
              <option value="first_time">KHÁCH MUA LẦN ĐẦU</option>
            </select>

            {/* BỘ LỌC PHƯƠNG THỨC VẬN CHUYỂN */}
            <select
              value={filterShippingMethod}
              onChange={(event) => setFilterShippingMethod(event.target.value)}
              className="rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs font-bold text-black/70 focus:border-black/60 focus:bg-white focus:outline-none focus:ring-0 transition-all"
            >
              <option value="all">TẤT CẢ P.THỨC SHIP</option>
              <option value="standard">SHIP TIÊU CHUẨN (THƯỜNG)</option>
              <option value="express">SHIP HỎA TỐC (2H)</option>
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
              <option value="waiting_bank">⏳ CHỜ CHUYỂN KHOẢN (BANKING)</option>
              <option value="waiting_cod">⏳ CHỜ THU HỘ (COD)</option>
              <option value="processing">ĐANG CHUẨN BỊ (ĐÃ IN ĐƠN)</option>
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
                  <th className="px-6 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={paginatedOrders.length > 0 && paginatedOrders.every((o) => selectedOrderIds.includes(o.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const allIds = paginatedOrders.map((o) => o.id);
                          setSelectedOrderIds(Array.from(new Set([...selectedOrderIds, ...allIds])));
                        } else {
                          const paginatedIds = paginatedOrders.map((o) => o.id);
                          setSelectedOrderIds(selectedOrderIds.filter((id) => !paginatedIds.includes(id)));
                        }
                      }}
                      className="rounded border-black/20 text-black focus:ring-black h-4 w-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4">Mã Đơn / Nguồn</th>
                  <th className="px-6 py-4">Tình Trạng In</th>
                  <th className="px-6 py-4">Khách Hàng (Phân Loại)</th>
                  <th className="px-6 py-4">Thanh Toán</th>
                  <th className="px-6 py-4">SĐT</th>
                  <th className="px-6 py-4">Ngày Đặt</th>
                  <th className="px-6 py-4 text-center">Trạng Thái</th>
                  <th className="px-6 py-4 text-right">Tổng Tiền</th>
                  <th className="px-6 py-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 font-semibold text-black/85">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-black/40 bg-stone-50/50">
                      Không tìm thấy đơn hàng nào tương ứng.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => {
                    const source = getOrderSourceDetails(order.orderNumber);
                    const SourceIcon = source.icon;
                    
                    // Tính toán Phân loại khách hàng realtime
                    const customerType = getCustomerCategory(order.customerPhone, order.customerEmail);

                    return (
                      <tr key={order.id} className="transition-colors hover:bg-stone-50/50">
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds([...selectedOrderIds, order.id]);
                              } else {
                                setSelectedOrderIds(selectedOrderIds.filter((id) => id !== order.id));
                              }
                            }}
                            className="rounded border-black/20 text-black focus:ring-black h-4 w-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono font-bold text-black mb-1.5 text-xs">{order.orderNumber}</div>
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] border font-bold uppercase ${source.badgeClass} w-max`}>
                              <SourceIcon className="h-2.5 w-2.5" />
                              {source.label}
                            </span>
                            {/* Shipping Method Badge */}
                            {order.shippingAddress.street !== "Mua trực tiếp tại Shop" && (
                              <div>
                                {order.shippingMethod === "express" || order.shipping === 60000 ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[8px] font-black bg-black text-white uppercase tracking-widest">
                                    HỎA TỐC
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[8px] font-black bg-transparent text-stone-500 border border-stone-300 uppercase tracking-widest">
                                    TIÊU CHUẨN
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {order.status !== "pending" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 w-max">
                              <CircleCheck className="w-3 h-3 text-emerald-600" /> Đã in đơn
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200 w-max">
                              <Clock className="w-3 h-3 text-amber-600" /> Chưa in đơn
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 space-y-1">
                          <p className="font-bold text-black text-xs uppercase">{order.customerName}</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase border ${customerType.badgeClass}`}>
                            {customerType.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            {/* Payment Method Text Badge */}
                            <span className="text-[10px] font-bold text-black/55 uppercase font-sans tracking-wide">
                              {order.paymentMethod === "bank" || order.paymentMethod === "banking" || order.paymentMethod === "chuyen_khoan" || order.paymentMethod?.toLowerCase().includes("chuyển") || order.paymentMethod?.toLowerCase().includes("khoản")
                                ? "Banking 💳"
                                : order.paymentMethod === "cash"
                                ? "Tiền mặt 💵"
                                : "COD 📦"}
                            </span>
                            
                            {/* Quick Toggle Status Badge */}
                            {order.isPaid ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Hủy xác nhận thanh toán đơn hàng ${order.orderNumber}?`)) {
                                    updateOrderPaymentStatus(order.id, false);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black bg-green-50 border border-green-200 text-green-700 w-max hover:bg-green-100 hover:border-green-300 transition-colors uppercase tracking-wider"
                                title="Click để hủy xác nhận thanh toán"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                ĐÃ THU TIỀN
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateOrderPaymentStatus(order.id, true);
                                  window.alert(`✓ Đã xác nhận giao dịch chuyển khoản cho đơn hàng ${order.orderNumber}!`);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black bg-amber-50 border border-amber-200 text-amber-700 w-max hover:bg-amber-100 hover:border-amber-300 transition-colors uppercase tracking-wider"
                                title="Click để xác nhận Đã nhận chuyển khoản"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                CHỜ CK
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-black/60">{order.customerPhone}</td>
                        <td className="px-6 py-4 text-black/65 font-mono">
                          {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <select
                            value={order.status}
                            onChange={(e) => {
                              const nextStatus = e.target.value as Order["status"];
                              if (window.confirm(`Xác nhận đổi trạng thái đơn hàng ${order.orderNumber} sang "${getStatusLabel(nextStatus)}"?`)) {
                                handleStatusUpdate(order, nextStatus);
                              }
                            }}
                            className={`inline-block px-3 py-1 rounded-full text-[10px] border font-bold uppercase cursor-pointer outline-none transition-all ${getStatusBadge(order.status)}`}
                          >
                            <option value="pending" className="bg-white text-stone-600">Chờ xác nhận</option>
                            <option value="processing" className="bg-white text-amber-700">Đang chuẩn bị</option>
                            <option value="shipping" className="bg-white text-indigo-700">Đang giao</option>
                            <option value="completed" className="bg-white text-green-700">Thành công</option>
                            <option value="cancelled" className="bg-white text-red-700">Đã hủy</option>
                          </select>
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
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-black/10 bg-stone-50 px-6 py-4 rounded-b-xl">
              <span className="text-[10px] font-bold text-black/50 uppercase tracking-widest">
                Đang xem {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredOrders.length)} / {filteredOrders.length} ĐƠN
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-stone-100 hover:border-black/30 disabled:opacity-40"
                >
                  Trước
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`h-7 w-7 rounded-lg text-[10px] font-bold transition-all ${
                        currentPage === i + 1
                          ? "bg-black text-white shadow-md"
                          : "text-black/50 hover:bg-white hover:text-black hover:border border-black/10"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-stone-100 hover:border-black/30 disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
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
                      Vui lòng gõ tìm kiếm ở ô trên để hiển thị sản phẩm kèm hình ảnh trực quan!
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
                              src={item.productImage || item.product?.image || ""}
                              alt={item.productName || item.product?.name || ""}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-black uppercase truncate text-xs">{item.productName || item.product?.name || ""}</p>
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
                    Đơn bán tại quầy (POS) sẽ giao hàng trực tiếp cho khách tại cửa hàng.
                  </div>
                )}

                {/* Phương thức vận chuyển (chỉ hiển thị nếu không phải bán tại quầy POS) */}
                {manualSource !== "pos" && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-black/50 mb-1">Phương thức vận chuyển</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setManualShippingMethod("standard")}
                        className={`flex flex-col text-left border p-3 rounded-xl transition-all ${
                          manualShippingMethod === "standard"
                            ? "border-black bg-black/5 text-black"
                            : "border-black/10 hover:border-black text-black/70"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider">Ship Thường</span>
                        <span className="text-[8px] text-black/45 mt-0.5">
                          {manualSubtotal > 500000 ? "Miễn phí" : "30.000₫"} (2-4 ngày)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setManualShippingMethod("express")}
                        className={`flex flex-col text-left border p-3 rounded-xl transition-all ${
                          manualShippingMethod === "express"
                            ? "border-black bg-black/5 text-black"
                            : "border-black/10 hover:border-black text-black/70"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-black">
                          Hỏa Tốc (2h)
                        </span>
                        <span className="text-[8px] text-black/45 mt-0.5">
                          60.000₫ (Giao siêu tốc)
                        </span>
                      </button>
                    </div>
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
                      <span>Giảm giá {checkedMember ? `(VIP ${checkedMemberDiscountPct}% Chiết khấu)` : ""}</span>
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
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setTimeout(() => window.print(), 100);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-600 px-4 py-2.5 text-xs font-bold uppercase transition-colors"
                  title="In hóa đơn bán hàng"
                >
                  <Printer className="h-4 w-4" />
                  In đơn hàng
                </button>
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
            </div>

            {/* Content Modal */}
            <div className="space-y-8 p-6">
              
              {/* Trạng thái đơn hàng & Thanh toán */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="bg-stone-50 rounded-xl p-5 border border-black/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="text-[10px] font-bold tracking-wider text-black/55 uppercase mb-1.5 flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-red-600" />
                      Trạng thái thanh toán
                    </p>
                    <p className="text-xs text-black/50">Đánh dấu hóa đơn đã thu được tiền chuyển khoản</p>
                  </div>
                  <button
                    onClick={() => handleTogglePaid(selectedOrder, !selectedOrder.isPaid)}
                    className={`rounded-xl px-4 py-2.5 text-xs font-extrabold uppercase border transition-all ${
                      selectedOrder.isPaid
                        ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                        : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {selectedOrder.isPaid ? "✓ ĐÃ THANH TOÁN" : "✗ CHƯA THANH TOÁN"}
                  </button>
                </div>
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
              {(selectedOrder.paymentMethod === "bank" || selectedOrder.paymentMethod === "chuyen_khoan" || selectedOrder.paymentMethod?.toLowerCase().includes("chuyển") || selectedOrder.paymentMethod?.toLowerCase().includes("khoản")) && (
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
                      <p>Ngân hàng: <span className="text-white font-bold">MB BANK (Quân Đội)</span></p>
                      <p>Số tài khoản: <span className="text-white font-bold">0999999999</span></p>
                      <p>Chủ tài khoản: <span className="text-white font-bold">MADMAD STUDIO</span></p>
                      <p>Số tiền: <span className="text-red-400 font-extrabold">{selectedOrder.total.toLocaleString("vi-VN")}₫</span></p>
                      <p>Nội dung: <span className="text-green-400 font-bold uppercase">MADMAD {selectedOrder.orderNumber}</span></p>
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
                    <p><span className="text-black/45">Thanh toán:</span> <span className="uppercase font-bold text-black font-mono">
                      {selectedOrder.paymentMethod === "bank" || selectedOrder.paymentMethod === "banking" || selectedOrder.paymentMethod === "chuyen_khoan" || selectedOrder.paymentMethod?.toLowerCase().includes("chuyển")
                        ? "Banking 💳"
                        : selectedOrder.paymentMethod === "cash"
                        ? "Tiền mặt 💵"
                        : "COD 📦"}
                    </span></p>
                    {selectedOrder.shippingAddress.street !== "Mua trực tiếp tại Shop" && (
                      <p>
                        <span className="text-black/45">Vận chuyển:</span>{" "}
                        <span className="font-bold text-black uppercase">
                          {selectedOrder.shippingMethod === "express" || selectedOrder.shipping === 60000
                            ? "HỎA TỐC (2H)"
                            : "TIÊU CHUẨN (THƯỜNG)"}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="border border-black/5 rounded-xl p-5 bg-white space-y-3">
                  <h3 className="text-[10px] font-extrabold tracking-widest text-black/50 uppercase border-b border-black/5 pb-2">
                    Địa Chỉ Nhận Hàng
                  </h3>
                  <div className="space-y-1.5 leading-relaxed">
                    {selectedOrder.shippingAddress.street === "Mua trực tiếp tại Shop" ? (
                      <p className="font-bold text-black">ĐƠN MUA TRỰC TIẾP TẠI CỬA HÀNG (POS)</p>
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
                          src={item.productImage || item.product?.image || ""}
                          alt={item.productName || item.product?.name || ""}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-black uppercase truncate text-xs">{item.productName || item.product?.name || ""}</p>
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

      {/* 🧾 THIẾT KẾ MỚI HÓA ĐƠN ULTRA-MINIMALIST PACKING SLIP (IN ẤN - PRINT ONLY - CỐ ĐỊNH 1 TRANG A6 100x150mm) */}
      {(selectedOrder || batchPrintOrders.length > 0) && (
        <div className="hidden print:block invoice-print-container">
          {/* Style khóa trang in A6 (100mm x 150mm) - Cố định tuyệt đối 1 trang in */}
          <style>{`
            @media print {
              @page {
                size: 100mm 150mm !important;
                margin: 0 !important;
              }
              body, html {
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body * {
                visibility: hidden !important;
              }
              .invoice-print-container, .invoice-print-container * {
                visibility: visible !important;
              }
              .invoice-print-container {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100mm !important;
                padding: 0 !important;
                margin: 0 !important;
                box-sizing: border-box !important;
              }
              .invoice-page {
                width: 100mm !important;
                height: 150mm !important;
                max-height: 150mm !important;
                padding: 6mm 8mm !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                page-break-inside: avoid !important;
              }
            }
          `}</style>
          
          {(batchPrintOrders.length > 0 ? batchPrintOrders : selectedOrder ? [selectedOrder] : []).map((printOrder, printIdx, arr) => (
            <div 
              key={printIdx} 
              className="invoice-page w-full text-black bg-white flex flex-col justify-between" 
              style={{ 
                fontFamily: "monospace", 
                fontSize: "9px", 
                lineHeight: "1.3",
                pageBreakAfter: printIdx === arr.length - 1 ? "avoid" : "always",
                breakAfter: printIdx === arr.length - 1 ? "avoid" : "page"
              }}
            >
              {/* Phần nội dung chính */}
              <div className="space-y-2.5 overflow-hidden">
                
                {/* Header */}
                <div className="text-center space-y-1 mb-2 pb-2 border-b-2 border-dashed border-black">
                  <div className="flex items-center justify-between">
                    <img src={brandLogo} alt="MADMAD Studio" className="h-8 w-auto" />
                    <div className="text-right font-mono">
                      <h1 className="text-sm font-black tracking-widest font-sans">MADMAD STUDIO</h1>
                      <p className="text-[7px] uppercase tracking-wider text-black/60 font-sans">{settings.printInvoiceSubheader || "Tối giản . Độc bản . Cao cấp"}</p>
                      <p className="text-[7px] text-black/60">{settings.printInvoiceAddress || "Showroom: 254 Nguyễn Trãi, Q.5, TP.HCM"}</p>
                      <p className="text-[7px] text-black/60">{settings.printInvoicePhone || "Hotline: 099.999.9999"}</p>
                    </div>
                  </div>
                </div>

                {/* Tiêu đề chính */}
                <div className="text-center space-y-0.5 mb-2">
                  <h2 className="text-xs font-black tracking-widest uppercase">{settings.printInvoiceTitle || "HÓA ĐƠN VẬN CHUYỂN & GÓI HÀNG"}</h2>
                  <p className="text-xs font-mono font-bold tracking-wider">{printOrder.orderNumber}</p>
                  <p className="text-[7px] text-black/50">Ngày in: {new Date().toLocaleDateString("vi-VN")} - {new Date().toLocaleTimeString("vi-VN")}</p>
                </div>

                {/* Thông tin 2 cột */}
                <div className="grid grid-cols-2 gap-3 mb-2 pb-2 border-b border-black text-[9px]">
                  <div>
                    <h3 className="font-black border-b border-black pb-0.5 mb-1 uppercase tracking-wider text-[9px]">Thông tin người nhận</h3>
                    <div className="space-y-0.5">
                      <p>Họ tên: <span className="font-bold uppercase">{printOrder.customerName}</span></p>
                      <p>Điện thoại: <span className="font-bold">{printOrder.customerPhone}</span></p>
                      <p className="truncate">Email: {printOrder.customerEmail}</p>
                      <p>Phương thức: <span className="uppercase font-bold">
                        {printOrder.paymentMethod === "bank" || printOrder.paymentMethod === "banking" || printOrder.paymentMethod === "chuyen_khoan" || printOrder.paymentMethod?.toLowerCase().includes("chuyển")
                          ? "CHUYỂN KHOẢN (BANKING)"
                          : printOrder.paymentMethod === "cash"
                          ? "TIỀN MẶT AT SHOP"
                          : "COD (THANH TOÁN KHI NHẬN HÀNG)"}
                      </span></p>
                      {printOrder.shippingAddress.street !== "Mua trực tiếp tại Shop" && (
                        <p>
                          Vận chuyển: <span className="font-bold uppercase">
                            {printOrder.shippingMethod === "express" || printOrder.shipping === 60000
                              ? "HỎA TỐC (2H)"
                              : "TIÊU CHUẨN (THƯỜNG)"}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-black border-b border-black pb-0.5 mb-1 uppercase tracking-wider text-[9px]">Địa chỉ giao hàng</h3>
                    <div className="space-y-0.5 leading-normal">
                      {printOrder.shippingAddress.street === "Mua trực tiếp tại Shop" ? (
                        <p className="font-bold">ĐƠN MUA TRỰC TIẾP TẠI CỬA HÀNG (POS)</p>
                      ) : (
                        <>
                          <p>{printOrder.shippingAddress.street}</p>
                          {printOrder.shippingAddress.ward && <p>{printOrder.shippingAddress.ward}</p>}
                          {printOrder.shippingAddress.district && <p>{printOrder.shippingAddress.district}</p>}
                          {printOrder.shippingAddress.province && <p>{printOrder.shippingAddress.province}</p>}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bảng sản phẩm */}
                <table className="w-full text-left text-[9px] border-collapse mb-2 font-mono">
                  <thead>
                    <tr className="border-b-2 border-black font-black uppercase text-black font-sans">
                      <th className="py-1">Sản phẩm</th>
                      <th className="py-1">Phân loại</th>
                      <th className="py-1 text-center">SL</th>
                      <th className="py-1 text-right">Đơn giá</th>
                      <th className="py-1 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printOrder.items.map((item, index) => (
                      <tr key={index} className="border-b border-black/10">
                        <td className="py-1.5 uppercase font-bold font-sans">{item.productName || item.product?.name || ""}</td>
                        <td className="py-1.5 uppercase text-black/70">Size: {item.size} | Màu: {item.color}</td>
                        <td className="py-1.5 text-center">{item.quantity}</td>
                        <td className="py-1.5 text-right">{item.price.toLocaleString("vi-VN")}₫</td>
                        <td className="py-1.5 text-right font-bold">{(item.price * item.quantity).toLocaleString("vi-VN")}₫</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Tổng kết chi phí */}
                <div className="mb-2 pb-2 border-b border-black font-mono">
                  <div className="w-full space-y-1 font-sans font-semibold text-[9px]">
                    <div className="flex justify-between text-black/70">
                      <span>Tạm tính:</span>
                      <span className="font-mono">{printOrder.subtotal.toLocaleString("vi-VN")}₫</span>
                    </div>
                    {printOrder.discount > 0 && (
                      <div className="flex justify-between font-bold text-red-600">
                        <span>Giảm giá/Khuyến mãi:</span>
                        <span className="font-mono">-{printOrder.discount.toLocaleString("vi-VN")}₫</span>
                      </div>
                    )}
                    {printOrder.shippingAddress.street !== "Mua trực tiếp tại Shop" && (
                      <div className="flex justify-between text-black/70">
                        <span>Phí giao hàng:</span>
                        <span className="font-mono">+{printOrder.shipping.toLocaleString("vi-VN")}₫</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-[10px] border-t-2 border-black pt-1">
                      <span>TỔNG CỘNG TIỀN:</span>
                      <span className="font-mono text-[10px]">{printOrder.total.toLocaleString("vi-VN")}₫</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Phần Slogan ở đáy trang */}
              <div className="text-center space-y-1 pt-2 border-t border-black/10 mt-auto">
                <p className="font-black uppercase tracking-widest text-[9px] font-sans">{settings.printInvoiceFooterSlogan || "CẢM ƠN QUÝ KHÁCH ĐÃ CHỌN MADMAD STUDIO!"}</p>
                <p className="text-black/50 text-[7px] leading-relaxed max-w-lg mx-auto font-sans line-clamp-2">
                  {settings.printInvoicePolicy || "* Quý khách vui lòng kiểm tra kỹ sản phẩm khi nhận hàng. Đối với các yêu cầu đổi trả sản phẩm nguyên tag mác, xin hãy nhắn tin trực tiếp fanpage Facebook/Instagram của MADMAD Studio trong vòng 3 ngày kể từ ngày nhận hàng."}
                </p>
                <div className="pt-1 text-black/25 text-[6px] font-mono tracking-widest">
                  MADMAD STUDIO - NOIR NO DESIGN STANDARD
                </div>
              </div>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
