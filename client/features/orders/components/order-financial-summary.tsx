export function OrderFinancialSummary() {
  return (
    <section className="bg-card rounded-3xl p-6 md:p-8 border shadow-sm">
      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6">
        Financial Summary
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground font-medium">Base Deliverable</span>
          <span className="text-card-foreground font-semibold">$450.00</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground font-medium">Usage Rights (12m)</span>
          <span className="text-card-foreground font-semibold">$125.00</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground font-medium">Platform Fee</span>
          <span className="text-card-foreground font-semibold">$28.75</span>
        </div>
        <div className="pt-5 mt-2 border-t flex justify-between items-center">
          <span className="font-bold text-card-foreground">Total Amount</span>
          <span className="text-2xl font-black bg-clip-text text-transparent bg-linear-to-r from-primary to-secondary">
            $603.75
          </span>
        </div>
      </div>
    </section>
  );
}
