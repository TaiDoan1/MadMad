import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router";
import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Activity,
  Check,
  Truck,
  Sparkles,
  ChevronRight,
  Filter
} from "lucide-react";

import { useOrders } from "@/features/orders/context/order-context";
import { useProducts } from "@/features/products/context/product-context";
import type { Order } from "@/types/order";
import { useToast } from "@/components/common/toast";
import { API_URL, getAdminKey } from "@/config/api";
import { Eye } from "lucide-react";

export function AdminDashboardPage() {
  const { showToast } = useToast();
  const { products } = useProducts();
  const { orders, updateOrderStatus, updateOrderPaymentStatus } = useOrders();

  // Traffic Analytics State
  const [visitStats, setVisitStats] = useState<{
    totalViews: number;
    uniqueVisitors: number;
    chartData: { date: string; views: number; visitors: number }[];
    topPages: { page: string; count: number }[];
  } | null>(null);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);

  const [dateRange, setDateRange] = useState<"all" | "today" | "7days" | "30days" | "custom">("30days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch visitor statistics on dateRange change
  useEffect(() => {
    const fetchVisitStats = async () => {
      setIsLoadingVisits(true);
      try {
        const response = await fetch(`${API_URL}/logs/visits?range=${dateRange}`, {
          headers: {
            "x-admin-key": getAdminKey()
          }
        });
        if (response.ok) {
          const data = await response.json();
          setVisitStats(data);
        }
      } catch (error) {
        console.error("Lỗi tải thống kê truy cập:", error);
      } finally {
        setIsLoadingVisits(false);
      }
    };

    fetchVisitStats();
  }, [dateRange]);

  // 1. Filter orders based on chosen date range
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const oDate = new Date(o.createdAt);
      const now = new Date();

      if (dateRange === "today") {
        return oDate.toDateString() === now.toDateString();
      }
      if (dateRange === "7days") {
        const past7 = new Date();
        past7.setDate(now.getDate() - 7);
        return oDate >= past7;
      }
      if (dateRange === "30days") {
        const past30 = new Date();
        past30.setDate(now.getDate() - 30);
        return oDate >= past30;
      }
      if (dateRange === "custom") {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start && end) {
          end.setHours(23, 59, 59, 999);
          return oDate >= start && oDate <= end;
        } else if (start) {
          return oDate >= start;
        } else if (end) {
          end.setHours(23, 59, 59, 999);
          return oDate <= end;
        }
      }
      return true; // "all"
    });
  }, [orders, dateRange, startDate, endDate]);

  // 2. Core Stats calculations
  const totalRevenue = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + o.total, 0);
  }, [filteredOrders]);

  const completedOrdersCount = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "completed").length;
  }, [filteredOrders]);

  const averageOrderValue = useMemo(() => {
    return completedOrdersCount > 0 ? Math.round(totalRevenue / completedOrdersCount) : 0;
  }, [totalRevenue, completedOrdersCount]);

  const totalItemsSold = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status !== "cancelled" && o.status !== "returned")
      .reduce((sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  }, [filteredOrders]);

  // 3. Size breakdown calculation
  const sizeBreakdown = useMemo(() => {
    const stats: Record<string, number> = { S: 0, M: 0, L: 0, XL: 0 };
    let totalQty = 0;

    filteredOrders
      .filter((o) => o.status !== "cancelled" && o.status !== "returned")
      .forEach((o) => {
        o.items.forEach((item) => {
          const sz = (item.size ?? "M").toUpperCase().trim();
          stats[sz] = (stats[sz] ?? 0) + item.quantity;
          totalQty += item.quantity;
        });
      });

    return Object.entries(stats)
      .map(([size, quantity]) => ({
        size,
        quantity,
        percentage: totalQty > 0 ? Math.round((quantity / totalQty) * 100) : 0
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [filteredOrders]);

  // 4. Action-required orders (Pending, Processing, or Shipping) sorted by oldest first
  const pendingActionOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === "pending" || o.status === "processing" || o.status === "shipping")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders]);

  // 5. Top-selling products
  const topProducts = useMemo(() => {
    const stats: Record<number, { name: string; image: string; price: number; quantity: number; revenue: number }> = {};
    
    filteredOrders
      .filter((o) => o.status !== "cancelled" && o.status !== "returned")
      .forEach((o) => {
        o.items.forEach((item) => {
          const pid = item.productId || item.product?.id;
          if (!pid) return;
          if (!stats[pid]) {
            stats[pid] = {
              name: item.productName || item.product?.name || "Sản phẩm",
              image: item.productImage || item.product?.image || "",
              price: item.price,
              quantity: 0,
              revenue: 0
            };
          }
          stats[pid].quantity += item.quantity;
          stats[pid].revenue += item.price * item.quantity;
        });
      });

    return Object.values(stats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredOrders]);

  // Helper for quick order action transitions
  const handleQuickNextStatus = async (order: Order) => {
    let nextStatus: Order["status"] = "pending";
    let label = "";
    
    if (order.status === "pending") {
      nextStatus = "processing";
      label = "Xác nhận & Chuẩn bị hàng";
    } else if (order.status === "processing") {
      nextStatus = "shipping";
      label = "Bắt đầu giao hàng";
    } else if (order.status === "shipping") {
      nextStatus = "completed";
      label = "Xác nhận đã giao thành công";
    } else {
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn chuyển đơn hàng ${order.orderNumber} sang trạng thái "${label}"?`)) {
      await updateOrderStatus(order.id, nextStatus);
      showToast(`Cập nhật trạng thái đơn hàng thành công!`, "success");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-black flex items-center gap-2 sm:text-2xl">
            <Activity className="h-6 w-6 text-black" />
            MADMAD Operational Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Báo cáo hiệu suất vận hành, số liệu bán hàng và thông tin xử lý đơn hàng thời gian thực.
          </p>
        </div>

        {/* ELEGANT MINIMALIST DATE FILTER */}
        <div className="flex flex-wrap items-center gap-2 bg-stone-50 border border-border rounded-xl p-2 shadow-xs">
          <Filter className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="rounded border border-transparent bg-transparent py-1 px-2.5 text-xs font-bold text-black focus:outline-none cursor-pointer"
          >
            <option value="today">Hôm nay</option>
            <option value="7days">7 ngày qua</option>
            <option value="30days">30 ngày gần nhất</option>
            <option value="custom">Khoảng tự chọn</option>
            <option value="all">Tất cả thời gian</option>
          </select>

          {dateRange === "custom" && (
            <div className="flex items-center gap-1.5 border-l border-border pl-2.5 animate-fadeIn">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded border border-border bg-white px-2 py-0.5 text-[10px] font-semibold focus:outline-none"
              />
              <span className="text-[10px] text-muted-foreground">đến</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded border border-border bg-white px-2 py-0.5 text-[10px] font-semibold focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* CORE PERFORMANCE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* DOANH THU */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-extrabold tracking-wider uppercase">Doanh thu thực nhận</span>
            <div className="rounded-md bg-stone-100 p-1.5"><DollarSign className="h-4 w-4 text-black" /></div>
          </div>
          <div>
            <p className="text-2xl font-black text-black tracking-tight font-mono">
              {totalRevenue.toLocaleString("vi-VN")}₫
            </p>
            <p className="text-[10px] text-green-600 font-bold mt-1">✓ Chỉ tính đơn thành công</p>
          </div>
        </div>

        {/* TỔNG ĐƠN HÀNG */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-extrabold tracking-wider uppercase">Tổng số lượng đơn</span>
            <div className="rounded-md bg-stone-100 p-1.5"><ShoppingBag className="h-4 w-4 text-black" /></div>
          </div>
          <div>
            <p className="text-2xl font-black text-black tracking-tight font-mono">
              {filteredOrders.length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Đơn đặt trong chu kỳ lọc</p>
          </div>
        </div>

        {/* SẢN PHẨM ĐÃ BÁN */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-extrabold tracking-wider uppercase">Tổng sản phẩm đã bán</span>
            <div className="rounded-md bg-stone-100 p-1.5"><Package className="h-4 w-4 text-black" /></div>
          </div>
          <div>
            <p className="text-2xl font-black text-black tracking-tight font-mono">
              {totalItemsSold} <span className="text-xs font-normal text-muted-foreground">cái</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Không tính các đơn bị hủy</p>
          </div>
        </div>

        {/* GIÁ TRỊ TRUNG BÌNH ĐƠN */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-extrabold tracking-wider uppercase">AOV (Giá trị TB đơn)</span>
            <div className="rounded-md bg-stone-100 p-1.5"><Users className="h-4 w-4 text-black" /></div>
          </div>
          <div>
            <p className="text-2xl font-black text-black tracking-tight font-mono">
              {averageOrderValue.toLocaleString("vi-VN")}₫
            </p>
            <p className="text-[10px] text-green-600 font-bold mt-1">Sức mua trung bình mỗi đơn</p>
          </div>
        </div>

        {/* LƯỢT XEM TRANG */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-extrabold tracking-wider uppercase">Lượt xem trang (Pageviews)</span>
            <div className="rounded-md bg-stone-100 p-1.5"><Eye className="h-4 w-4 text-black" /></div>
          </div>
          <div>
            <p className="text-2xl font-black text-black tracking-tight font-mono">
              {isLoadingVisits ? "..." : visitStats?.totalViews ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Tổng số lượt tải trang công khai</p>
          </div>
        </div>

        {/* KHÁCH TRUY CẬP DUY NHẤT */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-extrabold tracking-wider uppercase">Khách truy cập (Visitors)</span>
            <div className="rounded-md bg-stone-100 p-1.5"><Users className="h-4 w-4 text-black" /></div>
          </div>
          <div>
            <p className="text-2xl font-black text-black tracking-tight font-mono">
              {isLoadingVisits ? "..." : visitStats?.uniqueVisitors ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Số lượng khách truy cập (theo IP)</p>
          </div>
        </div>
      </div>

      {/* DETAILED INSIGHTS & ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* LEFT COLUMN: URGENT ORDERS & TOP PRODUCTS (Lg:col-span-3) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* URGENT ORDERS REQUIRING PROCESSING */}
          <div className="rounded-2xl border border-border bg-white shadow-xs overflow-hidden">
            <div className="border-b border-border px-5 py-4 flex justify-between items-center bg-stone-50">
              <div>
                <h3 className="font-black text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  Đơn hàng cần xử lý gấp ({pendingActionOrders.length})
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Xếp thứ tự từ cũ nhất lên trước để không bị trễ đơn hàng của khách.</p>
              </div>
              <Link to="/admin/orders" className="text-[10px] font-extrabold tracking-wider uppercase text-black hover:underline flex items-center gap-0.5">
                Xem toàn bộ đơn <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="divide-y divide-border max-h-96 overflow-y-auto pr-1">
              {pendingActionOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs italic">
                  🎉 Tuyệt vời! Hiện tại không có đơn hàng nào đang chờ xử lý.
                </div>
              ) : (
                pendingActionOrders.map((order) => (
                  <div key={order.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-stone-50/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-black">{order.orderNumber}</span>
                        <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          order.status === "pending" ? "bg-stone-100 text-stone-600 border border-stone-200" :
                          order.status === "processing" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}>
                          {order.status === "pending" ? "Chờ xác nhận" :
                           order.status === "processing" ? "Đang chuẩn bị" :
                           "Đang giao"}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-black uppercase">{order.customerName} - {order.customerPhone}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Đặt ngày {new Date(order.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right font-mono">
                        <p className="text-xs font-black text-black">{order.total.toLocaleString("vi-VN")}₫</p>
                        <p className="text-[9px] text-muted-foreground font-bold">
                          {order.isPaid ? "✓ Đã thanh toán" : "✗ Chưa thanh toán"}
                        </p>
                      </div>

                      {/* QUICK WORKFLOW TRANSITIONS */}
                      <button
                        onClick={() => handleQuickNextStatus(order)}
                        className="flex items-center gap-1.5 rounded-lg border border-black bg-black text-white hover:bg-stone-900 transition-colors px-3 py-1.5 text-[9px] font-black uppercase tracking-widest"
                      >
                        {order.status === "pending" && <><Check className="h-3 w-3" /> Duyệt đơn</>}
                        {order.status === "processing" && <><Truck className="h-3 w-3" /> Giao hàng</>}
                        {order.status === "shipping" && <><CheckCircle2 className="h-3 w-3" /> Hoàn tất</>}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TOP SELLING PRODUCTS */}
          <div className="rounded-2xl border border-border bg-white shadow-xs overflow-hidden">
            <div className="border-b border-border px-5 py-4 bg-stone-50">
              <h3 className="font-black text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-black animate-pulse" />
                Sản phẩm bán chạy nhất trong chu kỳ
              </h3>
            </div>
            
            <div className="divide-y divide-border">
              {topProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs italic">
                  Chưa ghi nhận số liệu bán hàng.
                </div>
              ) : (
                topProducts.map((p, idx) => (
                  <div key={p.name} className="p-4 flex items-center gap-4 hover:bg-stone-50/50 transition-colors">
                    <span className="font-mono font-black text-xs text-muted-foreground w-4">{idx + 1}</span>
                    <div className="h-10 w-8 overflow-hidden rounded bg-stone-100 border border-border flex-shrink-0">
                      {p.image && <img src={p.image} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-black text-xs uppercase truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.price.toLocaleString("vi-VN")}₫ / sản phẩm</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xs text-black">{p.quantity} cái</p>
                      <p className="text-[9px] text-green-700 font-extrabold font-mono">+{p.revenue.toLocaleString("vi-VN")}₫</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SIZE BREAKDOWN & LOGISTICS INSIGHTS (Lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* SIZE DISTRIBUTION LIST (No cluttered charts) */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-black">
                Tỷ lệ phân phối Size bán ra
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Thống kê số lượng size đã xuất kho thực tế.</p>
            </div>

            <div className="space-y-4 pt-1">
              {sizeBreakdown.map((item) => (
                <div key={item.size} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black text-black">SIZE {item.size}</span>
                    <span className="font-mono text-muted-foreground">
                      {item.quantity} cái <span className="font-bold text-black ml-1">({item.percentage}%)</span>
                    </span>
                  </div>
                  
                  {/* Custom Progress bar */}
                  <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div 
                      className="h-full bg-black transition-all duration-500 rounded-full" 
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              
              {sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0) === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-6">Chưa có số liệu size bán ra.</p>
              )}
            </div>
          </div>

          {/* EXTRAS: SYSTEM STATISTICS SUMMARY */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-black">
                Phân tích vận hành nhanh
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Nhận định hiệu suất luồng công việc tự động.</p>
            </div>

            <div className="space-y-3 font-semibold text-xs text-black/85">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Đơn hoàn thành (Tỷ lệ):</span>
                <span className="font-mono font-bold text-green-700">
                  {completedOrdersCount} / {filteredOrders.length} ({filteredOrders.length > 0 ? Math.round((completedOrdersCount / filteredOrders.length) * 100) : 0}%)
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Đơn bị hủy bỏ:</span>
                <span className="font-mono font-bold text-red-600">
                  {filteredOrders.filter(o => o.status === "cancelled").length} đơn
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Sản phẩm hiện có:</span>
                <span className="font-mono font-bold">{products.length} dòng sản phẩm</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Thành viên VIP mua hàng:</span>
                <span className="font-mono font-bold text-black">
                  {filteredOrders.filter(o => {
                    const isFb = o.orderNumber.startsWith("DH-FB");
                    const isIg = o.orderNumber.startsWith("DH-IG");
                    const isPos = o.orderNumber.startsWith("DH-POS");
                    return isPos || isFb || isIg;
                  }).length} đơn (Offline/Mạng xã hội)
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* TRAFFIC & PAGES ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
        {/* Biến động truy cập theo ngày */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-white p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-black text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              Biến động lượt truy cập theo ngày
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Số lượt xem trang và số khách truy cập duy nhất theo từng ngày.</p>
          </div>

          <div className="overflow-x-auto">
            {isLoadingVisits ? (
              <div className="text-center py-12 text-xs text-muted-foreground animate-pulse">Đang tải số liệu...</div>
            ) : !visitStats || visitStats.chartData.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground italic">Chưa ghi nhận lượt truy cập nào.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase tracking-wider text-[9px] font-extrabold bg-stone-50">
                    <th className="py-2.5 px-3">Ngày</th>
                    <th className="py-2.5 px-3 text-right">Lượt xem trang (Pageviews)</th>
                    <th className="py-2.5 px-3 text-right">Khách truy cập (Visitors)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...visitStats.chartData].reverse().map((row) => (
                    <tr key={row.date} className="hover:bg-stone-50/50">
                      <td className="py-2 px-3 font-bold text-black">{row.date}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-black">{row.views}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-neutral-500">{row.visitors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Các trang truy cập nhiều nhất */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-white p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-black text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              Trang được xem nhiều nhất
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Danh sách các đường dẫn được khách hàng click nhiều nhất.</p>
          </div>

          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {isLoadingVisits ? (
              <div className="text-center py-12 text-xs text-muted-foreground animate-pulse">Đang tải số liệu...</div>
            ) : !visitStats || visitStats.topPages.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground italic">Chưa có số liệu trang truy cập.</div>
            ) : (
              visitStats.topPages.map((item, idx) => (
                <div key={item.page} className="py-2.5 flex items-center justify-between text-xs hover:bg-stone-50/50 px-1 rounded transition-colors">
                  <div className="flex items-center gap-2 truncate pr-4">
                    <span className="font-mono font-black text-[10px] text-muted-foreground w-4">{idx + 1}</span>
                    <span className="font-mono font-bold text-black truncate" title={item.page}>{item.page}</span>
                  </div>
                  <span className="font-mono font-bold text-black bg-stone-100 px-2 py-0.5 rounded text-[10px] shrink-0">
                    {item.count} views
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
