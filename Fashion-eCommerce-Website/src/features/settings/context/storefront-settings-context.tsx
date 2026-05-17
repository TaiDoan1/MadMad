import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { brandLogo } from "@/assets/images";
import type { StorefrontSettings } from "@/types/storefront-settings";

const STOREFRONT_SETTINGS_STORAGE_KEY = "fashion-ecommerce.admin-settings-v2";

export const DEFAULT_STOREFRONT_SETTINGS: StorefrontSettings = {
  logo: brandLogo,
  storeName: "MADMAD Studio",
  storeEmail: "contact@madmad.studio",
  storePhone: "+84 123 456 789",
  storeAddress: "123 Fashion Street, Ho Chi Minh City",
  heroImage:
    "https://i.pinimg.com/1200x/fb/f2/73/fbf2733c931be4e147263be4c26dc226.jpg",
  heroImages: [],
  heroImageScalePercent: 100,
  heroSlideIntervalMs: 6000,
  heroBadgeText: "BỘ SƯU TẬP MỚI 2026",
  heroTitleLine1: "THỜI TRANG",
  heroTitleLine2: "ĐƯỜNG PHỐ",
  heroDescription: "Khám phá phong cách street wear độc đáo. Thể hiện cá tính với xu hướng thời trang urban hiện đại.",
  heroButtonText: "MUA NGAY",
  heroOverlayOpacityLeft: 60,
  heroOverlayOpacityMiddle: 40,
  heroOverlayOpacityRight: 60,
  heroContentAlign: "center",
  heroFontStyle: "default",
  popularCategoryImages: [
    "/assets/categories/anh-pho-bien.jpg",
  ],
  bestSellerProductIds: [1, 2, 3, 4],
  bestSellerImageOverrides: {},
  instagramImages: [
    "/assets/categories/anh-pho-bien.jpg",
    "/assets/products/ao-thun-m-den.jpg",
    "/assets/products/sp2-den.jpg",
    "/assets/products/sp3-navy.jpg",
    "/assets/products/ao-thun-m-xam.jpg",
  ],
  colorHexMap: {
    Trắng: "#FFFFFF",
    Đen: "#000000",
    Xám: "#9CA3AF",
    Đỏ: "#C62828",
    Navy: "#001f3f",
    Be: "#E8DCC4",
    Nâu: "#8B4513",
    Camel: "#C19A6B",
    "Xanh/Trắng": "#4299E1",
    "Đỏ/Trắng": "#C62828",
    Sọc: "#374151",
    Hoa: "#EC4899",
  },
  instagramUrl: "https://instagram.com",
  facebookUrl: "https://facebook.com",
  tiktokUrl: "https://tiktok.com",
  shopeeUrl: "https://shopee.vn",
  printInvoiceTitle: "HÓA ĐƠN VẬN CHUYỂN & GÓI HÀNG",
  printInvoiceAddress: "Showroom: 254 Nguyễn Trãi, Q.5, TP.HCM",
  printInvoicePhone: "Hotline: 099.999.9999",
  printInvoiceFooterSlogan: "CẢM ƠN QUÝ KHÁCH ĐÃ CHỌN MADMAD STUDIO!",
  printInvoicePolicy: "* Quý khách vui lòng kiểm tra kỹ sản phẩm khi nhận hàng. Đối với các yêu cầu đổi trả sản phẩm nguyên tag mác, xin hãy nhắn tin trực tiếp fanpage Facebook/Instagram của MADMAD Studio trong vòng 3 ngày kể từ ngày nhận hàng.",
};

interface StorefrontSettingsContextValue {
  settings: StorefrontSettings;
  updateSettings: (payload: Partial<StorefrontSettings>) => void;
}

const StorefrontSettingsContext = createContext<StorefrontSettingsContextValue | undefined>(undefined);

function readStoredSettings(): StorefrontSettings {
  if (typeof window === "undefined") {
    return DEFAULT_STOREFRONT_SETTINGS;
  }

  const raw = window.localStorage.getItem(STOREFRONT_SETTINGS_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_STOREFRONT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StorefrontSettings>;
    return {
      ...DEFAULT_STOREFRONT_SETTINGS,
      ...parsed,
      bestSellerProductIds: Array.isArray(parsed.bestSellerProductIds)
        ? parsed.bestSellerProductIds
        : DEFAULT_STOREFRONT_SETTINGS.bestSellerProductIds,
      bestSellerImageOverrides:
        parsed.bestSellerImageOverrides && typeof parsed.bestSellerImageOverrides === "object"
          ? (parsed.bestSellerImageOverrides as Record<number, string>)
          : DEFAULT_STOREFRONT_SETTINGS.bestSellerImageOverrides,
      colorHexMap:
        parsed.colorHexMap && typeof parsed.colorHexMap === "object"
          ? (parsed.colorHexMap as Record<string, string>)
          : DEFAULT_STOREFRONT_SETTINGS.colorHexMap,
      heroOverlayOpacityLeft:
        typeof parsed.heroOverlayOpacityLeft === "number"
          ? parsed.heroOverlayOpacityLeft
          : DEFAULT_STOREFRONT_SETTINGS.heroOverlayOpacityLeft,
      heroOverlayOpacityMiddle:
        typeof parsed.heroOverlayOpacityMiddle === "number"
          ? parsed.heroOverlayOpacityMiddle
          : DEFAULT_STOREFRONT_SETTINGS.heroOverlayOpacityMiddle,
      heroOverlayOpacityRight:
        typeof parsed.heroOverlayOpacityRight === "number"
          ? parsed.heroOverlayOpacityRight
          : DEFAULT_STOREFRONT_SETTINGS.heroOverlayOpacityRight,
      heroContentAlign:
        parsed.heroContentAlign === "left" || parsed.heroContentAlign === "center" || parsed.heroContentAlign === "right"
          ? parsed.heroContentAlign
          : DEFAULT_STOREFRONT_SETTINGS.heroContentAlign,
      heroFontStyle:
        parsed.heroFontStyle === "default" || parsed.heroFontStyle === "serif" || parsed.heroFontStyle === "mono"
          ? parsed.heroFontStyle
          : DEFAULT_STOREFRONT_SETTINGS.heroFontStyle,
      heroImages:
        Array.isArray(parsed.heroImages)
          ? parsed.heroImages.map((value) => String(value).trim()).filter(Boolean)
          : DEFAULT_STOREFRONT_SETTINGS.heroImages,
      heroImageScalePercent:
        typeof parsed.heroImageScalePercent === "number"
          ? parsed.heroImageScalePercent
          : DEFAULT_STOREFRONT_SETTINGS.heroImageScalePercent,
      heroSlideIntervalMs:
        typeof parsed.heroSlideIntervalMs === "number"
          ? parsed.heroSlideIntervalMs
          : DEFAULT_STOREFRONT_SETTINGS.heroSlideIntervalMs,
      popularCategoryImages:
        Array.isArray(parsed.popularCategoryImages)
          ? parsed.popularCategoryImages.map((value) => String(value).trim()).filter(Boolean)
          : DEFAULT_STOREFRONT_SETTINGS.popularCategoryImages,
      instagramImages:
        Array.isArray(parsed.instagramImages)
          ? parsed.instagramImages.map((value) => String(value).trim()).filter(Boolean)
          : DEFAULT_STOREFRONT_SETTINGS.instagramImages,
      instagramUrl:
        typeof parsed.instagramUrl === "string" ? parsed.instagramUrl : DEFAULT_STOREFRONT_SETTINGS.instagramUrl,
      facebookUrl:
        typeof parsed.facebookUrl === "string" ? parsed.facebookUrl : DEFAULT_STOREFRONT_SETTINGS.facebookUrl,
      tiktokUrl:
        typeof parsed.tiktokUrl === "string" ? parsed.tiktokUrl : DEFAULT_STOREFRONT_SETTINGS.tiktokUrl,
      shopeeUrl:
        typeof parsed.shopeeUrl === "string" ? parsed.shopeeUrl : DEFAULT_STOREFRONT_SETTINGS.shopeeUrl,
      printInvoiceTitle:
        typeof parsed.printInvoiceTitle === "string" ? parsed.printInvoiceTitle : DEFAULT_STOREFRONT_SETTINGS.printInvoiceTitle,
      printInvoiceAddress:
        typeof parsed.printInvoiceAddress === "string" ? parsed.printInvoiceAddress : DEFAULT_STOREFRONT_SETTINGS.printInvoiceAddress,
      printInvoicePhone:
        typeof parsed.printInvoicePhone === "string" ? parsed.printInvoicePhone : DEFAULT_STOREFRONT_SETTINGS.printInvoicePhone,
      printInvoiceFooterSlogan:
        typeof parsed.printInvoiceFooterSlogan === "string" ? parsed.printInvoiceFooterSlogan : DEFAULT_STOREFRONT_SETTINGS.printInvoiceFooterSlogan,
      printInvoicePolicy:
        typeof parsed.printInvoicePolicy === "string" ? parsed.printInvoicePolicy : DEFAULT_STOREFRONT_SETTINGS.printInvoicePolicy,
    };
  } catch {
    return DEFAULT_STOREFRONT_SETTINGS;
  }
}

export function StorefrontSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StorefrontSettings>(readStoredSettings);

  const value = useMemo<StorefrontSettingsContextValue>(
    () => ({
      settings,
      updateSettings: (payload) => {
        setSettings((currentSettings) => {
          const nextSettings = { ...currentSettings, ...payload };
          window.localStorage.setItem(STOREFRONT_SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
          return nextSettings;
        });
      },
    }),
    [settings],
  );

  return <StorefrontSettingsContext.Provider value={value}>{children}</StorefrontSettingsContext.Provider>;
}

export function useStorefrontSettings() {
  const context = useContext(StorefrontSettingsContext);
  if (!context) {
    throw new Error("useStorefrontSettings must be used within a StorefrontSettingsProvider");
  }
  return context;
}
