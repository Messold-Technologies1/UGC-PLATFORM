export default function AuthLoading() {
  return (
    <div className="grid min-h-dvh animate-pulse lg:grid-cols-2">
      <div className="hidden bg-muted lg:block" />
      <div className="flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm space-y-6">
          <div className="h-9 w-64 rounded bg-muted" />
          <div className="h-4 w-48 rounded bg-muted" />
          <div className="mt-8 h-11 w-full rounded-lg bg-muted" />
          <div className="space-y-4">
            <div className="h-10 w-full rounded-lg bg-muted" />
            <div className="h-10 w-full rounded-lg bg-muted" />
            <div className="h-11 w-full rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
