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
  createdAt?: string;
}

export interface ProductCategory {
  name: string;
  image: string;
}
