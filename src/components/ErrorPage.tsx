import { Button } from "./ui/button";

function ErrorPage({
  error,
  resetErrorBoundary,
  color,
}: {
  error: Error;
  resetErrorBoundary: (...args: any[]) => void;
  color: "dark" | "light";
}) {
  console.log(error);
  return (
    <div
      className={`h-full w-full flex items-center justify-center flex-col gap-4 ${
        color === "dark" ? "text-gray-100" : "text-slate-800"
      }`}
    >
      {error.message}
      <Button
        className="bg-foreground hover:bg-gray-900"
        onClick={resetErrorBoundary}
      >
        Retry
      </Button>
    </div>
  );
}

export default ErrorPage;
