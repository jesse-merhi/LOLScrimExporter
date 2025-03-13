import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AppErrorBoundary from "./components/AppErrorBoundary";

const queryClient = new QueryClient();
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);
