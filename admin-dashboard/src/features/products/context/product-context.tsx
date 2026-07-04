import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { API_URL, markLocalBackendOffline, getAdminKey } from "@/config/api";

import { products as initialProducts } from "@/features/products/data/products";
import type { Product } from "@/types/product";
import { useToast } from "@/components/common/toast";
import { safeLocalStorage } from "@/utils/safe-storage";
import { syncProductStock } from "@/utils/product-stock";

interface ProductContextValue {
  products: Product[];
  isLoading: boolean;
  apiError: string | null;
  refreshProducts: () => Promise<void>;
  addProduct: (product: Product) => void;
  updateProduct: (id: string | number, product: Product) => void;
  deleteProduct: (id: string | number) => void;
  updateProductColorImages: (id: string | number, colorImages: Record<string, string>) => void;
  reorderProducts: (newOrderedList: Product[]) => void;
  reconnectLocalhost: () => void;
}

const ProductContext = createContext<ProductContextValue | undefined>(undefined);
const PRODUCTS_STORAGE_KEY = "fashion-ecommerce.products-v7";

export function ProductProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = safeLocalStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as Product[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      // Lọc bỏ mọi sản phẩm mock cũ (ID < 100) khỏi local cache của products
      return parsed.filter((p) => !(!isNaN(Number(p.id)) && Number(p.id) < 100));
    } catch {
      return [];
    }
  });

  // 📥 Tải danh sách sản phẩm từ máy chủ (Database Neon Postgres)
  const loadProducts = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      // Thêm tham số _cb=timestamp để vượt qua mọi tầng cache trình duyệt/CDN một cách triệt để
      const url = `${API_URL}/products?_cb=${Date.now()}`;
      const response = await fetch(url, {
        headers: { "x-admin-key": getAdminKey() }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setProducts(data.map((product: Product) => syncProductStock(product)));
          setIsLoading(false);
          return;
        } else {
          setApiError("Cấu trúc dữ liệu API không hợp lệ: Không phải là một mảng.");
        }
      } else {
        const errText = await response.text().catch(() => "");
        setApiError(`Lỗi máy chủ HTTP ${response.status}: ${response.statusText || ""}. Chi tiết: ${errText.substring(0, 100)}`);
      }
    } catch (error: any) {
      // Tự động chuyển hướng sang Production live nếu local bị kết nối lỗi (Offline)
      if (API_URL.includes("localhost")) {
        markLocalBackendOffline(true);
        setTimeout(() => {
          window.location.reload();
        }, 150);
        return;
      }
      
      setApiError(`Không thể kết nối đến API máy chủ: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);


  useEffect(() => {
    if (!isLoading) {
      safeLocalStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
    }
  }, [products, isLoading]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PRODUCTS_STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as Product[];
        if (Array.isArray(parsed)) {
          setProducts(parsed.map((product) => syncProductStock(product)));
        }
      } catch {
        // ignore invalid cache payloads
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleUpdateProduct = async (id: string | number, updatedProduct: Product) => {
    const normalizedProduct = syncProductStock(updatedProduct);
    const oldProducts = [...products];
    setProducts((currentProducts) =>
      currentProducts.map((product) => (product.id === id ? normalizedProduct : product))
    );
    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedProduct),
      });
      if (response.ok) {
        const savedProduct = await response.json();
        const mergedProduct = syncProductStock({
          ...normalizedProduct,
          ...savedProduct,
          isPreOrder: savedProduct?.isPreOrder ?? normalizedProduct.isPreOrder,
          preOrderDays: savedProduct?.preOrderDays ?? normalizedProduct.preOrderDays,
          isGiftProduct: savedProduct?.isGiftProduct ?? normalizedProduct.isGiftProduct,
          giftConditions: savedProduct?.giftConditions ?? normalizedProduct.giftConditions,
          sizeGuideProfile: savedProduct?.sizeGuideProfile ?? normalizedProduct.sizeGuideProfile,
          sizeGuideOverride: savedProduct?.sizeGuideOverride ?? normalizedProduct.sizeGuideOverride,
        });
        setProducts((currentProducts) =>
          currentProducts.map((product) => (product.id === id ? mergedProduct : product))
        );
        showToast("Cập nhật sản phẩm thành công!", "success");
      } else {
        const errText = await response.text();
        let errMsg = "Lỗi khi cập nhật sản phẩm!";
        try {
          const errJson = JSON.parse(errText);
          if (errJson.message) errMsg = errJson.message;
        } catch {}
        setProducts(oldProducts);
        showToast(errMsg, "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ khi cập nhật!", "error");
    }
  };

  const value = useMemo<ProductContextValue>(
    () => ({
      products,
      isLoading,
      apiError,
      refreshProducts: loadProducts,
      addProduct: async (product) => {
        const tempId = `temp-${Date.now()}`;
        // Dùng timestamp để tạo SKU duy nhất, tránh trùng lặp với các sản phẩm đã có trong DB
        const sku = product.sku || `MAD-${Date.now().toString(36).toUpperCase()}`;
        const newProduct = syncProductStock({ ...product, id: tempId, sku });
        setProducts((currentProducts) => [...currentProducts, newProduct]);
        try {
          const response = await fetch(`${API_URL}/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newProduct),
          });
          if (response.ok) {
            const savedProduct = await response.json();
            const mergedProduct = syncProductStock({
              ...newProduct,
              ...savedProduct,
              isPreOrder: savedProduct?.isPreOrder ?? newProduct.isPreOrder,
              preOrderDays: savedProduct?.preOrderDays ?? newProduct.preOrderDays,
              isGiftProduct: savedProduct?.isGiftProduct ?? newProduct.isGiftProduct,
              giftConditions: savedProduct?.giftConditions ?? newProduct.giftConditions,
              sizeGuideProfile: savedProduct?.sizeGuideProfile ?? newProduct.sizeGuideProfile,
              sizeGuideOverride: savedProduct?.sizeGuideOverride ?? newProduct.sizeGuideOverride,
            });
            setProducts((currentProducts) =>
              currentProducts.map((p) => (p.id === tempId ? mergedProduct : p))
            );
            showToast("Thêm sản phẩm thành công!", "success");
          } else {
            const errText = await response.text();
            setProducts((currentProducts) => currentProducts.filter((p) => p.id !== tempId));
            let errMsg = "Không thể lưu sản phẩm lên server!";
            try {
              const errJson = JSON.parse(errText);
              if (errJson.message) errMsg = errJson.message;
            } catch {}
            showToast(errMsg, "error");
          }
        } catch {
          showToast("Có lỗi xảy ra khi kết nối máy chủ!", "error");
        }
      },
      updateProduct: handleUpdateProduct,
      deleteProduct: async (id) => {
        const oldProducts = [...products];
        setProducts((currentProducts) => currentProducts.filter((product) => product.id !== id));
        try {
          const response = await fetch(`${API_URL}/products/${id}`, { method: "DELETE" });
          if (response.ok) {
            showToast("Đã xóa sản phẩm thành công!", "success");
          } else {
            setProducts(oldProducts);
            showToast("Không thể xóa sản phẩm trên server!", "error");
          }
        } catch {
          showToast("Lỗi kết nối máy chủ khi xóa sản phẩm!", "error");
        }
      },
      updateProductColorImages: async (id, colorImages) => {
        const product = products.find((p) => String(p.id) === String(id));
        if (!product) return;
        const updatedProduct = { ...product, colorImages };
        await handleUpdateProduct(id, updatedProduct);
      },
      reorderProducts: (newOrderedList) => {
        setProducts(newOrderedList);
      },
      reconnectLocalhost: () => {
        markLocalBackendOffline(false);
        window.location.reload();
      },
    }),
    [products, isLoading, apiError],
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProducts() {
  const context = useContext(ProductContext);

  if (!context) {
    throw new Error("useProducts must be used within a ProductProvider");
  }

  return context;
}
