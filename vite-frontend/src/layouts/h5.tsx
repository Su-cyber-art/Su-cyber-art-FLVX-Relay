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
      {/* 顶部导航栏 */}
      <header className="bg-white dark:bg-black shadow-sm border-b border-gray-200 dark:border-gray-600 h-14 safe-top flex-shrink-0 flex items-center justify-between px-4 relative z-10">
        <div className="flex items-center gap-2">
          <BrandLogo size={20} />
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-foreground">
              {siteConfig.name}
            </h1>
            <span className="relative text-xs text-gray-400 dark:text-gray-500">
              {currentVersion}
              {hasVersionUpdateHint && (
                <span className="absolute -right-2 -top-1 inline-block h-2 w-2 rounded-full bg-red-500" />
              )}
            </span>
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
      </header>

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
