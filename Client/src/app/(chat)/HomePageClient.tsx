"use client";

import { useGetNetworkStatsQuery } from "@/lib/client/rtk-query/network.api";
import { useGetChatsQuery } from "@/lib/client/rtk-query/chat.api";
import { useGetFriendsQuery } from "@/lib/client/rtk-query/friend.api";
import { FetchUserInfoResponse } from "@/interfaces/server.types";
import Link from "next/link";

type Props = {
  user: FetchUserInfoResponse | null;
};

export const HomePageClient = ({ user }: Props) => {
  const { data: networkStats } = useGetNetworkStatsQuery();
  const { data: chatsData } = useGetChatsQuery();
  const { data: friendsData } = useGetFriendsQuery();

  const chats = chatsData || [];
  const friends = friendsData || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Quick Stats */}
      <div className="bg-secondary rounded-lg p-6">
        <h2 className="text-xl font-semibold text-text mb-4">Quick Stats</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Active Chats</p>
            <p className="text-2xl font-bold text-text">{chats.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Friends</p>
            <p className="text-2xl font-bold text-text">{friends.length}</p>
          </div>
          {networkStats?.data && (
            <div>
              <p className="text-sm text-muted-foreground">Network Users</p>
              <p className="text-2xl font-bold text-text">{networkStats.data.activeUsers}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-secondary rounded-lg p-6">
        <h2 className="text-xl font-semibold text-text mb-4">Quick Actions</h2>
        <div className="space-y-2">
          <Link href="/chats" className="block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-center">
            Start Chatting
          </Link>
          <Link href="/network" className="block px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors text-center">
            View Network
          </Link>
          <Link href="/rooms" className="block px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors text-center">
            Browse Rooms
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-secondary rounded-lg p-6">
        <h2 className="text-xl font-semibold text-text mb-4">Recent Activity</h2>
        <div className="space-y-2">
          {chats.length > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Recent Chats</p>
              {chats.slice(0, 3).map((chat) => (
                <div key={chat.id} className="text-sm text-text py-1">
                  {chat.name || chat.ChatMembers?.[0]?.username || "Chat"}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

