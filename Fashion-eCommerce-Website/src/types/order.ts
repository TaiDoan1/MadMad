import type { Product } from "@/types/product";

export interface OrderItem {
  product?: Product;
  productId?: string;
  productName?: string;
  productImage?: string;
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
  status: "pending" | "confirmed" | "shipping" | "delivered" | "cancelled";
  createdAt: string;
  notes?: string;
  isPaid?: boolean;
}
