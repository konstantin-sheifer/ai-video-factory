"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getAuthenticatedDestination } from "@/lib/auth/auth-page-redirect";

export function AuthSessionRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    router.replace(getAuthenticatedDestination(window.location));
  }, [isLoaded, isSignedIn, router]);

  return null;
}
