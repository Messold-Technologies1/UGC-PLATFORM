import type { Metadata } from "next";
import { BrandCreatorsBrowser } from "@/features/brand";

export const metadata: Metadata = { title: "Browse Creators" };

export default function BrandCreatorsPage() {
  return (
    <div className="pb-10">
      <BrandCreatorsBrowser />
    </div>
  );
}
