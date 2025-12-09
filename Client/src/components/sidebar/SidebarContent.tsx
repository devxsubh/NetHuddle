"use client";

import { useSidebar } from "@/context/sidebar.context";
import { MessageInputProvider } from "@/context/message-input-ref.context";
import { ReactNode } from "react";

export const SidebarContent = ({ children }: { children: ReactNode }) => {
  const { sidebarWidth } = useSidebar();

  return (
    <div 
      className="transition-all duration-300 h-screen overflow-y-auto"
      style={{ paddingLeft: sidebarWidth }}
    >
      <MessageInputProvider>
        {children}
      </MessageInputProvider>
    </div>
  );
};

