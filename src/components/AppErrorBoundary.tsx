import { ErrorBoundary } from "react-error-boundary";
import ErrorPage from "./ErrorPage";

function AppErrorBoundary({
  error,
  children,
}: {
  error?: string | null | undefined;
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary fallback={<ErrorPage error={error} />}>
      {children}
    </ErrorBoundary>
  );
}

export default AppErrorBoundary;
