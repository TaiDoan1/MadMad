import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { safeLocalStorage } from "@/utils/safe-storage";
import { mockOrders } from "@/features/orders/data/mock-orders";
import type { Order } from "@/types/order";
import { API_URL } from "@/config/api";

interface OrderContextValue {
  orders: Order[];
  loading: boolean;
  addOrder: (order: Omit<Order, "id">) => Promise<any>;
  updateOrderStatus: (id: number, status: Order["status"]) => Promise<void>;
  updateOrderPaymentStatus: (id: number, isPaid: boolean) => Promise<void>;
  getOrderById: (id: number) => Order | undefined;
}

const OrderContext = createContext<OrderContextValue | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrdersState] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // 🛡️ Helper tự động chuyển đổi flat fields từ database Postgres sang nested object shippingAddress để tương thích ngược với giao diện UI cũ, tránh sập trang.
  const mapOrderAddress = (order: any): Order => {
    if (!order) return order;
    return {
      ...order,
      shippingAddress: order.shippingAddress || {
        street: order.street || "Mua trực tiếp tại Shop",
        ward: order.ward || "",
        district: order.district || "",
        province: order.province || "",
      }
    };
  };

  const setOrders = (newOrders: any) => {
    if (typeof newOrders === "function") {
      setOrdersState((current) => {
        const resolved = newOrders(current);
        return resolved.map(mapOrderAddress);
      });
    } else {
      setOrdersState(newOrders.map(mapOrderAddress));
    }
  };

const LOCAL_ORDERS_KEY = "madmad_orders_fallback";

  // 📥 Tải danh sách đơn hàng từ database Neon Postgres (Dành cho Admin Dashboard)
  const loadOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await fetch(`${API_URL}/orders`);
      if (response.ok) {
        const data = await response.json();
        // Sắp xếp đơn hàng mới nhất lên đầu
        const sortedOrders = data.sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setOrders(sortedOrders);
      } else {
        throw new Error("API response not ok");
      }
    } catch (error) {
      console.warn("⚠️ Không lấy được danh sách đơn hàng từ API, dùng dữ liệu local:", error);
      const localData = safeLocalStorage.getItem(LOCAL_ORDERS_KEY);
      if (localData) {
        setOrders(JSON.parse(localData));
      } else {
        setOrders(mockOrders);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // 🔄 Tự động cập nhật ngầm mỗi 3 giây (Real-time polling cho Admin không cần F5)
    const interval = setInterval(() => {
      loadOrders(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // 🛡️ Tự động đồng bộ Orders state vào LocalStorage dự phòng
  useEffect(() => {
    if (orders.length > 0) {
      safeLocalStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
    }
  }, [orders]);

  const value = useMemo<OrderContextValue>(
    () => ({
      orders,
      loading,

      addOrder: async (orderData) => {
        const { shippingAddress, ...rest } = orderData;
        const payload = {
          ...rest,
          street: shippingAddress?.street || "Mua trực tiếp tại Shop",
          ward: shippingAddress?.ward || "",
          district: shippingAddress?.district || "",
          province: shippingAddress?.province || "",
        };

        console.log("%c🌐 [BROWSER CALL] Bắt đầu gửi API đặt hàng...", "color: #00ffff; font-weight: bold; font-size: 13px;");
        console.log(`- API URL Đích: "${API_URL}/orders"`);
        console.log("- Dữ liệu (Payload) gửi đi:", payload);

        try {
          const response = await fetch(`${API_URL}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          console.log(`- Response HTTP Status: ${response.status} (${response.statusText})`);

          if (response.ok) {
            const newOrder = await response.json();
            console.log("%c✅ [API SUCCESS] Tạo đơn hàng thành công trên máy chủ!", "color: #00ff00; font-weight: bold;", newOrder);
            await loadOrders(); // Reload để Admin thấy đơn mới
            return newOrder;
          } else {
            const errText = await response.text();
            console.error(`%c❌ [API ERROR] Máy chủ trả về lỗi (Status ${response.status}):`, "color: #ff0000; font-weight: bold;", errText);
            throw new Error(`Lỗi từ máy chủ khi tạo đơn hàng: ${errText}`);
          }
        } catch (error) {
          console.error("%c❌ [CONNECTION ERROR] Không kết nối được tới server API:", "color: #ff0000; font-weight: bold;", error);
          console.warn("%c⚠️ [FALLBACK OFFLINE] Đã kích hoạt cơ chế lưu trữ cục bộ tạm thời (Local Backup) để tránh gián đoạn trải nghiệm của Khách hàng!", "color: #ffaa00;");
          
          // Dự phòng local để luồng checkout của khách không bao giờ bị đứt quãng
          const backupOrder = {
            ...orderData,
            id: Math.max(0, ...orders.map((item) => item.id)) + 1,
            createdAt: new Date().toISOString(),
          } as Order;
          setOrders((current) => [backupOrder, ...current]);
          return backupOrder;
        }
      },

      // ✏️ Cập nhật trạng thái đơn hàng (Admin duyệt đơn: completed, cancelled...)
      updateOrderStatus: async (id, status) => {
        try {
          const response = await fetch(`${API_URL}/orders/${id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          });

          if (response.ok) {
            await loadOrders(); // Tải lại để nhận cập nhật tự động (bao gồm điểm tích lũy thành viên VIP trong DB)
          } else {
            throw new Error("Lỗi khi cập nhật trạng thái đơn hàng");
          }
        } catch (error) {
          console.error("Lỗi gọi API updateOrderStatus:", error);
          setOrders((current) =>
            current.map((order) => (order.id === id ? { ...order, status } : order)),
          );
        }
      },

      // 💳 Cập nhật trạng thái thanh toán đơn hàng (Đã thu tiền / Chờ CK)
      updateOrderPaymentStatus: async (id, isPaid) => {
        try {
          // Thử cập nhật qua endpoint chuẩn
          const response = await fetch(`${API_URL}/orders/${id}/payment`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isPaid }),
          });

          if (response.ok) {
            await loadOrders();
          } else {
            // Thử endpoint dự phòng khác (ví dụ: gửi body chung cho cả order)
            const responseBackup = await fetch(`${API_URL}/orders/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isPaid }),
            });
            if (responseBackup.ok) {
              await loadOrders();
            } else {
              throw new Error("Không thể cập nhật thanh toán đơn hàng trên server");
            }
          }
        } catch (error) {
          console.error("Lỗi gọi API updateOrderPaymentStatus, cập nhật local:", error);
          // Fallback cập nhật state local để UI phản hồi ngay lập tức
          setOrders((current) =>
            current.map((order) => (order.id === id ? { ...order, isPaid } : order)),
          );
        }
      },

      getOrderById: (id) => orders.find((order) => order.id === id),
    }),
    [orders, loading],
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrders must be used within an OrderProvider");
  }
  return context;
}
