import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { API_URL } from "@/config/api";

import { products as initialProducts } from "@/features/products/data/products";
import type { Product } from "@/types/product";

interface ProductContextValue {
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: number, product: Product) => void;
  deleteProduct: (id: number) => void;
  updateProductColorImages: (id: number, colorImages: Record<string, string>) => void;
  reorderProducts: (newOrderedList: Product[]) => void;
}

const ProductContext = createContext<ProductContextValue | undefined>(undefined);
const PRODUCTS_STORAGE_KEY = "fashion-ecommerce.products-v7";

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window === "undefined") {
      return initialProducts;
    }

    const raw = window.localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) {
      return initialProducts;
    }

    try {
      const parsed = JSON.parse(raw) as Product[];
      if (!Array.isArray(parsed)) {
        return initialProducts;
      }
      return parsed;
    } catch {
      return initialProducts;
    }
  });

  // 📥 Tải danh sách sản phẩm từ máy chủ (Database Neon Postgres)
  const loadProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setProducts(data);
          return;
        }
      }
    } catch (error) {
      console.warn("⚠️ Không lấy được danh sách sản phẩm từ API, dùng dữ liệu local:", error);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  const value = useMemo<ProductContextValue>(
    () => ({
      products,
      addProduct: async (product) => {
        const newId = Math.max(0, ...products.map((item) => item.id)) + 1;
        const sku = product.sku || `MAD-PR-${String(newId).padStart(4, "0")}`;
        const newProduct = { ...product, id: newId, sku };
        setProducts((currentProducts) => [...currentProducts, newProduct]);
        try {
          await fetch(`${API_URL}/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newProduct),
          });
        } catch (e) {
          console.warn("⚠️ Lỗi lưu sản phẩm lên server, đã lưu local", e);
        }
      },
      updateProduct: async (id, updatedProduct) => {
        setProducts((currentProducts) =>
          currentProducts.map((product) => (product.id === id ? updatedProduct : product)),
        );
        try {
          await fetch(`${API_URL}/products/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedProduct),
          });
        } catch (e) {
          console.warn("⚠️ Lỗi cập nhật sản phẩm lên server, đã lưu local", e);
        }
      },
      deleteProduct: async (id) => {
        setProducts((currentProducts) => currentProducts.filter((product) => product.id !== id));
        try {
          await fetch(`${API_URL}/products/${id}`, { method: "DELETE" });
        } catch (e) {
          console.warn("⚠️ Lỗi xóa sản phẩm trên server, đã xóa local", e);
        }
      },
      updateProductColorImages: (id, colorImages) => {
        setProducts((currentProducts) =>
          currentProducts.map((product) =>
            product.id === id ? { ...product, colorImages } : product,
          ),
        );
      },
      reorderProducts: (newOrderedList) => {
        setProducts(newOrderedList);
      },
    }),
    [products],
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
