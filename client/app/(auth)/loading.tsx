export default function AuthLoading() {
  return (
    <div className="grid min-h-dvh animate-pulse lg:grid-cols-2">
      <div className="hidden lg:block bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />

      <div className="flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm space-y-6">
          <div className="h-[30px] w-28 rounded-full bg-muted" />
          <div className="h-9 w-72 rounded bg-muted" />
          <div className="h-4 w-56 rounded bg-muted" />
          <div className="mt-8 space-y-4">
            <div className="h-3 w-12 rounded bg-muted" />
            <div className="h-[46px] w-full rounded-xl bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-[46px] w-full rounded-xl bg-muted" />
            <div className="h-[48px] w-full rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
