// Type definitions extracted from server services
// These types represent the data structures returned from the backend API

export type BasicUserInfo = {
  id: string;
  username: string;
  avatar: string;
};

export type ChatMember = {
  id: string;
  username: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: Date | null;
  publicKey: string | null;
  verificationBadge: boolean;
};

export type FetchUserInfoResponse = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
  publicKey: string | null;
  notificationsEnabled: boolean;
  verificationBadge: boolean;
  isOnline: boolean;
  lastSeen: Date | null;
};

export type fetchUserFriendsResponse = {
  createdAt: Date;
  id: string;
  username: string;
  avatar: string;
  publicKey: string | null;
  verificationBadge: boolean;
  isOnline: boolean;
  lastSeen: Date | null;
};

export type fetchUserFriendRequestResponse = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: "pending" | "accepted" | "rejected";
  sender: {
    id: string;
    userName?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    avatarUrl?: string;
    isOnline?: boolean;
    publicKey?: string | null;
    lastSeen?: Date | null;
    verificationBadge?: boolean;
  };
  receiver: {
    id: string;
    userName?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    avatarUrl?: string;
    isOnline?: boolean;
    publicKey?: string | null;
    lastSeen?: Date | null;
    verificationBadge?: boolean;
  };
};

export type fetchUserCallHistoryResponse = {
  id: string;
  callType: "audio" | "video";
  status: "missed" | "answered" | "rejected";
  startedAt: Date;
  endedAt: Date | null;
  duration: number | null;
  caller: {
    id: string;
    username: string;
    avatar: string;
    verificationBadge: boolean;
  };
  callee: {
    id: string;
    username: string;
    avatar: string;
    verificationBadge: boolean;
  };
};

export type fetchUserChatsResponse = {
  id: string;
  name: string | null;
  avatar: string | null;
  isGroupChat: boolean;
  createdAt: Date;
  updatedAt: Date;
  typingUsers: BasicUserInfo[];
  ChatMembers: ChatMember[];
  UnreadMessages: Array<{
    count: number;
    message: {
      isTextMessage: boolean;
      url: string | null;
      attachments: Array<{
        secureUrl: string;
      }>;
      isPollMessage: boolean;
      createdAt: Date;
      textMessageContent: string | null;
      audioUrl: string | null;
    };
    sender: {
      id: string;
      username: string;
      avatar: string;
    };
  }>;
  latestMessage: {
    id: string;
    textMessageContent: string | null;
    url: string | null;
    audioUrl: string | null;
    isTextMessage: boolean;
    isPollMessage: boolean;
    createdAt: Date;
    sender: {
      id: string;
      username: string;
      avatar: string;
    };
    attachments: Array<{
      secureUrl: string;
    }>;
    poll: {
      question: string;
      options: Array<{
        option: string;
        votes: Array<{
          user: {
            id: string;
            username: string;
            avatar: string;
          };
        }>;
      }>;
    } | null;
    reactions: Array<{
      user: {
        id: string;
        username: string;
        avatar: string;
      };
      reaction: string;
    }>;
    replyToMessage: {
      id: string;
      sender: {
        id: string;
        username: string;
        avatar: string;
      };
      textMessageContent: string | null;
      isPollMessage: boolean;
      url: string | null;
      audioUrl: string | null;
      attachments: Array<{
        secureUrl: string;
      }>;
    } | null;
  } | null;
  PinnedMessages: Array<{
    message: {
      id: string;
      textMessageContent: string | null;
      url: string | null;
      audioUrl: string | null;
      isTextMessage: boolean;
      isPollMessage: boolean;
      createdAt: Date;
      sender: {
        id: string;
        username: string;
        avatar: string;
      };
      attachments: Array<{
        secureUrl: string;
      }>;
      poll: {
        question: string;
        options: Array<{
          option: string;
          votes: Array<{
            user: {
              id: string;
              username: string;
              avatar: string;
            };
          }>;
        }>;
      } | null;
      reactions: Array<{
        user: {
          id: string;
          username: string;
          avatar: string;
        };
        reaction: string;
      }>;
      replyToMessage: {
        id: string;
        sender: {
          id: string;
          username: string;
          avatar: string;
        };
        textMessageContent: string | null;
        isPollMessage: boolean;
        url: string | null;
        audioUrl: string | null;
        attachments: Array<{
          secureUrl: string;
        }>;
      } | null;
    };
  }>;
};

// Server-side fetch functions for initial data loading
// These are used in server components to fetch data before rendering

export async function fetchUserInfo({ loggedInUserId, token }: { loggedInUserId: string; token?: string }): Promise<FetchUserInfoResponse | null> {
  try {
    if (!token) return null;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:666';
    const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    if (data.success && data.data) {
      // Construct avatar URL: use avatarUrl if available, otherwise construct from avatar filename
      let avatarUrl = data.data.avatarUrl;
      if (!avatarUrl && data.data.avatar) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:666';
        // If avatar is already a full URL, use it; otherwise construct it
        if (data.data.avatar.startsWith('http://') || data.data.avatar.startsWith('https://')) {
          avatarUrl = data.data.avatar;
        } else {
          avatarUrl = `${baseUrl}/images/${data.data.avatar}`;
        }
      }
      
      // Transform backend response to frontend format
      return {
        ...data.data,
        emailVerified: data.data.confirmed ?? false,
        username: data.data.userName ?? data.data.username,
        name: data.data.firstName && data.data.lastName 
          ? `${data.data.firstName} ${data.data.lastName}`
          : data.data.name ?? data.data.userName ?? '',
        avatar: avatarUrl || data.data.avatar || '', // Use full URL for avatar
        publicKey: data.data.publicKey ?? null,
        notificationsEnabled: data.data.notificationsEnabled ?? false,
        verificationBadge: data.data.verificationBadge ?? false,
        isOnline: data.data.isOnline ?? false,
        lastSeen: data.data.lastSeen ?? null,
      } as FetchUserInfoResponse;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
}

export async function fetchUserFriends({ loggedInUserId, token }: { loggedInUserId: string; token?: string }): Promise<fetchUserFriendsResponse[]> {
  try {
    if (!token) return [];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:666';
    const response = await fetch(`${baseUrl}/friend`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching friends:', error);
    return [];
  }
}

export async function fetchUserFriendRequest({ loggedInUserId, token }: { loggedInUserId: string; token?: string }): Promise<fetchUserFriendRequestResponse[]> {
  try {
    if (!token) return [];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:666';
    const response = await fetch(`${baseUrl}/request`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return [];
  }
}

export async function fetchUserChats({ loggedInUserId, token }: { loggedInUserId: string; token?: string }): Promise<fetchUserChatsResponse[]> {
  try {
    if (!token) return [];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:666';
    const response = await fetch(`${baseUrl}/chat`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
}

export async function fetchUserCallHistory({ loggedInUserId, token }: { loggedInUserId: string; token?: string }): Promise<fetchUserCallHistoryResponse[]> {
  try {
    // TODO: Replace with actual API endpoint when backend implements call history
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Error fetching call history:', error);
    return [];
  }
}

