"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function Home() {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session === undefined) return; // ainda carregando
    router.replace(session ? "/dashboard" : "/login");
  }, [session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="pulse-dot w-3 h-3 rounded-full" style={{ background: "var(--accent)" }} />
    </div>
  );
}
