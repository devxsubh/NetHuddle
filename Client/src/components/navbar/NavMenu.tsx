import { useSignoutMutation } from "@/lib/client/rtk-query/auth.api";
import { useAppSelector } from "@/lib/client/store/hooks";
import { selectRefreshToken } from "@/lib/client/slices/authSlice";
import { useCloseNavMenu } from "@/hooks/useUI/useCloseNavMenu";
import { useOpenAddFriendForm } from "@/hooks/useUI/useOpenAddFriendForm";
import { useOpenGroupChatForm } from "@/hooks/useUI/useOpenGroupChatForm";
import { useOpenProfileForm } from "@/hooks/useUI/useOpenProfileForm";
import { useOpenSettingsForm } from "@/hooks/useUI/useOpenSettingsForm";
import { useHandleOutsideClick } from "@/hooks/useUtils/useHandleOutsideClick";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import toast from "react-hot-toast";
import { removeAuthCookie } from "@/lib/client/utils/cookieUtils";
import { AddFriendIcon } from "../ui/icons/AddFriendIcon";
import { LogoutIcon } from "../ui/icons/LogoutIcon";
import { PlusIcon } from "../ui/icons/PlusIcon";
import { SettingIcon } from "../ui/icons/SettingIcon";
import { UserIcon } from "../ui/icons/UserIcon";

export const NavMenu = () => {
  const { openProfileForm } = useOpenProfileForm();
  const { openAddFriendForm } = useOpenAddFriendForm();
  const { openGroupChatForm } = useOpenGroupChatForm();

  const { closeNavMenu } = useCloseNavMenu();

  const navMenuRef = useRef<HTMLDivElement>(null);
  useHandleOutsideClick(navMenuRef, closeNavMenu);

  const router = useRouter();
  const [signout, { isLoading }] = useSignoutMutation();
  const refreshToken = useAppSelector(selectRefreshToken);

  const handleLogoutClick = async () => {
    try {
      if (refreshToken) {
        await signout({ refreshToken }).unwrap();
      }
      // Clear token from cookies and redirect
      removeAuthCookie('token');
      router.push("/auth/login");
      router.refresh(); // Refresh to trigger middleware
    } catch (error: any) {
      // Even if signout fails, clear local state and redirect
      removeAuthCookie('token');
    router.push("/auth/login");
      router.refresh(); // Refresh to trigger middleware
    }
  }

  const {openSettingsForm} = useOpenSettingsForm();

  return (
    <motion.div
      role="menu"
      aria-label="Navigation Menu"
      ref={navMenuRef}
      variants={{ hide: { y: -5, opacity: 0 }, show: { y: 0, opacity: 1 } }}
      initial="hide"
      animate="show"
      exit="hide"
      className="bg-secondary-dark w-[15rem] max-lg:md:right-28 max-md:right-1 self-end fixed rounded-lg shadow-2xl p-4 z-50"
    >
      <ul>
        <li
          onClick={openProfileForm}
          className="cursor-pointer flex items-center gap-x-2 hover:bg-secondary-dark p-2 rounded"
        >
          <UserIcon />
          <p>Profile</p>
        </li>
        <li
          onClick={openAddFriendForm}
          className="cursor-pointer flex items-center gap-x-2 hover:bg-secondary-dark p-2 rounded"
        >
          <AddFriendIcon />
          <p>Add Friend</p>
        </li>
        <li
          onClick={openGroupChatForm}
          className="cursor-pointer flex items-center gap-x-2 hover:bg-secondary-dark p-2 rounded"
        >
          <PlusIcon />
          <p>New Group Chat</p>
        </li>
        <li
          onClick={openSettingsForm}
          className="cursor-pointer flex items-center gap-x-2 hover:bg-secondary-dark p-2 rounded"
        >
          <SettingIcon/>
          <p>Settings</p>
        </li>
        <li
          onClick={handleLogoutClick}
          className="cursor-pointer flex items-center gap-x-2 hover:bg-secondary-dark p-2 rounded"
        >
          <LogoutIcon />
          <p>Logout</p>
        </li>
      </ul>
    </motion.div>
  );
};
