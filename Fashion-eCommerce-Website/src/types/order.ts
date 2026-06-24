import type { Product } from "@/types/product";

export interface OrderItemEditChange {
  from: string;
  to: string;
  fromId?: string;
  toId?: string;
}

export interface OrderItemEditMeta {
  product?: OrderItemEditChange;
  color?: OrderItemEditChange;
  size?: OrderItemEditChange;
}

export interface OrderItem {
  id?: number;
  product?: Product;
  productId?: string;
  productName?: string;
  productImage?: string;
  isPreOrder?: boolean;
  preOrderDays?: number;
  preOrderFulfilledAt?: string;
  quantity: number;
  size: string;
  color: string;
  price: number;
  editMeta?: OrderItemEditMeta;
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
  // Backend statuses: pending, processing, shipping, completed, cancelled, returned
  // Keep legacy UI variants for backwards compatibility
  status: "pending" | "processing" | "confirmed" | "shipping" | "delivered" | "completed" | "cancelled" | "returned";
  createdAt: string;
  notes?: string;
  internalNote?: string;
  isPaid?: boolean;
  containsPreOrder?: boolean;
  isEdited?: boolean;
  editedAt?: string;
}
