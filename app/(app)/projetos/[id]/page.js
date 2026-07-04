"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import KanbanTarefas from "../../_components/KanbanTarefas";

const STATUS = {
  planejado: { label: "Planejado", cor: "var(--text-muted)" },
  em_andamento: { label: "Em andamento", cor: "var(--sync)" },
  pausado: { label: "Pausado", cor: "var(--xp)" },
  concluido: { label: "Concluído", cor: "var(--success)" },
  cancelado: { label: "Cancelado", cor: "var(--danger)" },
};

export default function ProjetoDetalhePage() {
  const { id } = useParams();
  const { supabase, perfil, recarregarPerfil } = useAuth();
  const [projeto, setProjeto] = useState(undefined);
  const [tarefas, setTarefas] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ titulo: "", descricao: "", prazo: "", prioridade: "media" });

  async function carregar() {
    const { data: projetoData } = await supabase.from("projetos").select("*").eq("id", id).single();
    setProjeto(projetoData ?? null);

    const { data: tarefasData } = await supabase
      .from("tarefas")
      .select("*, responsavel:responsavel_id(nome, avatar_emoji), autor:criado_por(nome, avatar_emoji)")
      .eq("projeto_id", id)
      .order("created_at", { ascending: false });
    setTarefas(tarefasData ?? []);
  }

  useEffect(() => {
    carregar();
  }, [supabase, id]);

  async function criarTarefa(e) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    await supabase.from("tarefas").insert({
      titulo: form.titulo,
      descricao: form.descricao,
      prazo: form.prazo || null,
      prioridade: form.prioridade,
      responsavel_id: perfil.id,
      criado_por: perfil.id,
      projeto_id: id,
    });
    setForm({ titulo: "", descricao: "", prazo: "", prioridade: "media" });
    setModalAberto(false);
    carregar();
  }

  async function moverPara(tarefa, novoStatus) {
    if (tarefa.status === novoStatus) return;
    await supabase.from("tarefas").update({ status: novoStatus }).eq("id", tarefa.id);
    if (novoStatus === "concluido" && tarefa.responsavel_id === perfil.id) {
      await supabase.rpc("dar_xp", { usuario_id: perfil.id, quantidade: 30 });
      recarregarPerfil();
    }
    carregar();
  }

  async function excluirTarefa(idTarefa) {
    await supabase.from("tarefas").delete().eq("id", idTarefa);
    carregar();
  }

  async function mudarStatusProjeto(novoStatus) {
    if (!projeto || projeto.status === novoStatus) return;
    await supabase.from("projetos").update({ status: novoStatus }).eq("id", projeto.id);
    if (novoStatus === "concluido") {
      await supabase.rpc("dar_xp", { usuario_id: projeto.responsavel_id, quantidade: 200 });
      if (projeto.responsavel_id === perfil.id) recarregarPerfil();
    }
    carregar();
  }

  if (projeto === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="pulse-dot w-3 h-3 rounded-full" style={{ background: "var(--accent)" }} />
      </div>
    );
  }

  if (projeto === null) {
    return (
      <div className="text-center py-16 rounded-xl border border-dashed" style={{ borderColor: "var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Projeto não encontrado.
        </p>
        <Link href="/projetos" className="text-sm mt-3 inline-block" style={{ color: "var(--accent)" }}>
          ← Voltar pra Projetos
        </Link>
      </div>
    );
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const atrasado = projeto.prazo && projeto.prazo < hoje && projeto.status !== "concluido";

  return (
    <div>
      <Link href="/projetos" className="text-xs" style={{ color: "var(--text-muted)" }}>
        ← Projetos
      </Link>

      <div className="flex items-start justify-between gap-4 mt-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: projeto.cor }} />
            <h1 className="font-display text-2xl font-semibold">{projeto.nome}</h1>
          </div>
          {projeto.descricao && (
            <p className="text-sm mt-1.5" style={{ color: "var(--text-muted)" }}>
              {projeto.descricao}
            </p>
          )}
          <div className="flex items-center gap-3 mt-3 text-xs">
            <select
              value={projeto.status}
              onChange={(e) => mudarStatusProjeto(e.target.value)}
              className="text-xs font-medium rounded-md px-2 py-1.5 border outline-none"
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
                Prazo: {new Date(projeto.prazo + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold shrink-0"
          style={{ background: "var(--accent)", color: "#0f1420" }}
        >
          + Nova tarefa
        </button>
      </div>

      <KanbanTarefas tarefas={tarefas} onMover={moverPara} onExcluir={excluirTarefa} />

      {modalAberto && (
        <div
          className="fixed inset-0 flex items-center justify-center p-6 z-50"
          style={{ background: "#00000090" }}
          onClick={() => setModalAberto(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={criarTarefa}
            className="w-full max-w-md rounded-2xl p-6 border flex flex-col gap-4"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <h2 className="font-display text-lg font-semibold">Nova tarefa em {projeto.nome}</h2>
            <input
              required
              autoFocus
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Título da tarefa"
              className="px-3 py-2.5 rounded-lg text-sm outline-none border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            />
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Descrição (opcional)"
              rows={2}
              className="px-3 py-2.5 rounded-lg text-sm outline-none border resize-none"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.prazo}
                onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                className="px-3 py-2.5 rounded-lg text-sm outline-none border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
              />
              <select
                value={form.prioridade}
                onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
                className="px-3 py-2.5 rounded-lg text-sm outline-none border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
              >
                <option value="baixa">Prioridade baixa</option>
                <option value="media">Prioridade média</option>
                <option value="alta">Prioridade alta</option>
              </select>
            </div>
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
