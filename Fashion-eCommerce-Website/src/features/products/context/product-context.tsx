import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
      return parsed.length > 0 ? parsed : initialProducts;
    } catch {
      return initialProducts;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  const value = useMemo<ProductContextValue>(
    () => ({
      products,
      addProduct: (product) => {
        setProducts((currentProducts) => [
          ...currentProducts,
          {
            ...product,
            id: Math.max(0, ...currentProducts.map((item) => item.id)) + 1,
          },
        ]);
      },
      updateProduct: (id, updatedProduct) => {
        setProducts((currentProducts) =>
          currentProducts.map((product) => (product.id === id ? updatedProduct : product)),
        );
      },
      deleteProduct: (id) => {
        setProducts((currentProducts) => currentProducts.filter((product) => product.id !== id));
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
