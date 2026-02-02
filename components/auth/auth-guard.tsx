"use client";

import { useSession } from "next-auth/react";
import { LoginDialog } from "./login-dialog";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
            Chargement de la session...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginDialog />;
  }

  return <>{children}</>;
}
