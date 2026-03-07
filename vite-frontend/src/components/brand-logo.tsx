import { useEffect, useState } from "react";

import { siteConfig, getCachedConfigs } from "@/config/site";
import fallbackBrandIcon from "@/images/icon.png";

type BrandLogoProps = {
  size?: number;
  className?: string;
  alt?: string;
};

export const BrandLogo = ({
  size = 24,
  className,
  alt = "brand logo",
}: BrandLogoProps) => {
  const [logoUrl, setLogoUrl] = useState<string>(siteConfig.app_logo || "");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const syncLogo = async () => {
      try {
        const configMap = await getCachedConfigs();
        const nextLogo = (
          configMap.app_logo ||
          siteConfig.app_logo ||
          ""
        ).trim();

        if (!mounted) {
          return;
        }

        siteConfig.app_logo = nextLogo;
        setLogoUrl(nextLogo);
        setImageFailed(false);
      } catch {
        if (!mounted) {
          return;
        }
        setLogoUrl((siteConfig.app_logo || "").trim());
      }
    };

    void syncLogo();

    const handleConfigUpdate = () => {
      const nextLogo = (siteConfig.app_logo || "").trim();

      setLogoUrl(nextLogo);
      setImageFailed(false);
      void syncLogo();
    };

    window.addEventListener("configUpdated", handleConfigUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("configUpdated", handleConfigUpdate);
    };
  }, []);

  if (!logoUrl || imageFailed) {
    return (
      <img
        alt={alt}
        className={className}
        height={size}
        src={fallbackBrandIcon}
        width={size}
      />
    );
  }

  return (
    <img
      alt={alt}
      className={className}
      height={size}
      src={logoUrl}
      width={size}
      onError={() => setImageFailed(true)}
    />
  );
};
