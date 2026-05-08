export interface StorefrontSettings {
  logo: string;
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  heroImage: string;
  heroImages: string[];
  heroImageScalePercent: number;
  heroSlideIntervalMs: number;
  heroBadgeText: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroDescription: string;
  heroButtonText: string;
  heroOverlayOpacityLeft: number;
  heroOverlayOpacityMiddle: number;
  heroOverlayOpacityRight: number;
  heroContentAlign: "left" | "center" | "right";
  heroFontStyle: "default" | "serif" | "mono";
  popularCategoryImages: string[];
  bestSellerProductIds: number[];
  bestSellerImageOverrides: Record<number, string>;
  colorHexMap: Record<string, string>;
}
