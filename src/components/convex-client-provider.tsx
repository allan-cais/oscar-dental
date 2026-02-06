"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const isConfigured =
  convexUrl &&
  clerkKey &&
  !clerkKey.includes("placeholder") &&
  !convexUrl.includes("placeholder");

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  if (!isConfigured || !convex) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-bold">Oscar — Setup Required</h1>
        <div className="max-w-md rounded-lg border bg-muted p-4 text-sm">
          <p className="font-medium">Missing environment configuration:</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
            {(!convexUrl || convexUrl.includes("placeholder")) && (
              <li>NEXT_PUBLIC_CONVEX_URL</li>
            )}
            {(!clerkKey || clerkKey.includes("placeholder")) && (
              <li>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</li>
            )}
          </ul>
          <p className="mt-3 text-muted-foreground">
            Copy <code>.env.example</code> to <code>.env.local</code> and fill
            in your Convex and Clerk credentials.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
