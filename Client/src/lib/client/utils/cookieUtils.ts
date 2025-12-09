/**
 * Utility functions for managing authentication cookies
 */

export const setAuthCookie = (token: string, name: string = 'token') => {
  if (typeof document === 'undefined') return;
  
  // Set cookie with secure options
  const expires = new Date();
  expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  document.cookie = `${name}=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
};

export const getAuthCookie = (name: string = 'token'): string | null => {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(cookie => cookie.trim().startsWith(`${name}=`));
  return tokenCookie ? tokenCookie.split('=')[1] : null;
};

export const removeAuthCookie = (name: string = 'token') => {
  if (typeof document === 'undefined') return;
  
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

