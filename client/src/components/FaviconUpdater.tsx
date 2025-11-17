import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CompanySettings } from "@shared/schema";

export function FaviconUpdater() {
  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ["/api/company/settings"],
  });

  useEffect(() => {
    if (companySettings?.faviconUrl) {
      const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (link) {
        link.href = companySettings.faviconUrl;
      } else {
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        newLink.href = companySettings.faviconUrl;
        document.head.appendChild(newLink);
      }
    }
  }, [companySettings?.faviconUrl]);

  return null;
}
