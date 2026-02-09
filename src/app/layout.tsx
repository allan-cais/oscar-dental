import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/convex-client-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oscar — Dental Practice Management",
  description:
    "Hybrid-intelligence dental practice management platform by Custom AI Studio",
};

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isClerkConfigured =
  clerkKey &&
  !clerkKey.includes("placeholder") &&
  clerkKey.startsWith("pk_");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConvexClientProvider>
          {children}
          <Toaster />
        </ConvexClientProvider>
      </body>
    </html>
  );

  // Only wrap with ClerkProvider when real keys are configured
  if (isClerkConfigured) {
    return (
      <ClerkProvider
        appearance={{
          cssLayerName: "clerk",
        }}
      >
        {content}
      </ClerkProvider>
    );
  }

  return content;
}
