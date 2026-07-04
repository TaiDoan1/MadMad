import { RouterProvider } from "react-router";
import { adminRouter } from "@/router";
import { AdminProviders } from "@/admin-providers";
import { ErrorBoundary } from "@/components/common/error-boundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AdminProviders>
        <RouterProvider router={adminRouter} />
      </AdminProviders>
    </ErrorBoundary>
  );
}
