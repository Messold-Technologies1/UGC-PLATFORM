"use client";

import { useEffect } from "react";

/**
 * @see https://www.tawk.to/
 */
export function TawkToChat() {
  useEffect(() => {
    if (document.getElementById("tawk-to-script")) return;

    const script = document.createElement("script");
    script.id = "tawk-to-script";
    script.async = true;
    script.src = "https://embed.tawk.to/6a2a91011ed8571c315197bc/1jqr4cs64";
    // script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.body.appendChild(script);
  }, []);

  return null;
}
