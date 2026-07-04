"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function DashboardPage() {
  const { supabase, perfil, todosPerfis } = useAuth();
  const [stats, setStats] = useState({
    metasHoje: 0,
    tarefasAtrasadas: 0,
    ideiasPendentes: 0,
  });
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!perfil) return;
    (async () => {
      const hoje = new Date().toISOString().slice(0, 10);

      const [{ count: metasHoje }, { count: tarefasAtrasadas }, { count: ideiasPendentes }] =
        await Promise.all([
          supabase
            .from("metas")
            .select("id", { count: "exact", head: true })
            .eq("responsavel_id", perfil.id)
            .eq("data_referencia", hoje)
            .eq("concluida", false),
          supabase
            .from("tarefas")
            .select("id", { count: "exact", head: true })
            .neq("status", "concluido")
            .lt("prazo", hoje),
          supabase
            .from("ideias")
            .select("id", { count: "exact", head: true })
            .eq("status", "nova"),
        ]);

      setStats({
        metasHoje: metasHoje ?? 0,
        tarefasAtrasadas: tarefasAtrasadas ?? 0,
        ideiasPendentes: ideiasPendentes ?? 0,
      });
      setCarregando(false);
    })();
  }, [supabase, perfil]);

  if (!perfil) return null;

  const cards = [
    { label: "Metas hoje", valor: stats.metasHoje, cor: "var(--sync)" },
    { label: "Tarefas atrasadas", valor: stats.tarefasAtrasadas, cor: "var(--danger)" },
    { label: "Ideias pendentes", valor: stats.ideiasPendentes, cor: "var(--accent)" },
    { label: "Sequência", valor: `🔥 ${perfil.sequencia_dias}d`, cor: "var(--xp)" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">
        {saudacao()}, {perfil.nome}.
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        {carregando ? "Carregando seu dia..." : "Aqui está o que está rolando hoje."}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl p-5 border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              {c.label}
            </p>
            <p className="font-display text-2xl font-semibold" style={{ color: c.cor }}>
              {c.valor}
            </p>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl p-6 border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2 className="font-display text-base font-semibold mb-4">Ranking</h2>
        <div className="flex flex-col gap-3">
          {todosPerfis.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3">
              <span
                className="text-xs w-5 font-mono"
                style={{ color: i === 0 ? "var(--xp)" : "var(--text-muted)" }}
              >
                #{i + 1}
              </span>
              <span className="text-lg leading-none">{p.avatar_emoji}</span>
              <span className="text-sm flex-1">{p.nome}</span>
              <span className="text-sm font-mono" style={{ color: "var(--xp)" }}>
                {p.xp} XP
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
