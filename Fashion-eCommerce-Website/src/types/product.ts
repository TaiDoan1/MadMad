import type { SizeGuideRow } from "@/types/size-guide";

export interface Product {
  id: string | number;
  sku?: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  showDiscountPercent?: boolean;
  tags?: string[];
  category: string;
  /** Khóa bảng gợi ý size dùng chung (Cài đặt → Gợi ý Size → Kiểu/Form). */
  sizeGuideProfile?: string;
  /** Bảng gợi ý size chỉ cho SP này (ưu tiên cao nhất). */
  sizeGuideOverride?: SizeGuideRow[];
  image: string;
  images?: string[];
  sizeChartImage?: string;
  colorImages?: Record<string, string>;
  rating: number;
  reviews: number;
  description: string;
  sizes: string[];
  colors: string[];
  inStock: boolean;
  stock?: number;
  variantStock?: Record<string, number>;
  isPreOrder?: boolean;
  preOrderDays?: number;
  createdAt?: string;
}

export interface ProductCategory {
  name: string;
  image: string;
}
