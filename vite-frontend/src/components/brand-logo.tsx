import { Flame } from "lucide-react";

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
  return <Flame className={className} size={size} aria-label={alt} />;
};
