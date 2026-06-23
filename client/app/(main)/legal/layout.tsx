export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto w-full max-w-site px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      {children}
    </div>
  );
}
