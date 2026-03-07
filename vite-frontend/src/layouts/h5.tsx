import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { Button } from "@/shadcn-bridge/heroui/button";
import { BrandLogo } from "@/components/brand-logo";
import { siteConfig } from "@/config/site";
import { useScrollTopOnPathChange } from "@/hooks/useScrollTopOnPathChange";
import { safeLogout } from "@/utils/logout";
import { getAdminFlag } from "@/utils/session";
import { isWebViewFunc } from "@/utils/panel";
import {
  getLatestVersionByChannel,
  getUpdateReleaseChannel,
  hasVersionUpdate,
  UPDATE_CHANNEL_CHANGED_EVENT,
} from "@/utils/version-update";

interface TabItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export default function H5Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasVersionUpdateHint, setHasVersionUpdateHint] = useState(false);
  const currentVersion = isWebViewFunc()
    ? siteConfig.app_version
    : siteConfig.version;
  const displayVersion = `v${String(currentVersion || "").replace(/^v/i, "")}`;

  useScrollTopOnPathChange();

  // Tabbar配置
  const tabItems: TabItem[] = [
    {
      path: "/dashboard",
      label: "首页",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      ),
    },
    {
      path: "/forward",
      label: "规则",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            clipRule="evenodd"
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
            fillRule="evenodd"
          />
        </svg>
      ),
    },
    {
      path: "/tunnel",
      label: "隧道",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            clipRule="evenodd"
            d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
            fillRule="evenodd"
          />
        </svg>
      ),
      adminOnly: true,
    },
    {
      path: "/node",
      label: "节点",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            clipRule="evenodd"
            d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z"
            fillRule="evenodd"
          />
        </svg>
      ),
      adminOnly: true,
    },
    {
      path: "/profile",
      label: "我的",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
    },
  ];

  useEffect(() => {
    setIsAdmin(getAdminFlag());
  }, []);

  useEffect(() => {
    let active = true;

    const checkVersionUpdate = async () => {
      try {
        const channel = getUpdateReleaseChannel();
        const latest = await getLatestVersionByChannel(
          channel,
          siteConfig.github_repo,
        );

        if (!active) {
          return;
        }

        setHasVersionUpdateHint(
          Boolean(latest && hasVersionUpdate(currentVersion, latest)),
        );
      } catch {
        if (active) {
          setHasVersionUpdateHint(false);
        }
      }
    };

    void checkVersionUpdate();
    window.addEventListener(UPDATE_CHANNEL_CHANGED_EVENT, checkVersionUpdate);

    return () => {
      active = false;
      window.removeEventListener(
        UPDATE_CHANNEL_CHANGED_EVENT,
        checkVersionUpdate,
      );
    };
  }, [currentVersion]);

  // Tab点击处理
  const handleTabClick = (path: string) => {
    navigate(path);
  };

  // 顶部快速退出
  const handleLogout = () => {
    safeLogout();
    navigate("/", { replace: true });
  };

  const handleGoConfig = () => {
    navigate("/config");
  };

  // 过滤tab项（根据权限）
  const filteredTabItems = tabItems.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-black">
      {/* 顶部导航栏（胶囊样式，固定悬浮） */}
      <header className="safe-top fixed top-0 left-0 right-0 px-4 pt-2 pb-2 z-40 pointer-events-none overflow-visible">
        <div className="relative h-12 rounded-[22px] border border-white/70 dark:border-white/10 bg-white/80 dark:bg-black/65 backdrop-blur-md shadow-[0_6px_18px_rgba(17,24,39,0.08)] dark:shadow-[0_6px_18px_rgba(0,0,0,0.35)] ring-1 ring-black/5 dark:ring-white/5 flex items-center justify-between px-3 pointer-events-auto overflow-visible [transform:translateZ(0)] [backface-visibility:hidden] [-webkit-mask-image:-webkit-radial-gradient(white,black)]">
          <div className="flex items-center gap-2">
            <BrandLogo size={20} />
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">
                {siteConfig.name}
              </h1>
              <a
                className="relative inline-flex items-center gap-1.5 rounded-full border border-gray-200/80 dark:border-gray-700/80 bg-white/60 dark:bg-gray-800/60 px-3 py-1 text-xs text-gray-500 dark:text-gray-400 no-underline backdrop-blur transition-all hover:border-gray-300 dark:hover:border-gray-500"
                href={siteConfig.github_repo}
                rel="noopener noreferrer"
                target="_blank"
                title="打开仓库"
              >
                <span className="max-w-[120px] truncate">{displayVersion}</span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {hasVersionUpdateHint && (
                  <span className="absolute -right-0.5 -top-0.5 inline-block h-2 w-2 rounded-full bg-red-500" />
                )}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <Button
                isIconOnly
                aria-label="网站配置"
                className="min-w-0 w-8 h-8 text-purple-600 dark:text-purple-400"
                size="sm"
                variant="light"
                onPress={handleGoConfig}
              >
                <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    clipRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    fillRule="evenodd"
                  />
                </svg>
              </Button>
            )}
            <Button
              isIconOnly
              aria-label="退出登录"
              className="min-w-0 w-8 h-8 text-red-600 dark:text-red-400"
              size="sm"
              variant="light"
              onPress={handleLogout}
            >
              <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clipRule="evenodd"
                  d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                  fillRule="evenodd"
                />
              </svg>
            </Button>
          </div>
        </div>
      </header>

      {/* 固定悬浮头部占位 */}
      <div aria-hidden className="h-[calc(var(--safe-area-top)+4rem)]" />

      {/* 主内容区域 */}
      <main className="flex-1 bg-gray-100 dark:bg-black">{children}</main>

      {/* 用于给固定 Tabbar 腾出空间的占位元素 */}
      <div aria-hidden className="h-[calc(4rem+var(--safe-area-bottom))]" />

      {/* 底部Tabbar */}
      <nav className="bg-white dark:bg-black border-t border-gray-200 dark:border-gray-600 h-[calc(4rem+var(--safe-area-bottom))] flex-shrink-0 flex items-center justify-around px-2 fixed bottom-0 left-0 right-0 z-30">
        {filteredTabItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              className={`
                flex flex-col items-center justify-center flex-1 h-full pb-[var(--safe-area-bottom)]
                transition-colors duration-200 min-h-[44px]
                ${
                  isActive
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }
              `}
              onClick={() => handleTabClick(item.path)}
            >
              <div className="flex-shrink-0 mb-1">{item.icon}</div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
