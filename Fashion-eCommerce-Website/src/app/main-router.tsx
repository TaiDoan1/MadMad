import { createBrowserRouter } from "react-router";

import { MainLayout } from "@/components/layouts/main-layout";
import { HomePage } from "@/pages/home/home-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      {
        index: true,
        // Trang chủ tải eager (import tĩnh ở đầu file): không thêm 1 vòng
        // fetch chunk sau khi bundle chính load xong. Các route còn lại giữ lazy.
        Component: HomePage,
      },
      {
        path: "shop",
        lazy: async () => {
          const module = await import("@/pages/shop/shop-page");
          return { Component: module.ShopPage };
        },
      },
      {
        path: "product/:id",
        lazy: async () => {
          const module = await import("@/pages/product-detail/product-detail-page");
          return { Component: module.ProductDetailPage };
        },
      },
      {
        path: "cart",
        lazy: async () => {
          const module = await import("@/pages/cart/cart-page");
          return { Component: module.CartPage };
        },
      },
      {
        path: "about",
        lazy: async () => {
          const module = await import("@/pages/about/about-page");
          return { Component: module.AboutPage };
        },
      },
      {
        path: "contact",
        lazy: async () => {
          const module = await import("@/pages/contact/contact-page");
          return { Component: module.ContactPage };
        },
      },
      {
        path: "membership",
        lazy: async () => {
          const module = await import("@/pages/membership/membership-page");
          return { Component: module.MembershipPage };
        },
      },
      {
        path: "track-order",
        lazy: async () => {
          const module = await import("@/pages/track-order/track-order-page");
          return { Component: module.TrackOrderPage };
        },
      },
    ],
  },
  {
    path: "/admin",
    lazy: async () => {
      const module = await import("@/components/auth/admin-route-guard");
      return { Component: module.AdminRouteGuard };
    },
    children: [
      {
        path: "",
        lazy: async () => {
          const module = await import("@/components/layouts/admin-layout");
          return { Component: module.AdminLayout };
        },
        children: [
      {
        index: true,
        lazy: async () => {
          const module = await import("@/pages/admin/dashboard-page");
          return { Component: module.AdminDashboardPage };
        },
      },
      {
        path: "products",
        lazy: async () => {
          const module = await import("@/pages/admin/products-page");
          return { Component: module.AdminProductsPage };
        },
      },
      {
        path: "designs",
        lazy: async () => {
          const module = await import("@/pages/admin/designs-page");
          return { Component: module.AdminDesignsPage };
        },
      },
      {
        path: "orders",
        lazy: async () => {
          const module = await import("@/pages/admin/orders-page");
          return { Component: module.AdminOrdersPage };
        },
      },
      {
        path: "marketing",
        lazy: async () => {
          const module = await import("@/pages/admin/marketing-page");
          return { Component: module.AdminMarketingPage };
        },
      },
      {
        path: "inventory",
        lazy: async () => {
          const module = await import("@/pages/admin/inventory-page");
          return { Component: module.AdminInventoryPage };
        },
      },
      {
        path: "settings",
        lazy: async () => {
          const module = await import("@/pages/admin/settings-page");
          return { Component: module.AdminSettingsPage };
        },
      },
      {
        path: "membership",
        lazy: async () => {
          const module = await import("@/pages/admin/membership-page");
          return { Component: module.AdminMembershipPage };
        },
      },
      {
        path: "storefront",
        lazy: async () => {
          const module = await import("@/pages/admin/storefront-page");
          return { Component: module.AdminStorefrontPage };
        },
      },
        ],
      },
    ],
  },
  {
    path: "/checkout",
    lazy: async () => {
      const module = await import("@/pages/checkout/checkout-page");
      return { Component: module.CheckoutPage };
    },
  },
]);
