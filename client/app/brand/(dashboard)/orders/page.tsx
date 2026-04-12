import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Orders',
};

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          View and manage your collaborations.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">No orders yet.</p>
        </div>
      </div>
    </div>
  );
}
