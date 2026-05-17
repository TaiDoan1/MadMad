import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { mockOrders } from "@/features/orders/data/mock-orders";
import type { Order } from "@/types/order";

interface OrderContextValue {
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (id: number, status: Order["status"]) => void;
  updateOrderPaymentStatus: (id: number, isPaid: boolean) => void;
  getOrderById: (id: number) => Order | undefined;
}

const OrderContext = createContext<OrderContextValue | undefined>(undefined);
const ORDERS_STORAGE_KEY = "fashion-ecommerce.orders";

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window === "undefined") {
      return mockOrders;
    }

    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      return mockOrders;
    }

    try {
      const parsed = JSON.parse(raw) as Order[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : mockOrders;
    } catch {
      return mockOrders;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const value = useMemo<OrderContextValue>(
    () => ({
      orders,
      addOrder: (order) => {
        setOrders((currentOrders) => [
          ...currentOrders,
          {
            ...order,
            id: Math.max(0, ...currentOrders.map((item) => item.id)) + 1,
          },
        ]);
      },
      updateOrderStatus: (id, status) => {
        setOrders((currentOrders) =>
          currentOrders.map((order) => (order.id === id ? { ...order, status } : order)),
        );
      },
      updateOrderPaymentStatus: (id, isPaid) => {
        setOrders((currentOrders) =>
          currentOrders.map((order) => (order.id === id ? { ...order, isPaid } : order)),
        );
      },
      getOrderById: (id) => orders.find((order) => order.id === id),
    }),
    [orders],
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
