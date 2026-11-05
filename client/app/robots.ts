import type { MetadataRoute } from "next";

import { SITE_URL } from "@/config/site";

const BASE_URL = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/creator/settings"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
