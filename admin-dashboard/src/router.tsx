import { createBrowserRouter } from "react-router";

// Admin Route Guard
import { AdminRouteGuard } from "@/components/admin-route-guard";
import { AdminLayout } from "@/components/admin-layout";

export const adminRouter = createBrowserRouter([
  {
    // Tất cả trang admin đều cần qua Guard xác thực (login inline nếu chưa đăng nhập)
    path: "/",
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
]);
