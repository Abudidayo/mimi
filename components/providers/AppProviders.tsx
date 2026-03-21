"use client";

import { useMemo } from "react";
import { CivicAuthProvider } from "@civic/auth/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";

interface AppProvidersProps {
  children: React.ReactNode;
  convexUrl?: string;
}

export function AppProviders({ children, convexUrl }: AppProvidersProps) {
  const convex = useMemo(() => {
    if (!convexUrl) return null;
    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  if (!convex) {
    return <CivicAuthProvider>{children}</CivicAuthProvider>;
  }

  return (
    <CivicAuthProvider>
      <ConvexProvider client={convex}>{children}</ConvexProvider>
    </CivicAuthProvider>
  );
}
