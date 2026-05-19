import { Shield, Clock, Video, Users } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: Users,
    title: "Trusted by 500+ brands",
    subtitle: "For UGC content production",
  },
  {
    icon: Video,
    title: "10,000+ videos delivered",
    subtitle: "Across India",
  },
  {
    icon: Clock,
    title: "On-time delivery",
    subtitle: "95%+ orders delivered on time",
  },
  {
    icon: Shield,
    title: "Secure payments",
    subtitle: "Safe, simple & reliable",
  },
] as const;

export function TrustStrip() {
  return (
    <div className="rounded-md border border-border bg-muted/30 py-6 mt-4">
      <div className="px-6 sm:px-8 lg:px-10">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background border border-border">
                <item.icon className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
