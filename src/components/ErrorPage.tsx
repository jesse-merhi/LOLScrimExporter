function ErrorPage({ error }: { error?: string | null | undefined }) {
  return (
    <div className="h-full w-full flex items-center justify-center">
      An error has occurred {error}
    </div>
  );
}

export default ErrorPage;
