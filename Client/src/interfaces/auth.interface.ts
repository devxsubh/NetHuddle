export interface User {
  name: string;
  id: string;
  avatar: string;
  createdAt: Date;
  updatedAt: Date;
  username: string;
  email: string;
  notificationsEnabled: boolean;
  publicKey: string | null;
  emailVerified: boolean;
  verificationBadge: boolean;
}

export interface ResetPassword {
  token: string;
  newPassword: string;
}

export interface Otp {
  otp: string;
}
