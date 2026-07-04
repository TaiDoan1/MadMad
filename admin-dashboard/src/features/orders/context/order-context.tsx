import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { mockOrders } from "@/features/orders/data/mock-orders";
import type { Order, OrderItem } from "@/types/order";
import { API_URL, getAdminKey } from "@/config/api";
import { safeLocalStorage } from "@/utils/safe-storage";
import { enqueue, peekQueue, removeFromQueue } from "@/utils/offline-queue";
import { parseOrderItemEditMeta } from "@/utils/order-edit";

interface UpdateOrderItemInput {
  productId: string;
  color: string;
  size: string;
  quantity: number;
}

interface OrderContextValue {
  orders: Order[];
  loading: boolean;
  addOrder: (order: Omit<Order, "id">) => Promise<any>;
  updateOrderStatus: (id: number, status: Order["status"]) => Promise<void>;
  updateOrderPaymentStatus: (id: number, isPaid: boolean) => Promise<void>;
  updateOrderInternalNote: (id: number, internalNote: string) => Promise<void>;
  updateOrderItem: (orderId: number, itemId: number, input: UpdateOrderItemInput) => Promise<Order>;
  addOrderItem: (orderId: number, itemData: { productId: string; color: string; size: string; quantity: number; isGift: boolean }) => Promise<Order>;
  removeOrderItem: (orderId: number, itemId: number) => Promise<Order>;
  applyOrderCoupon: (orderId: number, couponCode: string) => Promise<Order>;
  syncOrderItemImages: () => Promise<{ updated: number; total: number }>;
  syncOrderStockDeductions: () => Promise<{
    deductedItems: number;
    skippedItems: number;
    giftItemsDeducted: number;
    ordersChecked: number;
    errors: string[];
  }>;
  syncOutboundStockDeductions: () => Promise<{
    orders: {
      deductedItems: number;
      skippedItems: number;
      giftItemsDeducted: number;
      ordersChecked: number;
      errors: string[];
    };
    marketing: {
      deductedItems: number;
      skippedItems: number;
      giftsChecked: number;
      errors: string[];
    };
    totalDeducted: number;
    totalErrors: string[];
  }>;
  getOrderById: (id: number) => Order | undefined;
}

const OrderContext = createContext<OrderContextValue | undefined>(undefined);
const ORDERS_OFFLINE_QUEUE_KEY = "madmad.offline.queue.orders";
const ORDER_INTERNAL_NOTE_QUEUE_KEY = "madmad.offline.queue.order-internal-notes";

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrdersState] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // 🛡️ Helper tự động chuyển đổi flat fields từ database Postgres sang nested object shippingAddress để tương thích ngược với giao diện UI cũ, tránh sập trang.
  const mapOrderItem = (item: any): OrderItem => ({
    ...item,
    editMeta: parseOrderItemEditMeta(item.editMeta ?? item.editMetaJson),
  });

  const mapOrderAddress = (order: any): Order => {
    if (!order) return order;
    return {
      ...order,
      editedAt: order.editedAt ? String(order.editedAt) : undefined,
      items: Array.isArray(order.items) ? order.items.map(mapOrderItem) : order.items,
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

  const flushOrdersQueue = async () => {
    const queued = peekQueue<any>(ORDERS_OFFLINE_QUEUE_KEY);
    if (queued.length === 0) return;
    const succeeded: string[] = [];
    for (const q of queued) {
      try {
        const adminKey = getAdminKey();
        const endpoint = adminKey ? `${API_URL}/orders/admin-create` : `${API_URL}/orders`;
        
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...(adminKey ? { "x-admin-key": adminKey } : {})
          },
          body: JSON.stringify(q.payload),
        });
        if (res.ok) {
          succeeded.push(q.id);
          continue;
        }
        // Đọc body lỗi để log
        const text = await res.text().catch(() => "");
        // Lỗi 4xx = lỗi phía client (dữ liệu sai), không thể retry thành công → xóa khỏi queue
        // Lỗi 5xx = lỗi server tạm thời → giữ lại để retry sau
        if (res.status >= 400 && res.status < 500) {
          console.warn(`[OfflineQueue] Xóa item khỏi queue (lỗi ${res.status}):`, q.id, text.slice(0, 200));
          succeeded.push(q.id);
        }
      } catch {
        // stop early if still offline
        break;
      }
    }
    if (succeeded.length > 0) {
      removeFromQueue(ORDERS_OFFLINE_QUEUE_KEY, succeeded);
      await loadOrders(true);
    }
  };

  const flushInternalNoteQueue = async () => {
    const queued = peekQueue<{ orderId: number; internalNote: string }>(ORDER_INTERNAL_NOTE_QUEUE_KEY);
    if (queued.length === 0) return;
    const succeeded: string[] = [];
    for (const q of queued) {
      try {
        const res = await fetch(`${API_URL}/orders/${q.payload.orderId}/internal-note`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "x-admin-key": getAdminKey()
          },
          body: JSON.stringify({ internalNote: q.payload.internalNote }),
        });
        if (res.ok) succeeded.push(q.id);
      } catch {
        break;
      }
    }
    if (succeeded.length > 0) {
      removeFromQueue(ORDER_INTERNAL_NOTE_QUEUE_KEY, succeeded);
      await loadOrders(true);
    }
  };

  // 📥 Tải danh sách đơn hàng từ database Neon Postgres (Dành cho Admin Dashboard)
  const loadOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await fetch(`${API_URL}/orders`, {
        headers: { "x-admin-key": getAdminKey() }
      });
      if (response.ok) {
        const data = await response.json();
        // Sắp xếp đơn hàng mới nhất lên đầu
        const sortedOrders = data.sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setOrders(sortedOrders);
        // once online, try flushing any offline queues
        flushOrdersQueue();
        flushInternalNoteQueue();
      } else {
        throw new Error("API response not ok");
      }
    } catch {
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
    // Chỉ tải dữ liệu và bắt đầu polling khi trình duyệt có token admin hợp lệ
    const adminKey = getAdminKey();
    if (!adminKey) return;

    loadOrders();
    // 🔄 Tự động cập nhật ngầm mỗi 3 giây (Real-time polling cho Admin không cần F5)
    const interval = setInterval(() => {
      if (getAdminKey()) {
        loadOrders(true);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onOnline = () => {
      flushOrdersQueue();
      flushInternalNoteQueue();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
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

        try {
          const adminKey = getAdminKey();
          const endpoint = adminKey ? `${API_URL}/orders/admin-create` : `${API_URL}/orders`;
          
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              ...(adminKey ? { "x-admin-key": adminKey } : {})
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const newOrder = await response.json();
            await loadOrders(); // Reload để Admin thấy đơn mới
            return newOrder;
          } else {
            const errText = await response.text();
            throw new Error(`Lỗi từ máy chủ khi tạo đơn hàng: ${errText}`);
          }
        } catch (error) {
          // Queue for later sync
          enqueue(ORDERS_OFFLINE_QUEUE_KEY, payload, payload.orderNumber);
          
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
            headers: { 
              "Content-Type": "application/json",
              "x-admin-key": getAdminKey()
            },
            body: JSON.stringify({ status }),
          });

          if (response.ok) {
            await loadOrders(); // Tải lại để nhận cập nhật tự động (bao gồm điểm tích lũy thành viên VIP trong DB)
          } else {
            throw new Error("Lỗi khi cập nhật trạng thái đơn hàng");
          }
        } catch {
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
              headers: { 
                "Content-Type": "application/json",
                "x-admin-key": getAdminKey()
              },
              body: JSON.stringify({ isPaid }),
            });
            if (responseBackup.ok) {
              await loadOrders();
            } else {
              throw new Error("Không thể cập nhật thanh toán đơn hàng trên server");
            }
          }
        } catch {
          // Fallback cập nhật state local để UI phản hồi ngay lập tức
          setOrders((current) =>
            current.map((order) => (order.id === id ? { ...order, isPaid } : order)),
          );
        }
      },

      updateOrderInternalNote: async (id, internalNote) => {
        try {
          const response = await fetch(`${API_URL}/orders/${id}/internal-note`, {
            method: "PUT",
            headers: { 
              "Content-Type": "application/json",
              "x-admin-key": getAdminKey()
            },
            body: JSON.stringify({ internalNote }),
          });
          if (response.ok) {
            await loadOrders(true);
          } else {
            throw new Error("Không thể cập nhật ghi chú nội bộ trên server");
          }
        } catch {
          enqueue(ORDER_INTERNAL_NOTE_QUEUE_KEY, { orderId: id, internalNote }, `${id}`);
          setOrders((current) =>
            current.map((order) => (order.id === id ? { ...order, internalNote } : order)),
          );
        }
      },

      updateOrderItem: async (orderId, itemId, input) => {
        const response = await fetch(`${API_URL}/orders/${orderId}/items/${itemId}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "x-admin-key": getAdminKey()
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          let message = "Không thể cập nhật sản phẩm trong đơn hàng";
          try {
            const parsed = JSON.parse(errText);
            if (parsed?.message) message = parsed.message;
          } catch {
            if (errText) message = errText;
          }
          throw new Error(message);
        }

        const updatedOrder = mapOrderAddress(await response.json());
        setOrders((current) =>
          current.map((order) => (order.id === orderId ? updatedOrder : order)),
        );
        return updatedOrder;
      },

      addOrderItem: async (orderId, itemData) => {
        const response = await fetch(`${API_URL}/orders/${orderId}/items`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-admin-key": getAdminKey()
          },
          body: JSON.stringify(itemData),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          let message = "Không thể thêm sản phẩm vào đơn hàng";
          try {
            const parsed = JSON.parse(errText);
            if (parsed?.message) message = parsed.message;
          } catch {
            if (errText) message = errText;
          }
          throw new Error(message);
        }

        const updatedOrder = mapOrderAddress(await response.json());
        setOrders((current) =>
          current.map((order) => (order.id === orderId ? updatedOrder : order)),
        );
        return updatedOrder;
      },

      removeOrderItem: async (orderId, itemId) => {
        const response = await fetch(`${API_URL}/orders/${orderId}/items/${itemId}`, {
          method: "DELETE",
          headers: { 
            "x-admin-key": getAdminKey()
          },
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          let message = "Không thể xóa sản phẩm khỏi đơn hàng";
          try {
            const parsed = JSON.parse(errText);
            if (parsed?.message) message = parsed.message;
          } catch {
            if (errText) message = errText;
          }
          throw new Error(message);
        }

        const updatedOrder = mapOrderAddress(await response.json());
        setOrders((current) =>
          current.map((order) => (order.id === orderId ? updatedOrder : order)),
        );
        return updatedOrder;
      },

      applyOrderCoupon: async (orderId, couponCode) => {
        // If couponCode contains commas, split it, else if it is a single code, send it as array
        const couponCodes = couponCode
          ? couponCode.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean)
          : [];
        const response = await fetch(`${API_URL}/orders/${orderId}/coupon`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "x-admin-key": getAdminKey()
          },
          body: JSON.stringify({ couponCode, couponCodes }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          let message = "Không thể áp dụng mã giảm giá";
          try {
            const parsed = JSON.parse(errText);
            if (parsed?.message) message = parsed.message;
          } catch {
            if (errText) message = errText;
          }
          throw new Error(message);
        }

        const updatedOrder = mapOrderAddress(await response.json());
        setOrders((current) =>
          current.map((order) => (order.id === orderId ? updatedOrder : order)),
        );
        return updatedOrder;
      },

      syncOrderItemImages: async () => {
        const response = await fetch(`${API_URL}/orders/sync-item-images`, {
          method: "POST",
          headers: { "x-admin-key": getAdminKey() },
        });

        if (!response.ok) {
          throw new Error("Không thể đồng bộ ảnh màu cho đơn hàng");
        }

        const result = (await response.json()) as { updated: number; total: number };
        if (result.updated > 0) {
          await loadOrders(true);
        }
        return result;
      },

      syncOrderStockDeductions: async () => {
        const response = await fetch(`${API_URL}/orders/sync-stock-deductions`, {
          method: "POST",
          headers: { "x-admin-key": getAdminKey() },
        });

        if (!response.ok) {
          throw new Error("Không thể đồng bộ trừ kho cho đơn hàng");
        }

        const result = await response.json();
        if (result.deductedItems > 0) {
          await loadOrders(true);
        }
        return result;
      },

      syncOutboundStockDeductions: async () => {
        const response = await fetch(`${API_URL}/inventory/sync-outbound`, {
          method: "POST",
          headers: { "x-admin-key": getAdminKey() },
        });

        if (!response.ok) {
          throw new Error("Không thể đồng bộ trừ kho xuất kho");
        }

        const result = await response.json();
        if (result.totalDeducted > 0) {
          await loadOrders(true);
        }
        return result;
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
