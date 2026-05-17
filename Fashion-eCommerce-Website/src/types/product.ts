export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
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
}

export interface ProductCategory {
  name: string;
  image: string;
}
