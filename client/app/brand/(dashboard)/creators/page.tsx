import type { Metadata } from "next";
import { BrandCreatorsBrowser } from "@/features/brand";
import { fetchCreatorsListServer } from "@/features/creators/api/fetch-creators-list.server";

export const metadata: Metadata = { title: "Browse Creators" };

export default async function BrandCreatorsPage() {
  const initialData = await fetchCreatorsListServer({
    page: 1,
    limit: 20,
    includeCookies: true,
    revalidate: false,
  });

  return (
    <div className="pb-10">
      <BrandCreatorsBrowser initialData={initialData} />
    </div>
  );
}
