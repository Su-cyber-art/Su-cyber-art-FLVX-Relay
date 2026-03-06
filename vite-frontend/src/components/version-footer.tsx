interface VersionFooterProps {
  version: string;
  containerClassName?: string;
  versionClassName?: string;
  poweredClassName?: string;
  updateBadgeClassName?: string;
}

export function VersionFooter({
  version,
  containerClassName,
  versionClassName,
}: VersionFooterProps) {
  return (
    <div className={containerClassName}>
      <p className={versionClassName}>v{version}</p>
    </div>
  );
}
