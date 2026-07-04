"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

const CORES = ["#ff6b4a", "#5b8def", "#f2b84b", "#34d399", "#f0556b", "#a78bfa", "#22d3ee", "#f472b6"];

const STATUS = {
  planejado: { label: "Planejado", cor: "var(--text-muted)" },
  em_andamento: { label: "Em andamento", cor: "var(--sync)" },
  pausado: { label: "Pausado", cor: "var(--xp)" },
  concluido: { label: "Concluído", cor: "var(--success)" },
  cancelado: { label: "Cancelado", cor: "var(--danger)" },
};

export default function ProjetosPage() {
  const { supabase, perfil, recarregarPerfil } = useAuth();
  const router = useRouter();
  const [projetos, setProjetos] = useState([]);
  const [tarefasPorProjeto, setTarefasPorProjeto] = useState({});
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "", cor: CORES[0], prazo: "" });

  async function carregar() {
    const { data } = await supabase.from("projetos").select("*").order("created_at", { ascending: false });
    const lista = data ?? [];
    setProjetos(lista);

    if (lista.length === 0) {
      setTarefasPorProjeto({});
      return;
    }
    const { data: tarefas } = await supabase
      .from("tarefas")
      .select("id, status, projeto_id")
      .in("projeto_id", lista.map((p) => p.id));
    const agrupado = {};
    for (const t of tarefas ?? []) {
      (agrupado[t.projeto_id] ??= []).push(t);
    }
    setTarefasPorProjeto(agrupado);
  }

  useEffect(() => {
    carregar();
  }, [supabase]);

  async function criarProjeto(e) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    await supabase.from("projetos").insert({
      nome: form.nome,
      descricao: form.descricao,
      cor: form.cor,
      prazo: form.prazo || null,
      status: "em_andamento",
      responsavel_id: perfil.id,
      criado_por: perfil.id,
    });
    setForm({ nome: "", descricao: "", cor: CORES[0], prazo: "" });
    setModalAberto(false);
    carregar();
  }

  async function mudarStatus(projeto, novoStatus) {
    if (projeto.status === novoStatus) return;
    await supabase.from("projetos").update({ status: novoStatus }).eq("id", projeto.id);
    if (novoStatus === "concluido") {
      await supabase.rpc("dar_xp", { usuario_id: projeto.responsavel_id, quantidade: 200 });
      if (projeto.responsavel_id === perfil.id) recarregarPerfil();
    }
    carregar();
  }

  async function excluir(id) {
    await supabase.from("projetos").delete().eq("id", id);
    carregar();
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Projetos</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Onde as tarefas se agrupam em algo maior.
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: "var(--accent)", color: "#0f1420" }}
        >
          + Novo projeto
        </button>
      </div>

      {projetos.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Nenhum projeto ainda. Bora criar o primeiro.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {projetos.map((projeto) => {
          const tarefas = tarefasPorProjeto[projeto.id] ?? [];
          const total = tarefas.length;
          const concluidas = tarefas.filter((t) => t.status === "concluido").length;
          const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0;
          const atrasado = projeto.prazo && projeto.prazo < hoje && projeto.status !== "concluido";

          return (
            <div
              key={projeto.id}
              onClick={() => router.push(`/projetos/${projeto.id}`)}
              className="rounded-xl p-5 border flex flex-col gap-3 cursor-pointer"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                borderLeftColor: projeto.cor,
                borderLeftWidth: "4px",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm leading-snug">{projeto.nome}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    excluir(projeto.id);
                  }}
                  className="text-xs shrink-0"
                  style={{ color: "var(--text-muted)" }}
                >
                  excluir
                </button>
              </div>

              {projeto.descricao && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {projeto.descricao}
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <select
                  value={projeto.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => mudarStatus(projeto, e.target.value)}
                  className="text-xs font-medium rounded-md px-2 py-1.5 border self-start outline-none"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface-2)",
                    color: STATUS[projeto.status].cor,
                  }}
                >
                  {Object.entries(STATUS).map(([v, s]) => (
                    <option key={v} value={v}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {projeto.prazo && (
                  <span style={{ color: atrasado ? "var(--danger)" : "var(--text-muted)" }}>
                    {new Date(projeto.prazo + "T00:00:00").toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: "var(--text-muted)" }}>
                    {total > 0 ? `${concluidas} / ${total} tarefas` : "Sem tarefas vinculadas"}
                  </span>
                  <span style={{ color: projeto.status === "concluido" ? "var(--success)" : "var(--text-muted)" }}>
                    {pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: projeto.status === "concluido" ? "var(--success)" : "var(--sync)",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modalAberto && (
        <div
          className="fixed inset-0 flex items-center justify-center p-6 z-50"
          style={{ background: "#00000090" }}
          onClick={() => setModalAberto(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={criarProjeto}
            className="w-full max-w-md rounded-2xl p-6 border flex flex-col gap-4"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <h2 className="font-display text-lg font-semibold">Novo projeto</h2>
            <input
              required
              autoFocus
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome do projeto"
              className="px-3 py-2.5 rounded-lg text-sm outline-none border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            />
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Descrição (opcional)"
              rows={3}
              className="px-3 py-2.5 rounded-lg text-sm outline-none border resize-none"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            />
            <div className="flex gap-2 flex-wrap">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, cor: c })}
                  className="w-7 h-7 rounded-full border-2"
                  style={{ background: c, borderColor: form.cor === c ? "var(--text)" : "transparent" }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
            <input
              type="date"
              value={form.prazo}
              onChange={(e) => setForm({ ...form, prazo: e.target.value })}
              className="px-3 py-2.5 rounded-lg text-sm outline-none border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            />
            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "var(--accent)", color: "#0f1420" }}
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
