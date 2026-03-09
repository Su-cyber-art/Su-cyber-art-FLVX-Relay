import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { Card, CardBody } from "@/shadcn-bridge/heroui/card";
import { Button } from "@/shadcn-bridge/heroui/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@/shadcn-bridge/heroui/modal";
import { Input } from "@/shadcn-bridge/heroui/input";

import { getConfigByName, updateConfigs, updatePassword } from "@/api";
import { safeLogout } from "@/utils/logout";
import { getAdminFlag, getSessionName } from "@/utils/session";
import { convertBrandAssetToPngDataURL } from "@/utils/brand-asset";
interface PasswordForm {
  newUsername: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const PROFILE_AVATAR_KEY = "profile_avatar";
const PROFILE_AVATAR_CACHE_KEY = "vite_config_profile_avatar";
const BRAND_FILE_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [adminMenuExpanded, setAdminMenuExpanded] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(() => {
    if (typeof window === "undefined") return "";

    return localStorage.getItem(PROFILE_AVATAR_CACHE_KEY) || "";
  });
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    newUsername: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    // 获取用户信息
    setUsername(getSessionName() || "Admin");
    setIsAdmin(getAdminFlag());

    const loadAvatar = async () => {
      try {
        const response = await getConfigByName(PROFILE_AVATAR_KEY);

        if (
          response.code === 0 &&
          response.data &&
          typeof response.data.value === "string"
        ) {
          const nextAvatar = response.data.value;

          setAvatarUrl(nextAvatar);
          setAvatarLoadFailed(false);

          if (typeof window !== "undefined") {
            localStorage.setItem(PROFILE_AVATAR_CACHE_KEY, nextAvatar);
          }
        }
      } catch {
        // ignore avatar load error
      }
    };

    void loadAvatar();
  }, []);

  // 管理员菜单项
  const adminMenuItems: MenuItem[] = [
    {
      path: "/limit",
      label: "限速管理",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            clipRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            fillRule="evenodd"
          />
        </svg>
      ),
      color:
        "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400",
      description: "管理用户限速策略",
    },

    {
      path: "/group",
      label: "分组管理",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a3 3 0 100 6 3 3 0 000-6zM4 9a3 3 0 100 6 3 3 0 000-6zm12 0a3 3 0 100 6 3 3 0 000-6M4 16a2 2 0 00-2 2h4a2 2 0 00-2-2zm12 0a2 2 0 00-2 2h4a2 2 0 00-2-2zm-6 0a2 2 0 00-2 2h4a2 2 0 00-2-2z" />
        </svg>
      ),
      color:
        "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400",
      description: "管理用户和隧道分组",
    },
    {
      path: "/user",
      label: "用户管理",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
      color: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
      description: "管理系统用户",
    },

  ];

  const triggerAvatarPicker = () => {
    if (avatarUploading) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setAvatarUploading(true);

    try {
      const pngDataURL = await convertBrandAssetToPngDataURL(file, "avatar");
      const res = await updateConfigs({ [PROFILE_AVATAR_KEY]: pngDataURL });

      if (res.code === 0) {
        setAvatarUrl(pngDataURL);
        setAvatarLoadFailed(false);
        if (typeof window !== "undefined") {
          localStorage.setItem(PROFILE_AVATAR_CACHE_KEY, pngDataURL);
        }
        toast.success("头像上传成功");
      } else {
        toast.error(res.msg || "头像上传失败");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "头像处理失败，请重试";

      toast.error(message);
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const clearAvatar = async () => {
    if (avatarUploading) return;

    setAvatarUploading(true);
    try {
      const res = await updateConfigs({ [PROFILE_AVATAR_KEY]: "" });

      if (res.code === 0) {
        setAvatarUrl("");
        setAvatarLoadFailed(false);
        if (typeof window !== "undefined") {
          localStorage.removeItem(PROFILE_AVATAR_CACHE_KEY);
        }
        toast.success("头像已清除");
      } else {
        toast.error(res.msg || "清除头像失败");
      }
    } catch {
      toast.error("清除头像失败，请重试");
    } finally {
      setAvatarUploading(false);
    }
  };

  // 退出登录
  const handleLogout = () => {
    safeLogout();
    navigate("/", { replace: true });
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

  return (
    <div className="px-3 lg:px-6 py-8 flex flex-col h-full">
      <div className="space-y-6 flex-1">
        {/* 用户信息卡片 + 管理下拉 */}
        <Card className="border border-gray-200 dark:border-default-200 shadow-md hover:shadow-lg transition-shadow">
          <CardBody className="p-4 space-y-4">
            <div className="relative">
              <div className="absolute right-0 top-1.5 flex items-center gap-1.5 opacity-80">
                {isAdmin && (
                  <Button
                    isIconOnly
                    className="min-w-0 w-7 h-7 text-default-500 dark:text-default-400"
                    color="default"
                    size="sm"
                    title={adminMenuExpanded ? "收起管理菜单" : "展开管理菜单"}
                    variant="light"
                    onPress={() => setAdminMenuExpanded((prev) => !prev)}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${adminMenuExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M19 9l-7 7-7-7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  </Button>
                )}
                <Button
                  isIconOnly
                  className="min-w-0 w-7 h-7 text-indigo-600/90 dark:text-indigo-400/90"
                  color="default"
                  size="sm"
                  title="修改密码"
                  variant="light"
                  onPress={onOpen}
                >
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
                </Button>
              </div>

              <div className="flex items-start space-x-4 pr-24 pt-1">
                <input
                  ref={avatarInputRef}
                  accept={BRAND_FILE_ACCEPT}
                  className="hidden"
                  type="file"
                  onChange={(event) => {
                    void handleAvatarFileChange(event);
                  }}
                />
                <div className="relative">
                  <button
                    className="w-14 h-14 bg-slate-200 dark:bg-slate-700/60 rounded-full flex items-center justify-center overflow-hidden border border-slate-300/70 dark:border-slate-500/40 hover:opacity-90 transition-opacity"
                    title="上传头像"
                    type="button"
                    onClick={triggerAvatarPicker}
                  >
                    {avatarUrl && !avatarLoadFailed ? (
                      <img
                        alt="profile avatar"
                        className="w-full h-full object-cover"
                        src={avatarUrl}
                        onError={() => setAvatarLoadFailed(true)}
                        onLoad={() => setAvatarLoadFailed(false)}
                      />
                    ) : (
                      <svg
                        className="w-7 h-7 text-slate-500 dark:text-slate-300"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          clipRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          fillRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground leading-tight">
                    {username}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1.5">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-medium ${
                        isAdmin
                          ? "bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300"
                          : "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                      }`}
                    >
                      {isAdmin ? "管理员" : "普通用户"}
                    </span>
                    <span className="text-[11px] text-default-400">
                      {new Date().toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      className="h-8"
                      color="primary"
                      isLoading={avatarUploading}
                      size="sm"
                      variant="flat"
                      onPress={triggerAvatarPicker}
                    >
                      {avatarUrl ? "替换头像" : "上传头像"}
                    </Button>
                    <Button
                      className="h-8 bg-slate-100/95 text-slate-600 border border-slate-200 hover:bg-slate-200/80 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700/80"
                      isDisabled={!avatarUrl || avatarUploading}
                      size="sm"
                      variant="flat"
                      onPress={() => {
                        void clearAvatar();
                      }}
                    >
                      恢复默认
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-1 border-t border-gray-100 dark:border-default-100/20">
                <div
                  className={`grid grid-cols-3 gap-3 transition-all duration-200 ${adminMenuExpanded ? "opacity-100" : "opacity-0 max-h-0 overflow-hidden pointer-events-none"}`}
                >
                  {adminMenuItems.map((item) => (
                    <button
                      key={item.path}
                      className="flex flex-col items-center p-2.5 rounded-[24px] bg-gray-50 dark:bg-default-100 hover:bg-gray-100 dark:hover:bg-default-200 transition-colors duration-200"
                      onClick={() => navigate(item.path)}
                    >
                      <div
                        className={`w-9 h-9 ${item.color} rounded-full flex items-center justify-center mb-1.5`}
                      >
                        {item.icon}
                      </div>
                      <span className="text-xs text-foreground text-center">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
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
