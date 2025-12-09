import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { FetchUserInfoResponse } from "./interfaces/server.types";

const publicRoutes = [
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email", // Allow access to verification page
  "/verify-email", // Allow access to old verification redirect page
];
const protectedRoutes = [
  "/",
  "/auth/verification",
  "/chats",
  "/network",
  "/rooms",
  "/calls",
  "/file-transfer",
  "/quic-streaming",
  "/friends",
  "/metrics",
  "/settings",
  "/profile",
];

// Exclude Next.js static files and internal paths
const ignoredPaths = ["/_next", "/favicon.ico", "/api"];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Ignore Next.js assets & API routes
  if (ignoredPaths.some(ignoredPath => path.startsWith(ignoredPath))) {
    return NextResponse.next();
  }

  // Check if path is a protected route (exact match or starts with protected route)
  const isProtectedRoute = protectedRoutes.some(route => 
    path === route || (route !== "/" && path.startsWith(route))
  );
  const isPublicRoute = publicRoutes.some(route => 
    path === route || path.startsWith(route)
  );

  const token = req.cookies.get("token")?.value;

  // Check if token exists
  const hasToken = !!token;
  
  // If no token and trying to access protected route, redirect to login
  if (!hasToken && isProtectedRoute) {
    const redirectResponse = NextResponse.redirect(new URL("/auth/login", req.url));
    redirectResponse.cookies.set("token", "", { expires: new Date(0), path: "/" });
    redirectResponse.cookies.set("loggedInUserId", "", { expires: new Date(0), path: "/" });
    return redirectResponse;
  }
  // Redirect logged-in users away from public routes
  // BUT allow access to verify-email page even if logged in (needed for email verification)
  if (hasToken && isPublicRoute && path !== "/auth/verify-email" && path !== "/verify-email") {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  
  let userInfo: FetchUserInfoResponse | null = null;

  // Only fetch user info if necessary
  if (isProtectedRoute && hasToken) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/auth/me`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const response = await res.json() as { success: boolean; data: FetchUserInfoResponse };
        if (response.success) {
          userInfo = response.data;
        } else {
          // Invalid response format - redirect to login
          const redirectResponse = NextResponse.redirect(new URL("/auth/login", req.url));
          redirectResponse.cookies.set("token", "", { expires: new Date(0), path: "/" });
          redirectResponse.cookies.set("loggedInUserId", "", { expires: new Date(0), path: "/" });
          return redirectResponse;
        }
      } else {
        // Token is invalid (401/403) - redirect to login
        const redirectResponse = NextResponse.redirect(new URL("/auth/login", req.url));
        redirectResponse.cookies.set("token", "", { expires: new Date(0), path: "/" });
        redirectResponse.cookies.set("loggedInUserId", "", { expires: new Date(0), path: "/" });
        return redirectResponse;
      }
    } catch (error) {
      console.error("Error fetching user info in middleware:", error);
      // Network error or other issue - redirect to login
      const redirectResponse = NextResponse.redirect(new URL("/auth/login", req.url));
      redirectResponse.cookies.set("token", "", { expires: new Date(0), path: "/" });
      redirectResponse.cookies.set("loggedInUserId", "", { expires: new Date(0), path: "/" });
      return redirectResponse;
    }
  }

  // Redirect unverified users to verification page (unless already there or on verify-email page)
  // Backend uses 'confirmed' field, but frontend type uses 'emailVerified'
  const isEmailVerified = (userInfo as any)?.confirmed ?? userInfo?.emailVerified ?? false;
  
  if (userInfo && !isEmailVerified && path !== "/auth/verify-email" && path !== "/verify-email") {

    let response = null;

    if(path !== "/auth/verification") response = NextResponse.redirect(new URL("/auth/verification", req.url));
    else response = NextResponse.next();

    response.cookies.set("tempUserInfo", JSON.stringify(userInfo), {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
    return response
  }

  if (hasToken && userInfo?.id) {
    const response = NextResponse.next();
    response.cookies.set("loggedInUserId", userInfo.id, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }

  return NextResponse.next();

}
