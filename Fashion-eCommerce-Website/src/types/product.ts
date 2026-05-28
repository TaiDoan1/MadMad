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
  /** Khóa bảng gợi ý size riêng (Cài đặt → Gợi ý Size → Kiểu/Form). Để trống = theo danh mục. */
  sizeGuideProfile?: string;
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
