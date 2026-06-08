import type { Metadata } from "next";
import { BrandCreatorsBrowser } from "@/features/brands/components/brand-creators-browser.lazy";

export const metadata: Metadata = { title: "Browse Creators" };

export default function BrandCreatorsPage() {
  return (
    <div className="flex-1 flex flex-col min-h-full">
      <BrandCreatorsBrowser />
    </div>
  );
}
