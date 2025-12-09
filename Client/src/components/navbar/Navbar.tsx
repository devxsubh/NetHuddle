"use client";
import { useGetUserFriendRequestsQuery } from "@/lib/client/rtk-query/request.api";
import { AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useMemo } from "react";
import { useToggleChatBar } from "../../hooks/useUI/useToggleChatBar";
import { useToggleNavMenu } from "../../hooks/useUI/useToggleNavMenu";
import { selectLoggedInUser } from "../../lib/client/slices/authSlice";
import { selectNavMenu } from "../../lib/client/slices/uiSlice";
import { useAppSelector } from "../../lib/client/store/hooks";
import { HamburgerIcon } from "../ui/icons/HamburgerIcon";
import { FriendRequestButton } from "./FriendRequestButton";
import { NavMenu } from "./NavMenu";
import { ToggleThemeButton } from "./ToggleThemeButton";
import { User } from "@/interfaces/auth.interface";
import { DEFAULT_AVATAR } from "@/constants";
import { GithubIcon } from "../ui/icons/GithubIcon";

export const Navbar = () => {
  const { data: friendRequests } = useGetUserFriendRequestsQuery();
  const isNavMenuOpen = useAppSelector(selectNavMenu);
  const toggleNavMenu = useToggleNavMenu();
  const { toggleChatBar } = useToggleChatBar();
  const loggedInUser = useAppSelector(selectLoggedInUser) as User;

  // Ensure avatar URL is always valid
  const avatarUrl = useMemo(() => {
    const avatar = loggedInUser?.avatar || DEFAULT_AVATAR;
    // If already a full URL, use it
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar;
    }
    // If it's a relative path or filename, construct full URL
    if (avatar && avatar !== DEFAULT_AVATAR && !avatar.startsWith('/')) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:666';
      return `${baseUrl}/images/${avatar}`;
    }
    return avatar;
  }, [loggedInUser?.avatar]);

  return (
    <nav className="flex items-center h-14 justify-around shadow bg-background text-text select-none">
      <button onClick={toggleChatBar} className="hidden max-lg:block">
        <HamburgerIcon />
      </button>

      <div className="flex items-center gap-x-2 justify-center">
        <h4 className="text-3xl font-Shantell-Sans font-medium max-sm:text-xl">
          Mern Chat
        </h4>
        <a href="https://github.com/RishiBakshii/mern-chat" target="_blank">
          <GithubIcon/>
        </a>
      </div>

      <div className="flex item-center gap-x-10">
        {friendRequests && friendRequests.length > 0 && (
          <FriendRequestButton
            numberOfFriendRequest={friendRequests ? friendRequests.length : 0}
          />
        )}
        <ToggleThemeButton />

        {loggedInUser && (
          <div className="relative shrink-0">
            <Image
              onClick={toggleNavMenu}
              src={avatarUrl}
              width={100}
              height={100}
              alt={`${loggedInUser?.username} avatar`}
              className="size-10 rounded-full object-cover shrink-0"
            />
            <AnimatePresence>{isNavMenuOpen && <NavMenu />}</AnimatePresence>
          </div>
        )}
      </div>
    </nav>
  );
};
