"use client";

import { SessionProvider } from "@/lib/auth-client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
