"use client";

import { useAppSelector } from "@/lib/client/store/hooks";
import { selectLoggedInUser } from "@/lib/client/slices/authSlice";
import { useGetMeQuery, useUpdateMeMutation } from "@/lib/client/rtk-query/auth.api";
import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { DEFAULT_AVATAR } from "@/constants";
import { ToggleThemeButton } from "@/components/navbar/ToggleThemeButton";

export default function ProfilePage() {
  const loggedInUser = useAppSelector(selectLoggedInUser);
  const { data: userData, refetch: refetchUser } = useGetMeQuery();
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  
  const user = userData?.data || loggedInUser;
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [userName, setUserName] = useState(user?.userName || "");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [avatarInputMethod, setAvatarInputMethod] = useState<"url" | "file">("url");

  // Update form fields when user data changes
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setUserName(user.userName || "");
    }
  }, [user]);

  // Ensure avatar URL is always valid - use the most up-to-date user data
  const displayAvatarUrl = useMemo(() => {
    // Prioritize userData from query, then loggedInUser from Redux
    const currentUser = userData?.data || loggedInUser;
    const avatar = currentUser?.avatar || DEFAULT_AVATAR;
    
    // If it's already a full URL, use it directly
    if (avatar && (avatar.startsWith('http://') || avatar.startsWith('https://'))) {
      return avatar;
    }
    // If it's a relative path or filename, construct full URL
    if (avatar && avatar !== DEFAULT_AVATAR && !avatar.startsWith('/')) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000';
      return `${baseUrl}/images/${avatar}`;
    }
    return avatar || DEFAULT_AVATAR;
  }, [userData?.data, loggedInUser?.avatar]);

  const handleSave = async () => {
    try {
      const updateData: any = {
        firstName,
        lastName,
        userName,
      };
      
      // If avatar URL is provided, add it to update data
      if (avatarUrl.trim()) {
        updateData.avatar = avatarUrl.trim();
      }
      
      await updateMe(updateData).unwrap();
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      setIsEditingAvatar(false);
      setAvatarUrl("");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleSaveAvatar = async () => {
    if (!avatarUrl.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    // Validate URL format
    try {
      new URL(avatarUrl.trim());
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    try {
      await updateMe({
        avatar: avatarUrl.trim(),
      }).unwrap();
      // Refetch user data to get updated avatar
      await refetchUser();
      toast.success("Avatar updated successfully!");
      setIsEditingAvatar(false);
      setAvatarUrl("");
    } catch (error) {
      toast.error("Failed to update avatar");
    }
  };

  const handleCancel = () => {
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setUserName(user?.userName || "");
    setIsEditing(false);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto p-4 max-md:p-2 min-h-full">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 mb-8 border-b border-border">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-text">My Profile</h1>
            <div className="flex items-center gap-4">
              <ToggleThemeButton />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture Section */}
          <div className="lg:col-span-1">
            <div className="bg-secondary rounded-lg p-6 flex flex-col items-center">
              <div className="relative mb-4">
                <Image
                  src={displayAvatarUrl}
                  width={150}
                  height={150}
                  alt={`${user?.username} avatar`}
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary"
                />
                {isEditingAvatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="text-white text-xs text-center px-2">Updating...</div>
                  </div>
                )}
              </div>
              
              {!isEditingAvatar ? (
                <button
                  onClick={() => setIsEditingAvatar(true)}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors text-sm mb-4"
                >
                  Update Avatar
                </button>
              ) : (
                <div className="w-full space-y-3 mb-4">
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => setAvatarInputMethod("url")}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        avatarInputMethod === "url"
                          ? "bg-primary text-white"
                          : "bg-secondary-dark text-text hover:bg-secondary-darker"
                      }`}
                    >
                      URL
                    </button>
                    <button
                      onClick={() => setAvatarInputMethod("file")}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        avatarInputMethod === "file"
                          ? "bg-primary text-white"
                          : "bg-secondary-dark text-text hover:bg-secondary-darker"
                      }`}
                    >
                      File
                    </button>
                  </div>
                  
                  {avatarInputMethod === "url" ? (
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveAvatar}
                          disabled={!avatarUrl.trim()}
                          className="flex-1 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingAvatar(false);
                            setAvatarUrl("");
                          }}
                          className="flex-1 px-3 py-1.5 bg-secondary-dark hover:bg-secondary-darker text-text rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-secondary-darker text-center">
                        File upload coming soon. Please use URL option for now.
                      </p>
                      <button
                        onClick={() => {
                          setIsEditingAvatar(false);
                          setAvatarUrl("");
                        }}
                        className="w-full px-3 py-1.5 bg-secondary-dark hover:bg-secondary-darker text-text rounded-lg text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              <h2 className="text-xl font-semibold text-text mb-1">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.username || "User"
                }
              </h2>
              <p className="text-sm text-muted-foreground mb-4">@{user?.userName || user?.username}</p>
              {user?.emailVerified !== false && (
                <span className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-xs font-medium">
                  ✓ Verified
                </span>
              )}
            </div>
          </div>

          {/* Profile Details Section */}
          <div className="lg:col-span-2">
            <div className="bg-secondary rounded-lg p-6 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-text">Profile Information</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">First Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text"
                    />
                  ) : (
                    <p className="px-4 py-2 bg-background border border-border rounded-lg text-text">
                      {user?.firstName || "Not set"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-2">Last Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text"
                    />
                  ) : (
                    <p className="px-4 py-2 bg-background border border-border rounded-lg text-text">
                      {user?.lastName || "Not set"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-2">Username</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text"
                    />
                  ) : (
                    <p className="px-4 py-2 bg-background border border-border rounded-lg text-text">
                      {user?.userName || user?.username || "Not set"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-2">Email</label>
                  <p className="px-4 py-2 bg-background border border-border rounded-lg text-text opacity-50 cursor-not-allowed">
                    {user?.email || "Not available"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-lg font-semibold text-text mb-4">Account Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Account Created</label>
                    <p className="px-4 py-2 bg-background border border-border rounded-lg text-text">
                      {user?.createdAt 
                        ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : "Not available"
                      }
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Last Updated</label>
                    <p className="px-4 py-2 bg-background border border-border rounded-lg text-text">
                      {user?.updatedAt 
                        ? new Date(user.updatedAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : "Not available"
                      }
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Email Verified</label>
                    <p className="px-4 py-2 bg-background border border-border rounded-lg text-text">
                      {user?.emailVerified !== false ? "✓ Verified" : "✗ Not Verified"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Status</label>
                    <p className="px-4 py-2 bg-background border border-border rounded-lg text-text">
                      {user?.isOnline ? "🟢 Online" : "⚫ Offline"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

