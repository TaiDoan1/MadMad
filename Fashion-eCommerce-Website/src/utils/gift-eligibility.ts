import type { CartItem } from "@/types/cart";
import type { GiftConditions, Product } from "@/types/product";

export function isGiftProduct(product?: Product | null): boolean {
  return Boolean(product?.isGiftProduct);
}

export function getPaidCartMetrics(cartItems: CartItem[], products: Product[]) {
  let paidSubtotal = 0;
  let paidItemCount = 0;

  for (const item of cartItems) {
    const product = products.find((p) => String(p.id) === String(item.productId));
    if (!product || isGiftProduct(product) || item.isGift) continue;
    paidSubtotal += item.priceAtAdd * item.quantity;
    paidItemCount += item.quantity;
  }

  return { paidSubtotal, paidItemCount };
}

export function isGiftEligible(
  cartItems: CartItem[],
  products: Product[],
  giftProduct: Product,
): boolean {
  const conditions = giftProduct.giftConditions ?? {};
  const hasOrderRule = typeof conditions.minOrderTotal === "number" && conditions.minOrderTotal > 0;
  const hasCountRule = typeof conditions.minProductCount === "number" && conditions.minProductCount > 0;

  if (!hasOrderRule && !hasCountRule) {
    return true;
  }

  const { paidSubtotal, paidItemCount } = getPaidCartMetrics(cartItems, products);

  if (hasOrderRule && paidSubtotal < Number(conditions.minOrderTotal)) {
    return false;
  }
  if (hasCountRule && paidItemCount < Number(conditions.minProductCount)) {
    return false;
  }
  return true;
}

export function describeGiftConditions(conditions?: GiftConditions): string {
  const parts: string[] = [];
  if (conditions?.minOrderTotal && conditions.minOrderTotal > 0) {
    parts.push(`đơn từ ${conditions.minOrderTotal.toLocaleString("vi-VN")}₫`);
  }
  if (conditions?.minProductCount && conditions.minProductCount > 0) {
    parts.push(`mua từ ${conditions.minProductCount} sản phẩm`);
  }
  if (parts.length === 0) return "Không có điều kiện";
  return parts.join(" và ");
}

export function getGiftEligibilityMessage(giftProduct: Product): string {
  const summary = describeGiftConditions(giftProduct.giftConditions);
  return `Cần ${summary} để nhận quà tặng này.`;
}
