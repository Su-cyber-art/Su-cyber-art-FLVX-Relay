import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

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
  const location = useLocation();

  useScrollTopOnPathChange();

  const handleBack = () => {
    navigate("/profile");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-black">
      {/* 顶部导航栏（胶囊样式，固定悬浮） */}
      <header className="safe-top fixed top-0 left-0 right-0 px-4 pt-2 pb-2 z-40 pointer-events-none overflow-visible">
        <div className="relative h-12 rounded-[22px] border border-white/45 dark:border-white/15 bg-white/55 dark:bg-black/35 backdrop-blur-xl shadow-[0_8px_24px_rgba(17,24,39,0.14)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.45)] flex items-center justify-between px-3 pointer-events-auto overflow-visible [backdrop-filter:saturate(165%)_blur(18px)] [transform:translateZ(0)] [backface-visibility:hidden] [-webkit-mask-image:-webkit-radial-gradient(white,black)]">
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
      <main className="flex-1 bg-gray-100 dark:bg-black pb-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
