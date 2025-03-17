import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import App from "./App";
import ErrorPage from "./components/ErrorPage";

const queryClient = new QueryClient();
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary
        FallbackComponent={({ error, resetErrorBoundary }) => (
          <ErrorPage
            resetErrorBoundary={resetErrorBoundary}
            error={error}
            color="light"
          />
        )}
      >
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);
