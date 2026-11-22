
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { router } from "./app/main-router";
  import { ErrorBoundary } from "./components/common/error-boundary";
  import { initClientTelemetry } from "./utils/telemetry";
  import "./styles/index.css";

  // Báo lỗi client + beacon lượt xem trang (fire-and-forget, không chặn hiển thị).
  initClientTelemetry(router);

  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
  