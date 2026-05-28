import type { Product } from "@/types/product";

export interface OrderItem {
  product?: Product;
  productId?: string;
  productName?: string;
  productImage?: string;
  isPreOrder?: boolean;
  preOrderDays?: number;
  quantity: number;
  size: string;
  color: string;
  price: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    street: string;
    ward: string;
    district: string;
    province: string;
  };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  shipping: number;
  total: number;
  paymentMethod: string;
  shippingMethod?: "standard" | "express";
  // Backend statuses: pending, processing, shipping, completed, cancelled
  // Keep legacy UI variants for backwards compatibility
  status: "pending" | "processing" | "confirmed" | "shipping" | "delivered" | "completed" | "cancelled";
  createdAt: string;
  notes?: string;
  internalNote?: string;
  isPaid?: boolean;
  containsPreOrder?: boolean;
}
