import type { SizeGuideConfig } from "@/types/size-guide";

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
  topBannerImages: string[];
  bestSellerProductIds: (string | number)[];
  bestSellerImageOverrides: Record<string | number, string>;
  colorHexMap: Record<string, string>;
  productOptions?: {
    categories?: string[];
    sizes?: string[];
    colors?: string[];
    tags?: string[];
  };
  membershipTiers?: Array<{
    tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
    minPoints: number;
    discountPercent: number;
    gifts: string;
  }>;
  sizeGuide?: SizeGuideConfig;
  instagramImages: string[];
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  shopeeUrl: string;
  printInvoiceTitle: string;
  printInvoiceAddress: string;
  printInvoicePhone: string;
  printInvoiceFooterSlogan: string;
  printInvoicePolicy: string;
  printInvoiceSubheader?: string;
  printInvoiceBankId?: string;
  printInvoiceBankAccount?: string;
  printInvoiceAccountName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSenderName?: string;
  customerEmailSubject?: string;
  customerEmailTemplate?: string;
  
  // 💳 Cổng Thanh Toán & Vận Chuyển
  bankId?: string;
  bankAccount?: string;
  bankAccountName?: string;
  momoPhone?: string;
  momoAccountName?: string;
  shippingFeeStandard?: number;
  shippingFeeExpress?: number;
  shippingFreeThreshold?: number;
  shippingExpressCities?: string; // Ví dụ: "79,01" (danh sách mã tỉnh/thành phố hỗ trợ giao hỏa tốc)
  
  // ⚙️ Tùy chọn Thanh Toán (Bật/Tắt)
  enableCod?: boolean;
  enableBank?: boolean;
  enableMomo?: boolean;
  enablePaypal?: boolean;
  
  // ⏳ Cấu hình tự động
  orderAutoCancelHours?: number;

  // 🌐 Cấu hình Tiền tệ & Ngoại thương quốc tế
  currencyMode?: "auto" | "manual";
  exchangeRate?: number;
  intlConversionFeePercent?: number;
  intlShippingFee?: number;
  intlMarkupPercent?: number;
}
