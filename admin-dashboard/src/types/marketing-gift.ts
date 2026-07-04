export interface MarketingGiftItem {
  id?: string;
  giftId?: string;
  productId: string;
  productName: string;
  productImage?: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface MarketingGift {
  id: string;
  giftNumber: string;
  kolName: string;
  kolHandle?: string | null;
  platform?: string | null;
  contactInfo?: string | null;
  cashAmount: number;
  productValue: number;
  totalCost: number;
  notes?: string | null;
  status: "completed" | "cancelled";
  createdAt: string;
  updatedAt?: string;
  items: MarketingGiftItem[];
}

export interface MarketingStats {
  totalGifts: number;
  totalProductValue: number;
  totalCash: number;
  totalCost: number;
  topKols: Array<{ name: string; cost: number }>;
}

export interface CreateMarketingGiftInput {
  kolName: string;
  kolHandle?: string;
  platform?: string;
  contactInfo?: string;
  cashAmount?: number;
  notes?: string;
  items: Array<{
    productId: string;
    color: string;
    size: string;
    quantity: number;
  }>;
}
