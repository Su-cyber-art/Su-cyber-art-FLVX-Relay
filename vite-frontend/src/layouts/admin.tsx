import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/shadcn-bridge/heroui/button";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@/shadcn-bridge/heroui/dropdown";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@/shadcn-bridge/heroui/modal";
import { Input } from "@/shadcn-bridge/heroui/input";
import { BrandLogo } from "@/components/brand-logo";
import { updatePassword } from "@/api";
import { safeLogout } from "@/utils/logout";
import { siteConfig } from "@/config/site";
import { useMobileBreakpoint } from "@/hooks/useMobileBreakpoint";
import { getAdminFlag, getSessionName } from "@/utils/session";
import {
  getLatestVersion,
  hasVersionUpdate,
} from "@/utils/version-update";

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

interface PasswordForm {
  newUsername: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("sidebar_collapsed") === "true",
  );
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasVersionUpdateHint, setHasVersionUpdateHint] = useState(false);
  const displayVersion = `v${String(siteConfig.version || "").replace(/^v/i, "")}`;
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    newUsername: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const isMobile = useMobileBreakpoint();

  // 菜单项配置
  const menuItems: MenuItem[] = [
    {
      path: "/dashboard",
      label: "仪表",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      ),
    },
    {
      path: "/forward",
      label: "规则",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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
      path: "/limit",
      label: "限速",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            clipRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            fillRule="evenodd"
          />
        </svg>
      ),
      adminOnly: true,
    },
    {
      path: "/user",
      label: "用户",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
      adminOnly: true,
    },
    {
      path: "/group",
      label: "分组",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a3 3 0 100 6 3 3 0 000-6zM4 9a3 3 0 100 6 3 3 0 000-6zm12 0a3 3 0 100 6 3 3 0 000-6M4 16a2 2 0 00-2 2h4a2 2 0 00-2-2zm12 0a2 2 0 00-2 2h4a2 2 0 00-2-2zm-6 0a2 2 0 00-2 2h4a2 2 0 00-2-2z" />
        </svg>
      ),
      adminOnly: true,
    },

    {
      path: "/config",
      label: "设置",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            clipRule="evenodd"
            d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
            fillRule="evenodd"
          />
        </svg>
      ),
      adminOnly: true,
    },
  ];

  useEffect(() => {
    // 获取用户信息
    const name = getSessionName() || "Admin";
    const adminFlag = getAdminFlag();

    setUsername(name);
    setIsAdmin(adminFlag);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileMenuVisible(false);
    }
  }, [isMobile]);

  useEffect(() => {
    let active = true;

    const checkVersionUpdate = async (forceRefresh = false) => {
      try {
        const latest = await getLatestVersion(siteConfig.github_repo, forceRefresh);

        if (!active) {
          return;
        }

        setHasVersionUpdateHint(
          Boolean(latest && hasVersionUpdate(siteConfig.version, latest)),
        );
      } catch {
        if (active) {
          setHasVersionUpdateHint(false);
        }
      }
    };

    void checkVersionUpdate(true);

    return () => {
      active = false;
    };
  }, []);

  // 退出登录
  const handleLogout = () => {
    safeLogout();
    navigate("/");
  };

  // 切换移动端菜单
  const toggleMobileMenu = () => {
    setMobileMenuVisible(!mobileMenuVisible);
  };

  // 隐藏移动端菜单
  const hideMobileMenu = () => {
    setMobileMenuVisible(false);
  };

  // 切换折叠状态
  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;

    setIsCollapsed(newCollapsed);
    localStorage.setItem("sidebar_collapsed", newCollapsed.toString());
  };

  // 菜单点击处理
  const handleMenuClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      hideMobileMenu();
    }
  };

  // 密码表单验证
  const validatePasswordForm = (): boolean => {
    if (!passwordForm.newUsername.trim()) {
      toast.error("请输入新用户名");

      return false;
    }
    if (passwordForm.newUsername.length < 3) {
      toast.error("用户名长度至少3位");

      return false;
    }
    if (!passwordForm.currentPassword) {
      toast.error("请输入当前密码");

      return false;
    }
    if (!passwordForm.newPassword) {
      toast.error("请输入新密码");

      return false;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("新密码长度不能少于6位");

      return false;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("两次输入密码不一致");

      return false;
    }

    return true;
  };

  // 提交密码修改
  const handlePasswordSubmit = async () => {
    if (!validatePasswordForm()) return;

    setPasswordLoading(true);
    try {
      const response = await updatePassword(passwordForm);

      if (response.code === 0) {
        toast.success("密码修改成功，请重新登录");
        onOpenChange();
        handleLogout();
      } else {
        toast.error(response.msg || "密码修改失败");
      }
    } catch {
      toast.error("修改密码时发生错误");
    } finally {
      setPasswordLoading(false);
    }
  };

  // 重置密码表单
  const resetPasswordForm = () => {
    setPasswordForm({
      newUsername: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  // 过滤菜单项（根据权限）
  const filteredMenuItems = menuItems.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  return (
    <div
      className={`flex ${isMobile ? "min-h-[100dvh]" : "h-[100dvh] overflow-hidden"} bg-gray-100 dark:bg-black`}
    >
      {/* 移动端遮罩层 */}
      {isMobile && mobileMenuVisible && (
        <button
          aria-label="关闭菜单"
          className="fixed inset-0 backdrop-blur-sm bg-white/50 dark:bg-black/30 z-40"
          type="button"
          onClick={hideMobileMenu}
        />
      )}

      {/* 左侧菜单栏 */}
      <aside
        className={`
        ${isMobile ? "fixed" : "relative"}
        ${isMobile && !mobileMenuVisible ? "-translate-x-full" : "translate-x-0"}
        ${isMobile ? "w-64" : isCollapsed ? "w-20" : "w-36"}
        z-50
        transition-all duration-300 ease-in-out
        flex flex-col
        ${isMobile ? "h-[calc(100dvh-1.5rem)] top-3 left-3" : "h-[calc(100dvh-1.5rem)] max-h-[calc(100dvh-1.5rem)] my-3 ml-3"}
        rounded-[28px]
        border border-white/45 dark:border-white/10
        bg-white/65 dark:bg-black/35
        backdrop-blur-xl
        shadow-[0_10px_30px_rgba(17,24,39,0.16)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)]
        overflow-hidden
      `}
      >
        {/* Logo 区域（桌面端承载用户菜单，消除顶部留白） */}
        <div
          className={`h-14 flex items-center overflow-hidden whitespace-nowrap box-border ${
            !isMobile && isCollapsed ? "px-0 justify-center" : "px-3"
          }`}
        >
          <div className="flex-shrink-0 flex items-center justify-center w-10">
            <BrandLogo size={28} />
          </div>
          <div
            className={`transition-all duration-300 overflow-hidden ${isCollapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[180px] opacity-100 ml-2"}`}
          >
            <h1 className="text-sm font-bold text-foreground overflow-hidden whitespace-nowrap text-ellipsis">
              {siteConfig.name}
            </h1>
          </div>


        </div>

        {/* 菜单导航 */}
        <nav
          className={`flex-1 overflow-y-auto overflow-x-hidden no-scrollbar ${
            !isMobile && isCollapsed ? "px-1 py-2" : "px-2 py-4"
          }`}
        >
          <ul
            className={!isMobile ? "h-full flex flex-col justify-between" : "space-y-1"}
          >
            {filteredMenuItems.map((item) => {
              const isActive = location.pathname === item.path;

              return (
                <li
                  key={item.path}
                  className={!isMobile ? "min-h-[44px] flex items-center justify-center flex-1" : ""}
                >
                  <motion.button
                    className={`
                       relative transition-colors flex items-center
                       ${
                         isCollapsed
                           ? "w-10 h-10 justify-center rounded-full"
                           : "w-full min-h-[44px] px-1 py-2 text-left rounded-lg"
                       }
                       ${
                         isActive
                           ? "bg-primary-100 text-primary-600 dark:bg-primary-600/20 dark:text-primary-300"
                           : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"
                       }
                     `}
                    title={isCollapsed ? item.label : undefined}
                    transition={{ duration: 0.24 }}
                    onClick={() => handleMenuClick(item.path)}
                  >
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <div
                      className={`transition-all duration-300 overflow-hidden flex items-center ${isCollapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[200px] opacity-100 ml-2"}`}
                    >
                      <span className="font-medium text-sm whitespace-nowrap">
                        {item.label}
                      </span>
                    </div>
                  </motion.button>
                </li>
              );
            })}

            {!isMobile && !isCollapsed && (
              <li>
                <Dropdown placement="bottom-start">
                  <DropdownTrigger>
                    <Button
                      className="w-full min-h-[44px] rounded-full border border-white/45 dark:border-white/10 bg-white/65 dark:bg-black/28 px-1 py-2 text-left text-gray-700 dark:text-gray-200 shadow-sm backdrop-blur-md hover:bg-white/80 dark:hover:bg-black/38"
                      variant="light"
                    >
                      <div className="flex items-center w-full">
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              clipRule="evenodd"
                              d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z"
                              fillRule="evenodd"
                            />
                          </svg>
                        </div>
                        <span className="ml-2 font-medium text-sm whitespace-nowrap">
                          {username}
                        </span>
                      </div>
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="用户菜单">
                    <DropdownItem
                      key="change-password"
                      startContent={
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            clipRule="evenodd"
                            d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z"
                            fillRule="evenodd"
                          />
                        </svg>
                      }
                      onPress={onOpen}
                    >
                      修改密码
                    </DropdownItem>
                    <DropdownItem
                      key="logout"
                      className="text-danger"
                      color="danger"
                      startContent={
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            clipRule="evenodd"
                            d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                            fillRule="evenodd"
                          />
                        </svg>
                      }
                      onPress={handleLogout}
                    >
                      退出登录
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </li>
            )}
          </ul>
        </nav>

        {/* 底部仓库链接和折叠按钮 */}
        <div
          className={`px-3 py-2 pb-3 mt-auto flex-shrink-0 overflow-hidden whitespace-nowrap box-border flex ${
            !isMobile && isCollapsed
              ? "flex-col items-center gap-2"
              : "items-center justify-between"
          }`}
        >
          {!isMobile && isCollapsed ? (
            <Dropdown placement="top-start">
              <DropdownTrigger>
                <Button
                  isIconOnly
                  className="flex-shrink-0 min-w-0 w-10 h-10 p-0 rounded-lg flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"
                  title={username || "用户菜单"}
                  variant="light"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      clipRule="evenodd"
                      d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z"
                      fillRule="evenodd"
                    />
                  </svg>
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="用户菜单">
                <DropdownItem
                  key="change-password"
                  startContent={
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        clipRule="evenodd"
                        d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z"
                        fillRule="evenodd"
                      />
                    </svg>
                  }
                  onPress={onOpen}
                >
                  修改密码
                </DropdownItem>
                <DropdownItem
                  key="logout"
                  className="text-danger"
                  color="danger"
                  startContent={
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        clipRule="evenodd"
                        d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                        fillRule="evenodd"
                      />
                    </svg>
                  }
                  onPress={handleLogout}
                >
                  退出登录
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          ) : (
            <a
              aria-label="GitHub 仓库"
              className={`relative flex-shrink-0 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors duration-200 ${
                !isMobile && !isCollapsed
                  ? "h-10 px-3 inline-flex items-center gap-2"
                  : "w-10 h-10 flex items-center justify-center"
              }`}
              href="https://github.com/Su-cyber-art/Yusa-Forward"
              rel="noreferrer"
              target="_blank"
              title="GitHub 仓库"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.43 7.86 10.96.57.1.78-.24.78-.54 0-.27-.01-.98-.02-1.92-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.95.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.09-.12-.3-.52-1.5.11-3.13 0 0 .97-.31 3.18 1.18a11.08 11.08 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.63.24 2.83.12 3.13.74.8 1.19 1.83 1.19 3.09 0 4.43-2.69 5.4-5.25 5.68.41.36.78 1.07.78 2.16 0 1.56-.01 2.82-.01 3.2 0 .3.2.65.79.54A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
              </svg>
              {!isMobile && !isCollapsed && (
                <span className="inline-flex items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                  {displayVersion}
                  <span
                    className={`ml-1 inline-block h-1.5 w-1.5 rounded-full ${
                      hasVersionUpdateHint
                        ? "bg-red-500 animate-pulse"
                        : "bg-emerald-500/80"
                    }`}
                  />
                </span>
              )}
              {isMobile && (
                <span
                  className={`absolute right-1.5 top-1.5 inline-block h-2 w-2 rounded-full ${
                    hasVersionUpdateHint
                      ? "bg-red-500 animate-pulse"
                      : "bg-emerald-500/80"
                  }`}
                />
              )}
            </a>
          )}

          {/* 桌面端折叠按钮 */}
          {!isMobile && (
            <Button
              isIconOnly
              className={`flex-shrink-0 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 min-w-0 w-10 h-10 rounded-full ${isCollapsed ? "" : "ml-auto"}`}
              size="sm"
              variant="light"
              onPress={toggleCollapse}
            >
              {isCollapsed ? (
                // 向右扩展的提示
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              ) : (
                // 向左收起的提示
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              )}
            </Button>
          )}
        </div>
      </aside>

      {/* 主内容区域 */}
      <div
        className={`flex flex-col flex-1 ${isMobile ? "min-h-0" : "h-[calc(100dvh-1.5rem)] overflow-hidden mt-3 mr-3 ml-3"}`}
      >
        {isMobile && (
          <header className="relative z-10 flex h-14 items-center justify-between px-1">
            <div className="flex items-center gap-4">
              <Button
                isIconOnly
                className="lg:hidden"
                variant="light"
                onPress={toggleMobileMenu}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M4 6h16M4 12h16M4 18h16"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button
                    className="h-10 rounded-full border border-white/45 dark:border-white/10 bg-white/70 dark:bg-black/35 px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-md"
                    variant="light"
                  >
                    {username}
                    <svg
                      className="w-4 h-4 ml-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        clipRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        fillRule="evenodd"
                      />
                    </svg>
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="用户菜单">
                  <DropdownItem
                    key="change-password"
                    startContent={
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          clipRule="evenodd"
                          d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z"
                          fillRule="evenodd"
                        />
                      </svg>
                    }
                    onPress={onOpen}
                  >
                    修改密码
                  </DropdownItem>
                  <DropdownItem
                    key="logout"
                    className="text-danger"
                    color="danger"
                    startContent={
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          clipRule="evenodd"
                          d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                          fillRule="evenodd"
                        />
                      </svg>
                    }
                    onPress={handleLogout}
                  >
                    退出登录
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </header>
        )}

        {/* 主内容 */}
        <main
          className={`flex-1 bg-gray-100 dark:bg-black overflow-y-auto overflow-x-hidden no-scrollbar rounded-[22px] border border-white/35 dark:border-white/10 ${
            isMobile ? "mt-2" : "mt-0"
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              animate={{ opacity: 1, y: 0 }}
              className="h-full"
              exit={{ opacity: 0, y: -6 }}
              initial={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.34, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* 修改密码弹窗 */}
      <Modal
        backdrop="blur"
        isOpen={isOpen}
        placement="center"
        scrollBehavior="outside"
        size="2xl"
        onOpenChange={() => {
          onOpenChange();
          resetPasswordForm();
        }}
      >
        <ModalContent>
          {(onClose: () => void) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                修改密码
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="新用户名"
                    placeholder="请输入新用户名（至少3位）"
                    value={passwordForm.newUsername}
                    variant="bordered"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newUsername: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="当前密码"
                    placeholder="请输入当前密码"
                    type="password"
                    value={passwordForm.currentPassword}
                    variant="bordered"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="新密码"
                    placeholder="请输入新密码（至少6位）"
                    type="password"
                    value={passwordForm.newPassword}
                    variant="bordered"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="确认密码"
                    placeholder="请再次输入新密码"
                    type="password"
                    value={passwordForm.confirmPassword}
                    variant="bordered"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button
                  color="primary"
                  isLoading={passwordLoading}
                  onPress={handlePasswordSubmit}
                >
                  确定
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
