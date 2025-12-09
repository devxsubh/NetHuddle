"use client";

import { useAppSelector } from "@/lib/client/store/hooks";
import { selectLoggedInUser } from "@/lib/client/slices/authSlice";
import { useGetMeQuery, useUpdateMeMutation } from "@/lib/client/rtk-query/auth.api";
import { useState } from "react";
import toast from "react-hot-toast";
import { PageWrapper } from "@/components/shared/PageWrapper";

export default function SettingsPage() {
  const loggedInUser = useAppSelector(selectLoggedInUser);
  const { data: userData } = useGetMeQuery();
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  
  const user = userData?.data || loggedInUser;
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [userName, setUserName] = useState(user?.userName || "");

  const handleSave = async () => {
    try {
      await updateMe({
        userId: user?.id,
        data: {
          firstName,
          lastName,
          userName,
        }
      }).unwrap();
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  return (
    <PageWrapper
      title="Settings"
      description="Manage your account settings and preferences"
      maxWidth="2xl"
    >
      <div className="bg-secondary-dark rounded-lg p-6 border border-border space-y-4">
          <h2 className="text-xl font-semibold text-text mb-4">Profile Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Username</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Email</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text opacity-50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>

            <button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
    </PageWrapper>
  );
}

