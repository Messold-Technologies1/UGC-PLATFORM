interface LegalPageHeaderProps {
  title: string;
  description: string;
  effectiveDate: string;
  lastUpdated?: string;
}

export function LegalPageHeader({
  title,
  description,
  effectiveDate,
  lastUpdated,
}: LegalPageHeaderProps) {
  return (
    <header className="mb-10">
      <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
        {title}
      </h1>

      <hr className="mt-8 border-border" />

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
        {(effectiveDate || lastUpdated) && (
          <p>
            {effectiveDate && (
              <>
                <span className="font-medium text-foreground">
                  Effective Date:
                </span>{" "}
                {effectiveDate}
              </>
            )}
            {lastUpdated && lastUpdated !== effectiveDate && (
              <>
                {effectiveDate ? " · " : ""}
                <span className="font-medium text-foreground">
                  Last Updated:
                </span>{" "}
                {lastUpdated}
              </>
            )}
          </p>
        )}
        {description && <p className="max-w-3xl">{description}</p>}
      </div>
    </header>
  );
}
