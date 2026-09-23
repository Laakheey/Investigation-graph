"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span>Loading EBRR Investigation Hub...</span>
      </div>
    </div>
  );
}
