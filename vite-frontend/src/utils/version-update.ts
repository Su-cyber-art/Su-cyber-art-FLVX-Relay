export type UpdateReleaseChannel = "stable" | "dev";

export const UPDATE_CHANNEL_STORAGE_KEY = "update-release-channel";
export const UPDATE_CHANNEL_CHANGED_EVENT = "updateReleaseChannelChanged";

const CHANNEL_STABLE: UpdateReleaseChannel = "stable";
const CHANNEL_DEV: UpdateReleaseChannel = "dev";

const stableVersionPattern = /^\d+(?:\.\d+)+$/;
const testKeywordPattern = /(alpha|beta|rc)/i;

const VERSION_CACHE_TTL_MS = 10 * 60 * 1000;

type ReleaseItem = {
  tag_name?: string;
  draft?: boolean;
};

type LatestVersionCacheEntry = {
  value: string | null;
  expiresAt: number;
};

const latestVersionCache: Record<
  UpdateReleaseChannel,
  LatestVersionCacheEntry
> = {
  stable: { value: null, expiresAt: 0 },
  dev: { value: null, expiresAt: 0 },
};

let latestVersionAnyCache: LatestVersionCacheEntry = {
  value: null,
  expiresAt: 0,
};

const normalizeChannel = (
  value: string | null | undefined,
): UpdateReleaseChannel => {
  return value === CHANNEL_DEV ? CHANNEL_DEV : CHANNEL_STABLE;
};

export const getUpdateReleaseChannel = (): UpdateReleaseChannel => {
  if (typeof window === "undefined") {
    return CHANNEL_STABLE;
  }

  return normalizeChannel(localStorage.getItem(UPDATE_CHANNEL_STORAGE_KEY));
};

export const setUpdateReleaseChannel = (
  channel: UpdateReleaseChannel,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(UPDATE_CHANNEL_STORAGE_KEY, normalizeChannel(channel));
  window.dispatchEvent(new Event(UPDATE_CHANNEL_CHANGED_EVENT));
};

const normalizeTag = (tag: string): string => {
  return tag.trim().replace(/^v/i, "");
};

const isVersionLikeTag = (tag: string): boolean => {
  return /\d/.test(normalizeTag(tag));
};

type ReleaseTagChannel = UpdateReleaseChannel | null;

const releaseChannelFromTag = (tag: string): ReleaseTagChannel => {
  const normalizedTag = normalizeTag(tag).toLowerCase();

  if (!normalizedTag) {
    return null;
  }

  if (stableVersionPattern.test(normalizedTag)) {
    return CHANNEL_STABLE;
  }

  if (testKeywordPattern.test(normalizedTag)) {
    return CHANNEL_DEV;
  }

  return null;
};

type VersionParts = {
  numbers: number[];
  stageRank: number; // stable(4) > rc(3) > beta/b(2) > alpha(1) > other(0)
  stageNumber: number;
};

const parseVersionParts = (version: string): VersionParts => {
  const normalized = normalizeTag(version).toLowerCase();
  const [corePartRaw, ...suffixParts] = normalized.split("-");
  const corePart = corePartRaw || "";
  const suffix = suffixParts.join("-");

  // 只用主版本号做数值比较，避免 2.1.9-b4 把 "4" 当成主版本位
  const numbers = (corePart.match(/\d+/g) || []).map((item) =>
    Number.parseInt(item, 10),
  );

  let stageRank = 0;

  if (stableVersionPattern.test(normalized)) {
    stageRank = 4;
  } else if (/(?:^|[.-])rc(?:[.-]?\d+)?(?:$|[.-])/i.test(suffix)) {
    stageRank = 3;
  } else if (
    /(?:^|[.-])(?:beta|b)(?:[.-]?\d+)?(?:$|[.-])/i.test(suffix)
  ) {
    stageRank = 2;
  } else if (/(?:^|[.-])alpha(?:[.-]?\d+)?(?:$|[.-])/i.test(suffix)) {
    stageRank = 1;
  }

  const stageNumberMatch = suffix.match(/(?:alpha|beta|rc|\bb)(?:[.-]?(\d+))?/i);
  const stageNumber =
    stageNumberMatch && stageNumberMatch[1]
      ? Number.parseInt(stageNumberMatch[1], 10)
      : 0;

  return {
    numbers,
    stageRank,
    stageNumber,
  };
};

export const compareVersions = (left: string, right: string): number => {
  const a = parseVersionParts(left);
  const b = parseVersionParts(right);
  const maxLength = Math.max(a.numbers.length, b.numbers.length);

  for (let i = 0; i < maxLength; i += 1) {
    const aValue = a.numbers[i] || 0;
    const bValue = b.numbers[i] || 0;

    if (aValue !== bValue) {
      return aValue - bValue;
    }
  }

  if (a.stageRank !== b.stageRank) {
    return a.stageRank - b.stageRank;
  }

  if (a.stageNumber !== b.stageNumber) {
    return a.stageNumber - b.stageNumber;
  }

  return 0;
};

const repoPathFromUrl = (repoUrl: string): string | null => {
  try {
    const parsed = new URL(repoUrl);
    const segments = parsed.pathname
      .replace(/\.git$/i, "")
      .split("/")
      .filter(Boolean);

    if (segments.length < 2) {
      return null;
    }

    return `${segments[0]}/${segments[1]}`;
  } catch {
    return null;
  }
};

export const getLatestVersionByChannel = async (
  channel: UpdateReleaseChannel,
  repoUrl: string,
  forceRefresh = false,
): Promise<string | null> => {
  const normalizedChannel = normalizeChannel(channel);
  const now = Date.now();
  const cached = latestVersionCache[normalizedChannel];

  if (!forceRefresh && cached.value && cached.expiresAt > now) {
    return cached.value;
  }

  const repoPath = repoPathFromUrl(repoUrl);

  if (!repoPath) {
    return null;
  }

  const requestUrl = forceRefresh
    ? `https://api.github.com/repos/${repoPath}/releases?per_page=50&t=${now}`
    : `https://api.github.com/repos/${repoPath}/releases?per_page=50`;

  const response = await fetch(requestUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  if (!response.ok) {
    return null;
  }

  const releases = (await response.json()) as ReleaseItem[];
  const candidateTags = releases
    .filter((release) => !release.draft && typeof release.tag_name === "string")
    .map((release) => (release.tag_name || "").trim())
    .filter((tag) => releaseChannelFromTag(tag) === normalizedChannel);

  if (candidateTags.length === 0) {
    return null;
  }

  const latest = candidateTags.sort((a, b) => compareVersions(b, a))[0];

  latestVersionCache[normalizedChannel] = {
    value: latest,
    expiresAt: now + VERSION_CACHE_TTL_MS,
  };

  return latest;
};

export const getLatestVersion = async (
  repoUrl: string,
  forceRefresh = false,
): Promise<string | null> => {
  const now = Date.now();

  if (
    !forceRefresh &&
    latestVersionAnyCache.value &&
    latestVersionAnyCache.expiresAt > now
  ) {
    return latestVersionAnyCache.value;
  }

  const repoPath = repoPathFromUrl(repoUrl);

  if (!repoPath) {
    return null;
  }

  const headers = {
    Accept: "application/vnd.github+json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };

  // 优先使用 GitHub 官方 latest 语义，避免被其他命名分支/系列版本干扰
  const latestUrl = forceRefresh
    ? `https://api.github.com/repos/${repoPath}/releases/latest?t=${now}`
    : `https://api.github.com/repos/${repoPath}/releases/latest`;

  try {
    const latestResponse = await fetch(latestUrl, { headers });

    if (latestResponse.ok) {
      const latestRelease = (await latestResponse.json()) as ReleaseItem;
      const latestTag = (latestRelease.tag_name || "").trim();

      if (isVersionLikeTag(latestTag)) {
        latestVersionAnyCache = {
          value: latestTag,
          expiresAt: now + VERSION_CACHE_TTL_MS,
        };

        return latestTag;
      }
    }
  } catch {
    // ignore and fallback to releases list
  }

  // fallback：兼容 /latest 不可用或异常的场景
  const requestUrl = forceRefresh
    ? `https://api.github.com/repos/${repoPath}/releases?per_page=50&t=${now}`
    : `https://api.github.com/repos/${repoPath}/releases?per_page=50`;

  const response = await fetch(requestUrl, { headers });

  if (!response.ok) {
    return null;
  }

  const releases = (await response.json()) as ReleaseItem[];
  const candidateTags = releases
    .filter((release) => !release.draft && typeof release.tag_name === "string")
    .map((release) => (release.tag_name || "").trim())
    .filter((tag) => isVersionLikeTag(tag));

  if (candidateTags.length === 0) {
    return null;
  }

  const latest = candidateTags.sort((a, b) => compareVersions(b, a))[0];

  latestVersionAnyCache = {
    value: latest,
    expiresAt: now + VERSION_CACHE_TTL_MS,
  };

  return latest;
};

export const hasVersionUpdate = (
  currentVersion: string,
  latestVersion: string,
): boolean => {
  return (
    compareVersions(normalizeTag(currentVersion), normalizeTag(latestVersion)) <
    0
  );
};
