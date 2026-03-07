import React from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/shadcn-bridge/heroui/button";
import { BrandLogo } from "@/components/brand-logo";
import { siteConfig } from "@/config/site";
import { useScrollTopOnPathChange } from "@/hooks/useScrollTopOnPathChange";

export default function H5SimpleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();

  useScrollTopOnPathChange();

  const handleBack = () => {
    navigate("/profile");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-black">
      {/* 顶部导航栏（胶囊样式，固定悬浮） */}
      <header className="safe-top fixed top-0 left-0 right-0 px-3 pt-2 pb-2 z-40 pointer-events-none">
        <div className="h-12 rounded-[22px] border border-white/60 dark:border-white/10 bg-white/75 dark:bg-black/65 backdrop-blur-md shadow-sm flex items-center justify-between px-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <Button isIconOnly size="sm" variant="light" onPress={handleBack}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clipRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  fillRule="evenodd"
                />
              </svg>
            </Button>
            <BrandLogo size={20} />
            <h1 className="text-sm font-bold text-foreground">
              {siteConfig.name}
            </h1>
          </div>

          <div className="flex items-center gap-2" />
        </div>
      </header>

      {/* 固定悬浮头部占位 */}
      <div aria-hidden className="h-[calc(var(--safe-area-top)+4rem)]" />

      {/* 主内容区域 */}
      <main className="flex-1 bg-gray-100 dark:bg-black pb-0">{children}</main>
    </div>
  );
}
