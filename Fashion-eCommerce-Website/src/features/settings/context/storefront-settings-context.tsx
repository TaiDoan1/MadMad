import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";

import { brandLogo } from "@/assets/images";
import type { StorefrontSettings } from "@/types/storefront-settings";
import { DEFAULT_SIZE_GUIDE_CONFIG, normalizeSizeGuideConfig } from "@/utils/size-recommendation";
import { API_URL, getAdminKey } from "@/config/api";
import { safeLocalStorage } from "@/utils/safe-storage";
import { enqueue, peekQueue, removeFromQueue } from "@/utils/offline-queue";

const STOREFRONT_SETTINGS_STORAGE_KEY = "fashion-ecommerce.admin-settings-v2";
const SETTINGS_OFFLINE_QUEUE_KEY = "madmad.offline.queue.settings";

export const DEFAULT_STOREFRONT_SETTINGS: StorefrontSettings = {
  logo: brandLogo,
  storeName: "MADMAD Studio",
  storeEmail: "mmadmadstudio@gmail.com",
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
  productOptions: {
    categories: ["Váy", "Áo Thun", "Áo Khoác", "Áo Sơ Mi"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: ["Trắng", "Đen", "Xám", "Đỏ", "Navy", "Be"],
    tags: ["new", "hot", "best-seller", "pre-order"],
  },
  membershipTiers: [],
  sizeGuide: DEFAULT_SIZE_GUIDE_CONFIG,
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
  printInvoiceSubheader: "Tối giản . Độc bản . Cao cấp",
  printInvoiceBankId: "MB",
  printInvoiceBankAccount: "0999999999",
  printInvoiceAccountName: "MADMAD STUDIO",
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpUser: "mmadmadstudio@gmail.com",
  smtpPass: "yxmbctjhsxkyeznx",
  smtpSenderName: "MADMAD STUDIO",
  customerEmailSubject: "[{{brandName}}] ĐẶT HÀNG THÀNH CÔNG - ĐƠN HÀNG {{orderNumber}}",
  customerEmailTemplate: "Chào bạn <strong>{{customerName}}</strong>,<br><br>Cám ơn bạn đã lựa chọn nổi loạn và khẳng định cá tính cùng <strong>{{brandName}}</strong>. Chúng tôi xác nhận đã nhận được đơn hàng của bạn và đang tiến hành đóng gói siêu tốc!",
  
  // 💳 Cổng Thanh Toán & Vận Chuyển Mặc định
  bankId: "MB",
  bankAccount: "0999999999",
  bankAccountName: "MADMAD STUDIO",
  momoPhone: "0999999999",
  momoAccountName: "MADMAD STUDIO",
  shippingFeeStandard: 30000,
  shippingFeeExpress: 60000,
  shippingFreeThreshold: 500000,
  shippingExpressCities: "79,01", // Mặc định hỗ trợ TP.HCM (79) và Hà Nội (01)
  enableCod: true,
  enableBank: true,
  enableMomo: true,
  enablePaypal: true,
  orderAutoCancelHours: 24,

  // 🌐 Cấu hình Tiền tệ & Ngoại thương quốc tế
  currencyMode: "auto",
  exchangeRate: 25000,
  intlConversionFeePercent: 3.5,
  intlShippingFee: 250000,
  intlMarkupPercent: 10,
};

interface StorefrontSettingsContextValue {
  settings: StorefrontSettings;
  updateSettings: (payload: Partial<StorefrontSettings>) => void;
}

const StorefrontSettingsContext = createContext<StorefrontSettingsContextValue | undefined>(undefined);

type CloudSettings = Record<string, any>;

function mapCloudToLocal(cloud: CloudSettings): Partial<StorefrontSettings> {
  if (!cloud || typeof cloud !== "object") return {};
  const storeName = typeof cloud.storeName === "string" && cloud.storeName.trim()
    ? cloud.storeName
    : (typeof cloud.brandName === "string" ? cloud.brandName : undefined);
  const logo = typeof cloud.logoUrl === "string" && cloud.logoUrl.trim() ? cloud.logoUrl : undefined;

  return {
    ...cloud,
    ...(storeName ? { storeName } : {}),
    ...(logo ? { logo } : {}),
  };
}

function mapLocalPayloadToCloud(payload: Partial<StorefrontSettings>): Record<string, any> {
  const cloud: Record<string, any> = { ...payload };
  if ("logo" in payload) {
    cloud.logoUrl = payload.logo;
    delete cloud.logo;
  }
  if ("storeName" in payload) {
    // Giữ đồng bộ cả 2 field (brandName và storeName) để template email dùng {{brandName}} luôn đúng.
    cloud.storeName = payload.storeName;
    cloud.brandName = payload.storeName;
  }
  return cloud;
}

function readStoredSettings(): StorefrontSettings {
  if (typeof window === "undefined") {
    return DEFAULT_STOREFRONT_SETTINGS;
  }

  const raw = safeLocalStorage.getItem(STOREFRONT_SETTINGS_STORAGE_KEY);
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
      printInvoiceSubheader:
        typeof parsed.printInvoiceSubheader === "string" ? parsed.printInvoiceSubheader : DEFAULT_STOREFRONT_SETTINGS.printInvoiceSubheader,
      printInvoiceBankId:
        typeof parsed.printInvoiceBankId === "string" ? parsed.printInvoiceBankId : DEFAULT_STOREFRONT_SETTINGS.printInvoiceBankId,
      printInvoiceBankAccount:
        typeof parsed.printInvoiceBankAccount === "string" ? parsed.printInvoiceBankAccount : DEFAULT_STOREFRONT_SETTINGS.printInvoiceBankAccount,
      printInvoiceAccountName:
        typeof parsed.printInvoiceAccountName === "string" ? parsed.printInvoiceAccountName : DEFAULT_STOREFRONT_SETTINGS.printInvoiceAccountName,
      smtpHost:
        typeof parsed.smtpHost === "string" ? parsed.smtpHost : DEFAULT_STOREFRONT_SETTINGS.smtpHost,
      smtpPort:
        typeof parsed.smtpPort === "number" ? parsed.smtpPort : DEFAULT_STOREFRONT_SETTINGS.smtpPort,
      smtpUser:
        typeof parsed.smtpUser === "string" ? parsed.smtpUser : DEFAULT_STOREFRONT_SETTINGS.smtpUser,
      smtpPass:
        typeof parsed.smtpPass === "string" ? parsed.smtpPass : DEFAULT_STOREFRONT_SETTINGS.smtpPass,
      smtpSenderName:
        typeof parsed.smtpSenderName === "string" ? parsed.smtpSenderName : DEFAULT_STOREFRONT_SETTINGS.smtpSenderName,
      customerEmailSubject:
        typeof parsed.customerEmailSubject === "string" ? parsed.customerEmailSubject : DEFAULT_STOREFRONT_SETTINGS.customerEmailSubject,
      customerEmailTemplate:
        typeof parsed.customerEmailTemplate === "string" ? parsed.customerEmailTemplate : DEFAULT_STOREFRONT_SETTINGS.customerEmailTemplate,
      bankId:
        typeof parsed.bankId === "string" ? parsed.bankId : DEFAULT_STOREFRONT_SETTINGS.bankId,
      bankAccount:
        typeof parsed.bankAccount === "string" ? parsed.bankAccount : DEFAULT_STOREFRONT_SETTINGS.bankAccount,
      bankAccountName:
        typeof parsed.bankAccountName === "string" ? parsed.bankAccountName : DEFAULT_STOREFRONT_SETTINGS.bankAccountName,
      momoPhone:
        typeof parsed.momoPhone === "string" ? parsed.momoPhone : DEFAULT_STOREFRONT_SETTINGS.momoPhone,
      momoAccountName:
        typeof parsed.momoAccountName === "string" ? parsed.momoAccountName : DEFAULT_STOREFRONT_SETTINGS.momoAccountName,
      shippingFeeStandard:
        typeof parsed.shippingFeeStandard === "number" ? parsed.shippingFeeStandard : DEFAULT_STOREFRONT_SETTINGS.shippingFeeStandard,
      shippingFeeExpress:
        typeof parsed.shippingFeeExpress === "number" ? parsed.shippingFeeExpress : DEFAULT_STOREFRONT_SETTINGS.shippingFeeExpress,
      shippingFreeThreshold:
        typeof parsed.shippingFreeThreshold === "number" ? parsed.shippingFreeThreshold : DEFAULT_STOREFRONT_SETTINGS.shippingFreeThreshold,
      shippingExpressCities:
        typeof parsed.shippingExpressCities === "string" ? parsed.shippingExpressCities : DEFAULT_STOREFRONT_SETTINGS.shippingExpressCities,
      enableCod:
        typeof parsed.enableCod === "boolean" ? parsed.enableCod : DEFAULT_STOREFRONT_SETTINGS.enableCod,
      enableBank:
        typeof parsed.enableBank === "boolean" ? parsed.enableBank : DEFAULT_STOREFRONT_SETTINGS.enableBank,
      enableMomo:
        typeof parsed.enableMomo === "boolean" ? parsed.enableMomo : DEFAULT_STOREFRONT_SETTINGS.enableMomo,
      enablePaypal:
        typeof parsed.enablePaypal === "boolean" ? parsed.enablePaypal : DEFAULT_STOREFRONT_SETTINGS.enablePaypal,
      orderAutoCancelHours:
        typeof parsed.orderAutoCancelHours === "number" ? parsed.orderAutoCancelHours : DEFAULT_STOREFRONT_SETTINGS.orderAutoCancelHours,
      currencyMode:
        parsed.currencyMode === "auto" || parsed.currencyMode === "manual" ? parsed.currencyMode : DEFAULT_STOREFRONT_SETTINGS.currencyMode,
      exchangeRate:
        typeof parsed.exchangeRate === "number" ? parsed.exchangeRate : DEFAULT_STOREFRONT_SETTINGS.exchangeRate,
      intlConversionFeePercent:
        typeof parsed.intlConversionFeePercent === "number" ? parsed.intlConversionFeePercent : DEFAULT_STOREFRONT_SETTINGS.intlConversionFeePercent,
      intlShippingFee:
        typeof parsed.intlShippingFee === "number" ? parsed.intlShippingFee : DEFAULT_STOREFRONT_SETTINGS.intlShippingFee,
      intlMarkupPercent:
        typeof parsed.intlMarkupPercent === "number" ? parsed.intlMarkupPercent : DEFAULT_STOREFRONT_SETTINGS.intlMarkupPercent,

      productOptions:
        typeof parsed.productOptions === "object" && parsed.productOptions
          ? parsed.productOptions
          : DEFAULT_STOREFRONT_SETTINGS.productOptions,
      membershipTiers:
        Array.isArray(parsed.membershipTiers) ? parsed.membershipTiers : DEFAULT_STOREFRONT_SETTINGS.membershipTiers,
      sizeGuide: normalizeSizeGuideConfig(parsed.sizeGuide ?? DEFAULT_STOREFRONT_SETTINGS.sizeGuide),
    };
  } catch {
    return DEFAULT_STOREFRONT_SETTINGS;
  }
}

export function StorefrontSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StorefrontSettings>(readStoredSettings);

  const flushSettingsQueue = async () => {
    const items = peekQueue<Partial<StorefrontSettings>>(SETTINGS_OFFLINE_QUEUE_KEY);
    if (items.length === 0) return;
    // Merge payloads in order; last-write-wins
    const merged = items.reduce((acc, it) => ({ ...acc, ...it.payload }), {} as Partial<StorefrontSettings>);
    const cloudPayload = mapLocalPayloadToCloud(merged);
    try {
      const res = await fetch(`${API_URL}/settings`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-key": getAdminKey()
        },
        body: JSON.stringify(cloudPayload),
      });
      if (res.ok) {
        removeFromQueue(SETTINGS_OFFLINE_QUEUE_KEY, items.map((i) => i.id));
      }
    } catch {
      // keep queue
    }
  };

  // 📥 Tải đồng bộ cấu hình từ Postgres Cloud khi load app
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_URL}/settings`);
        if (response.ok) {
          const cloudSettings = (await response.json()) as CloudSettings;
          console.log("⚙️ [Frontend Context] Synced settings from Cloud:", {
            enableCod: cloudSettings.enableCod,
            enableBank: cloudSettings.enableBank,
            enableMomo: cloudSettings.enableMomo,
            enablePaypal: cloudSettings.enablePaypal,
          });
          setSettings((current) => ({
            ...current,
            ...mapCloudToLocal(cloudSettings),
            sizeGuide: normalizeSizeGuideConfig(cloudSettings.sizeGuide ?? current.sizeGuide),
          }));

          // If we have offline changes queued, try to flush now
          flushSettingsQueue();
        }
      } catch (err) {
        console.warn("⚠️ Không đồng bộ được cấu hình từ Postgres Cloud:", err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const onOnline = () => {
      flushSettingsQueue();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const value = useMemo<StorefrontSettingsContextValue>(
    () => ({
      settings,
      updateSettings: (payload) => {
        console.log("📤 [Frontend Context] Updating settings locally & syncing to Cloud:", payload);
        setSettings((currentSettings) => {
          const nextSettings = { ...currentSettings, ...payload };
          safeLocalStorage.setItem(STOREFRONT_SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));

          // 📤 Tự động đồng bộ PUT lên Postgres DB
          const cloudPayload = mapLocalPayloadToCloud(payload);
          fetch(`${API_URL}/settings`, {
            method: "PUT",
            headers: { 
              "Content-Type": "application/json",
              "x-admin-key": getAdminKey()
            },
            body: JSON.stringify(cloudPayload),
          })
            .then((res) => {
              if (res.ok) {
                flushSettingsQueue();
                return;
              }
              enqueue(SETTINGS_OFFLINE_QUEUE_KEY, payload);
            })
            .catch((err) => {
              console.warn("⚠️ Lỗi đồng bộ cài đặt lên Postgres:", err);
              enqueue(SETTINGS_OFFLINE_QUEUE_KEY, payload);
            });

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
