#!/bin/bash
# Idempotent de-branding script.
# Safe to run repeatedly — after upstream merge or standalone.
set -e

REPO="Su-cyber-art/Su-cyber-art-FLVX-Relay"
GHCR_OWNER="su-cyber-art"
SITE_HOST="${GHCR_OWNER}.github.io/Su-cyber-art-FLVX-Relay"

cd "$(git rev-parse --show-toplevel)"

# ── 1. Global repo URL replacement ──────────────────────────────────

# install scripts
sed -i 's|REPO="Sagit-chu/flux-panel"|REPO="'"${REPO}"'"|g' install.sh panel_install.sh

# docker-compose GHCR images
sed -i 's|ghcr\.io/sagit-chu/|ghcr.io/'"${GHCR_OWNER}"'/|g' docker-compose-v4.yml docker-compose-v6.yml

# frontend
sed -i 's|Sagit-chu/flux-panel|'"${REPO}"'|g' vite-frontend/src/config/site.ts
sed -i 's|VITE_GITHUB_REPO=https://github.com/Sagit-chu/flvx|VITE_GITHUB_REPO=https://github.com/'"${REPO}"'|g' vite-frontend/.env.production

# backend Go files
find go-backend -name '*.go' -exec sed -i 's|Sagit-chu/flvx|'"${REPO}"'|g' {} +
find go-backend -name '*.go' -exec sed -i 's|Sagit-chu/flux-panel|'"${REPO}"'|g' {} +

# docs
sed -i 's|Sagit-chu/flux-panel|'"${REPO}"'|g' doc/install.md
sed -i 's|Sagit-chu/flvx|'"${REPO}"'|g' doc/ai-skill.md

# skills package.json
sed -i 's|Sagit-chu/flvx|'"${REPO}"'|g' skills/flvx-api/package.json

# mkdocs
sed -i 's|sagit-chu\.github\.io/flux-panel|'"${SITE_HOST}"'|g' mkdocs.yml
sed -i 's|sagit-chu\.github\.io/flvx|'"${SITE_HOST}"'|g' mkdocs.yml
sed -i 's|site_author: Sagit-chu|site_author: Su-cyber-art|g' mkdocs.yml

# CI workflow: update sed replacement source pattern
sed -i 's|"s|bqlpfy/flux-panel|'"'"'|"s|'"${REPO}"'|'"'"'|g' .github/workflows/docker-build.yml 2>/dev/null || true

# ── 2. CI: use CR_PAT for GHCR authentication ──────────────────────

sed -i 's|password: \${{ secrets\.GITHUB_TOKEN }}|password: ${{ secrets.CR_PAT }}|g' .github/workflows/docker-build.yml

# ── 3. Version footer: strip Powered-by & update check ─────────────

cat > vite-frontend/src/components/version-footer.tsx << 'EOF'
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
EOF

# ── 4. README: remove Telegram group ────────────────────────────────

sed -i '/联系我们.*[Tt]elegram/d' README.md

# ── 5. README: remove donation section ──────────────────────────────

sed -i '/⭐.*喝杯咖啡/,/^$/d' README.md
sed -i '/BNB(BEP20)/d; /TRC20.*TM8V/d; /Aptos.*0x494/d; /polygon.*0xa60/d' README.md
sed -i '/| *网络/d; /|---/d' README.md

# ── 6. README: ensure de-brand disclaimer ───────────────────────────

if ! grep -q "去品牌化" README.md; then
  sed -i '/^# FLVX/a\\n> **声明**：本仓库是基于 [Sagit-chu\/flvx](https:\/\/github.com\/Sagit-chu\/flvx) 的去品牌化 (de-branded) 二次分发版本，移除了 "Powered by" 标识及版本更新提示等品牌信息，仅供个人学习与自用部署。原始项目的所有权利归原作者所有。如有任何不妥，请通过 [Issues](https:\/\/github.com\/'"${REPO}"'\/issues) 联系，将第一时间处理。' README.md
fi

# ── 7. README: update install command URLs ──────────────────────────

sed -i 's|raw.githubusercontent.com/Sagit-chu/flux-panel/main|raw.githubusercontent.com/'"${REPO}"'/main|g' README.md
sed -i 's|github.com/Sagit-chu/flux-panel/releases|github.com/'"${REPO}"'/releases|g' README.md

echo "✅ De-branding applied successfully."
