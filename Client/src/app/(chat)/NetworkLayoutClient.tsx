"use client";

import { NetworkCallNotification } from "@/components/network/NetworkCallNotification";
import { useNetworkMessageListener } from "@/hooks/useNetworkMessageListener";

/**
 * Client component for global network features
 * Handles incoming messages and calls across all pages
 */
export const NetworkLayoutClient = () => {
  // Listen for incoming network messages globally
  useNetworkMessageListener();

  return <NetworkCallNotification />;
};

