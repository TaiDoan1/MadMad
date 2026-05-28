import type { Product } from "@/types/product";
import type { SizeGuideRow } from "@/types/size-guide";

export type ProductSizeGuideAssignmentType = "category" | "profile" | "custom";

export interface ProductSizeGuideAssignment {
  type: ProductSizeGuideAssignmentType;
  profileKey?: string;
}

export function getProductSizeGuideAssignment(product: Product): ProductSizeGuideAssignment {
  if (product.sizeGuideOverride && product.sizeGuideOverride.length > 0) {
    return { type: "custom" };
  }
  if (product.sizeGuideProfile?.trim()) {
    return { type: "profile", profileKey: product.sizeGuideProfile.trim() };
  }
  return { type: "category" };
}

export function describeProductSizeGuideAssignment(product: Product): string {
  const assignment = getProductSizeGuideAssignment(product);
  if (assignment.type === "custom") return "Bảng riêng (chỉ SP này)";
  if (assignment.type === "profile" && assignment.profileKey) {
    return `Bảng chung: ${assignment.profileKey}`;
  }
  return `Theo danh mục: ${product.category || "mặc định"}`;
}

export function applyAssignmentToProduct(
  product: Product,
  assignment: ProductSizeGuideAssignment,
  customRows?: SizeGuideRow[],
): Product {
  if (assignment.type === "custom") {
    return {
      ...product,
      sizeGuideProfile: undefined,
      sizeGuideOverride: customRows?.length ? customRows : product.sizeGuideOverride,
    };
  }
  if (assignment.type === "profile" && assignment.profileKey) {
    return {
      ...product,
      sizeGuideProfile: assignment.profileKey,
      sizeGuideOverride: undefined,
    };
  }
  return {
    ...product,
    sizeGuideProfile: undefined,
    sizeGuideOverride: undefined,
  };
}
