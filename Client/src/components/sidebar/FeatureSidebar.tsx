"use client";

import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppSelector } from "@/lib/client/store/hooks";
import { selectLoggedInUser, selectRefreshToken } from "@/lib/client/slices/authSlice";
import { UserIcon } from "../ui/icons/UserIcon";
import { LogoutIcon } from "../ui/icons/LogoutIcon";
import { useSidebar } from "@/context/sidebar.context";
import { useSignoutMutation } from "@/lib/client/rtk-query/auth.api";
import { removeAuthCookie } from "@/lib/client/utils/cookieUtils";
import Image from "next/image";
import { useMemo } from "react";
import { DEFAULT_AVATAR } from "@/constants";
import toast from "react-hot-toast";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  action?: () => void;
  badge?: number;
}

// Simple SVG icons for features not in the icon library
const HomeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);

const NetworkIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
  </svg>
);

const RoomIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

const VideoIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const FileIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const ChartIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const QuicStreamIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

export const FeatureSidebar = () => {
  const { isCollapsed, setIsCollapsed, sidebarWidth } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const loggedInUser = useAppSelector(selectLoggedInUser);
  const refreshToken = useAppSelector(selectRefreshToken);
  const [signout, { isLoading }] = useSignoutMutation();

  // Ensure avatar URL is always valid
  const avatarUrl = useMemo(() => {
    const avatar = loggedInUser?.avatar || DEFAULT_AVATAR;
    // If already a full URL, use it
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar;
    }
    // If it's a relative path or filename, construct full URL
    if (avatar && avatar !== DEFAULT_AVATAR && !avatar.startsWith('/')) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000';
      return `${baseUrl}/images/${avatar}`;
    }
    return avatar;
  }, [loggedInUser?.avatar]);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await signout({ refreshToken }).unwrap();
      }
      removeAuthCookie('token');
      toast.success("Logged out successfully");
      router.push("/auth/login");
      router.refresh();
    } catch (error: any) {
      removeAuthCookie('token');
      router.push("/auth/login");
      router.refresh();
    }
  };

  // Define all features with routes
  const features: SidebarItem[] = [
    {
      id: "home",
      label: "Home",
      icon: HomeIcon,
      path: "/",
    },
    {
      id: "network",
      label: "Network",
      icon: NetworkIcon,
      path: "/network",
    },
    {
      id: "rooms",
      label: "Rooms",
      icon: RoomIcon,
      path: "/rooms",
    },
    {
      id: "file-transfer",
      label: "File Transfer",
      icon: FileIcon,
      path: "/file-transfer",
    },
    {
      id: "quic-streaming",
      label: "QUIC Streaming",
      icon: QuicStreamIcon,
      path: "/quic-streaming",
    },
    {
      id: "metrics",
      label: "Metrics",
      icon: ChartIcon,
      path: "/metrics",
    },
    {
      id: "profile",
      label: "Profile",
      icon: UserIcon,
      path: "/profile",
    },
  ];

  const handleItemClick = (item: SidebarItem) => {
    if (item.path) {
      router.push(item.path);
    } else if (item.action) {
      item.action();
    }
  };

  const isActive = (item: SidebarItem) => {
    if (item.path) {
      return pathname === item.path || (item.path === "/" && pathname === "/");
    }
    return false;
  };

  return (
    <motion.div
        initial={false}
        animate={{
          width: sidebarWidth,
        }}
        className="fixed left-0 top-0 h-screen bg-background border-r border-border z-40 flex flex-col shadow-lg transition-all duration-300"
        style={{ width: sidebarWidth }}
      >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-4 z-50 bg-background border border-border rounded-full p-1.5 shadow-md hover:bg-accent transition-colors"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRightIcon className="w-4 h-4 text-text" />
        ) : (
          <ChevronLeftIcon className="w-4 h-4 text-text" />
        )}
      </button>

      {/* Sidebar Content */}
      <div className="flex flex-col h-full pt-4 pb-4 overflow-y-auto">
        <div className="flex flex-col gap-2 px-2">
          {features.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <motion.button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-all duration-200
                  ${
                    active
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-text hover:bg-accent hover:text-accent-foreground"
                  }
                  ${isCollapsed ? "justify-center" : "justify-start"}
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-primary-foreground" : ""}`} />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!isCollapsed && item.badge && item.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] text-center"
                  >
                    {item.badge}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* User Info Section at bottom */}
        {loggedInUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-auto px-2 pt-4 border-t border-border space-y-2"
          >
            {/* Profile Section - Clickable to go to profile */}
            <motion.button
              onClick={() => router.push("/profile")}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg
                transition-all duration-200
                ${pathname === "/profile" 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-text hover:bg-accent hover:text-accent-foreground"
                }
                ${isCollapsed ? "justify-center" : "justify-start"}
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title={isCollapsed ? "Profile" : undefined}
            >
              <div className="relative shrink-0">
                <Image
                  src={avatarUrl}
                  width={32}
                  height={32}
                  alt={`${loggedInUser?.username} avatar`}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
              </div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex flex-col min-w-0 flex-1"
                  >
                    <span className="text-sm font-medium text-text truncate text-left">
                      {loggedInUser.username || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate text-left">
                      {loggedInUser.email || ""}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Logout Button */}
            <motion.button
              onClick={handleLogout}
              disabled={isLoading}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg
                transition-all duration-200
                text-text hover:bg-red-500/10 hover:text-red-500
                ${isCollapsed ? "justify-center" : "justify-start"}
                disabled:opacity-50
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title={isCollapsed ? "Logout" : undefined}
            >
              <LogoutIcon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="font-medium whitespace-nowrap overflow-hidden"
                  >
                    Logout
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

