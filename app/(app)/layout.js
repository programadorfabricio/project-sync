"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◆" },
  { href: "/projetos", label: "Projetos", icon: "▣" },
  { href: "/ideias", label: "Ideias", icon: "✦" },
  { href: "/metas", label: "Metas", icon: "◎" },
  { href: "/tarefas", label: "Tarefas", icon: "▦" },
  { href: "/calendario", label: "Calendário", icon: "▤" },
  { href: "/chat", label: "Chat", icon: "◈" },
];

export default function AppLayout({ children }) {
  const { session, perfil, sair } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (session === null) router.replace("/login");
  }, [session, router]);

  if (session === undefined || session === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="pulse-dot w-3 h-3 rounded-full" style={{ background: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      <aside
        className="w-60 shrink-0 border-r flex flex-col p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2 px-2 mb-8 mt-1">
          <div className="pulse-dot w-2.5 h-2.5 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="font-display text-lg font-semibold">Project Sync</span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const ativo = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition"
                style={{
                  background: ativo ? "var(--accent-soft)" : "transparent",
                  color: ativo ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          {perfil && (
            <div
              className="rounded-lg p-3 mb-2 border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{perfil.avatar_emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{perfil.nome}</p>
                  <p className="text-xs" style={{ color: "var(--xp)" }}>
                    {perfil.xp} XP · 🔥 {perfil.sequencia_dias}d
                  </p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              if (window.confirm("Tem certeza que quer sair?")) sair();
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold border transition"
            style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
          >
            <span className="text-base leading-none">⏻</span>
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
