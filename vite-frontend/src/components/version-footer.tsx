import { siteConfig } from "@/config/site";

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
  const repoUrl = siteConfig.github_repo;
  const releaseUrl = `${repoUrl}/releases/tag/${version}`;

  return (
    <div className={containerClassName}>
      <a
        className={`${versionClassName} inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur px-3 py-1 no-underline transition-all hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm`}
        href={releaseUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        v{version}
      </a>
    </div>
  );
}
