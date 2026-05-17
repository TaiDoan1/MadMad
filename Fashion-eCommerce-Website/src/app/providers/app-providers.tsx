import type { ReactNode } from "react";

import { AdminAuthProvider } from "@/features/auth/context/admin-auth-context";
import { CartProvider } from "@/features/cart/context/cart-context";
import { MembershipProvider } from "@/features/membership/context/membership-context";
import { OrderProvider } from "@/features/orders/context/order-context";
import { ProductProvider } from "@/features/products/context/product-context";
import { StorefrontSettingsProvider } from "@/features/settings/context/storefront-settings-context";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <StorefrontSettingsProvider>
        <CartProvider>
          <ProductProvider>
            <MembershipProvider>
              <OrderProvider>{children}</OrderProvider>
            </MembershipProvider>
          </ProductProvider>
        </CartProvider>
      </StorefrontSettingsProvider>
    </AdminAuthProvider>
  );
}

