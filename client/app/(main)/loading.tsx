export default function MainLoading() {
  return (
    <div className="animate-pulse">
      <div className="mx-auto max-w-site px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto h-8 w-48 rounded-full bg-muted" />
          <div className="mx-auto mt-6 h-14 w-full max-w-xl rounded-xl bg-muted" />
          <div className="mx-auto mt-4 h-5 w-96 rounded bg-muted" />
          <div className="mt-10 flex justify-center gap-3">
            <div className="h-10 w-36 rounded-lg bg-muted" />
            <div className="h-10 w-24 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
      <div className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-site grid-cols-2 gap-8 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto h-9 w-20 rounded bg-muted" />
              <div className="mx-auto mt-2 h-4 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
