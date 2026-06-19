import type { OrderItem } from "@/types/order";
import type { Product } from "@/types/product";

const COLOR_EQUIVALENTS: Record<string, string[]> = {
  "đen": ["black", "den"],
  black: ["đen", "den"],
  "trắng": ["white", "trang", "off-white"],
  white: ["trắng", "trang"],
  "xám": ["grey", "gray", "xam", "charcoal"],
  grey: ["xám", "xam", "gray"],
  gray: ["xám", "xam", "grey"],
  "đỏ": ["red", "do"],
  red: ["đỏ", "do"],
  navy: ["xanh navy", "blue"],
  be: ["beige"],
};

function normalizeColor(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[/|]+/g, " ")
    .replace(/\s+/g, " ");
}

function colorsEquivalent(a: string, b: string): boolean {
  const left = normalizeColor(a);
  const right = normalizeColor(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const leftAliases = COLOR_EQUIVALENTS[left] || [];
  const rightAliases = COLOR_EQUIVALENTS[right] || [];
  return leftAliases.includes(right) || rightAliases.includes(left);
}

function getColorImages(product: Pick<Product, "colorImages">): Record<string, string> {
  const raw = product.colorImages;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return raw;
}

function colorLookupVariants(color: string): string[] {
  const clean = color.trim();
  if (!clean) return [];

  const variants = new Set<string>([clean]);
  variants.add(clean.replace(/[/|]+/g, " ").replace(/\s+/g, " ").trim());
  variants.add(clean.replace(/\s+/g, "/").trim());
  return [...variants].filter(Boolean);
}

function findColorImageEntry(colorImages: Record<string, string>, color: string) {
  const cleanColor = color.trim();
  if (!cleanColor) return undefined;

  for (const variant of colorLookupVariants(cleanColor)) {
    const directFront = colorImages[`${variant}-front`];
    if (directFront) return { url: directFront, key: `${variant}-front` };

    const direct = colorImages[variant];
    if (direct) return { url: direct, key: variant };
  }

  let fallbackBack: { url: string; key: string } | undefined;

  for (const [key, url] of Object.entries(colorImages)) {
    if (!url) continue;
    const base = key.replace(/-front$|-back$/i, "");
    if (!colorsEquivalent(base, cleanColor)) continue;
    if (/-front$/i.test(key)) {
      return { url, key };
    }
    if (!fallbackBack) {
      fallbackBack = { url, key };
    }
  }

  return fallbackBack;
}

export function getProductImageForColor(
  product: Pick<Product, "image" | "images" | "colorImages">,
  color: string,
): string {
  const colorImages = getColorImages(product);
  const matched = findColorImageEntry(colorImages, color);
  if (matched?.url) return matched.url;

  return product.images?.[0] || product.image || "";
}

export function resolveOrderItemDisplayImage(
  item: Pick<OrderItem, "productId" | "productImage" | "color" | "product">,
  products: Product[],
): string {
  return resolveColorCodedItemImage(item, products);
}

export type ColorCodedLineItem = {
  productId: string;
  productImage?: string | null;
  color?: string;
  product?: Pick<Product, "id" | "image" | "images" | "colorImages">;
};

export function resolveColorCodedItemImage(
  item: ColorCodedLineItem,
  products: Product[],
): string {
  const product =
    item.product ||
    products.find((entry) => String(entry.id) === String(item.productId));

  if (product && item.color) {
    return getProductImageForColor(product, item.color);
  }

  return item.productImage || product?.image || product?.images?.[0] || "";
}

export function isOrderItemImageMismatch(
  item: Pick<OrderItem, "productId" | "productImage" | "color" | "product">,
  products: Product[],
): boolean {
  if (!item.color?.trim()) return false;

  const product =
    item.product ||
    products.find((entry) => String(entry.id) === String(item.productId));

  if (!product) return false;

  const expected = getProductImageForColor(product, item.color);
  const stored = (item.productImage || product.image || "").trim();

  if (!expected || !stored) return false;
  return expected !== stored;
}

export function listProductColors(product: Pick<Product, "colors" | "colorImages">): string[] {
  if (product.colors?.length) return product.colors;
  const colorImages = getColorImages(product);
  return Array.from(
    new Set(
      Object.keys(colorImages).map((key) => key.replace(/-front$|-back$/i, "").trim()).filter(Boolean),
    ),
  );
}
