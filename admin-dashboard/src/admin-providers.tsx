import type { ReactNode } from "react";

import { AdminAuthProvider } from "@/features/auth/context/admin-auth-context";
import { LanguageProvider } from "@/features/settings/context/language-context";
import { MembershipProvider } from "@/features/membership/context/membership-context";
import { MarketingProvider } from "@/features/marketing/context/marketing-context";
import { OrderProvider } from "@/features/orders/context/order-context";
import { ProductProvider } from "@/features/products/context/product-context";
import { StorefrontSettingsProvider } from "@/features/settings/context/storefront-settings-context";
import { ToastProvider } from "@/components/common/toast";

// Admin không cần CartProvider (Giỏ hàng là tính năng Storefront)
export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AdminAuthProvider>
        <StorefrontSettingsProvider>
          <LanguageProvider>
            <ProductProvider>
              <MarketingProvider>
                <MembershipProvider>
                  <OrderProvider>{children}</OrderProvider>
                </MembershipProvider>
              </MarketingProvider>
            </ProductProvider>
          </LanguageProvider>
        </StorefrontSettingsProvider>
      </AdminAuthProvider>
    </ToastProvider>
  );
}
