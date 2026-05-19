export interface CartItem {
  id: string;
  productId: string | number;
  quantity: number;
  size: string;
  color: string;
  priceAtAdd: number;
}

