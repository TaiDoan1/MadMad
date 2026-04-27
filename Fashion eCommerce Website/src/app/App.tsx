import { RouterProvider } from "react-router";

import { router } from "@/app/main-router";
import { AppProviders } from "@/app/providers/app-providers";

export default function App() {
  return (
    <AppProviders>
        <RouterProvider router={router} />
    </AppProviders>
  );
}