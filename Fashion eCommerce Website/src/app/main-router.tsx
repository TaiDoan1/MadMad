import { createBrowserRouter } from "react-router";

import { AdminRouteGuard } from "@/components/auth/admin-route-guard";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { MainLayout } from "@/components/layouts/main-layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      {
        index: true,
        lazy: async () => {
          const module = await import("@/pages/home/home-page");
          return { Component: module.HomePage };
        },
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
        path: "checkout",
        lazy: async () => {
          const module = await import("@/pages/checkout/checkout-page");
          return { Component: module.CheckoutPage };
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
    ],
  },
  {
    path: "/admin",
    Component: AdminRouteGuard,
    children: [
      {
        path: "",
        Component: AdminLayout,
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
        path: "orders",
        lazy: async () => {
          const module = await import("@/pages/admin/orders-page");
          return { Component: module.AdminOrdersPage };
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
]);
