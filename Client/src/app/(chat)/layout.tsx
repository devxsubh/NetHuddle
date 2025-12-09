import { FeatureSidebar } from "@/components/sidebar/FeatureSidebar";
import { SidebarContent } from "@/components/sidebar/SidebarContent";
import { SidebarProvider } from "@/context/sidebar.context";
import { NetworkCallNotification } from "@/components/network/NetworkCallNotification";
import { NetworkLayoutClient } from "./NetworkLayoutClient";
import { FriendRequestListener } from "@/components/friends/FriendRequestListener";
import { Metadata } from "next";

export const metadata:Metadata = {
   

  title: "Mernchat - Secure & Encrypted Chat App",
  description: "Mernchat is a privacy-first chat app offering end-to-end encryption for private chats and secure real-time messaging.",
  keywords: ["Mernchat","secure chat","end-to-end encryption","private messaging","chat app","encrypted chat app","secure messaging","privacy-focused chat","real-time chat","secure communication","instant messaging","chat application","E2EE messaging","secure group chats","encrypted conversations","safe messaging app"],
  generator:"Next.js",
  applicationName: "Mernchat",
  authors: [{ name: "Rishi Bakshi", url: "https://rishibakshii.github.io/portfolio" }],
  creator: "Rishi Bakshi",
  publisher: "Rishi Bakshi",
  metadataBase: new URL("https://mernchat.in"),

  openGraph: {
    title: "Mernchat - Secure & Encrypted Chat App",
    description: "Mernchat is a privacy-first chat app offering end-to-end encryption for private chats and secure real-time messaging.",
    url: "https://mernchat.in",
    siteName: "Mernchat",
    images: [
      {
        url: "https://mernchat.in/images/og/og-image.png", // Static path from public folder
        width: 1200,
        height: 630,
        alt: "Mernchat - Secure & Encrypted Chat App",
      },
    ],
    type: "website",
    locale: "en_US", // Helps in localization
  },
  twitter: {
    card: "summary_large_image",
    title: "Mernchat - Secure & Encrypted Chat App",
    description: "Mernchat is a privacy-first chat app offering end-to-end encryption for private chats and secure real-time messaging.",
    images: ["https://mernchat.in/images/og/og-image.png"],
    creator:"@rishibakshii",
    site: "@rishibakshii",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://mernchat.in",
  },
};

export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <main className="h-screen relative">
        <SidebarProvider>
          <FeatureSidebar />
          <SidebarContent>{children}</SidebarContent>
          <NetworkLayoutClient />
          <FriendRequestListener />
        </SidebarProvider>
      </main>
    </>
  );
}
