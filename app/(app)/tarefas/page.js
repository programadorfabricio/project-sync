"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

const COLUNAS = [
  { v: "a_fazer", label: "A Fazer" },
  { v: "em_andamento", label: "Em andamento" },
  { v: "em_revisao", label: "Em revisão" },
  { v: "concluido", label: "Concluído" },
];

const PRIORIDADE_COR = { baixa: "var(--text-muted)", media: "var(--sync)", alta: "var(--danger)" };

export default function TarefasPage() {
  const { supabase, perfil, recarregarPerfil } = useAuth();
  const [tarefas, setTarefas] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ titulo: "", descricao: "", prazo: "", prioridade: "media" });
  const [arrastando, setArrastando] = useState(null);

  async function carregar() {
    const { data } = await supabase
      .from("tarefas")
      .select("*, responsavel:responsavel_id(nome, avatar_emoji), autor:criado_por(nome, avatar_emoji)")
      .order("created_at", { ascending: false });
    setTarefas(data ?? []);
  }

  useEffect(() => {
    carregar();
  }, [supabase]);

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

  async function excluir(id) {
    await supabase.from("tarefas").delete().eq("id", id);
    carregar();
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Tarefas</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Arraste os cartões entre as colunas conforme o andamento.
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: "var(--accent)", color: "#0f1420" }}
        >
          + Nova tarefa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUNAS.map((col) => {
          const itens = tarefas.filter((t) => t.status === col.v);
          return (
            <div
              key={col.v}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (arrastando) moverPara(arrastando, col.v);
                setArrastando(null);
              }}
              className="rounded-xl p-3 border min-h-[300px]"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between px-2 mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  {col.label}
                </h3>
                <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                  {itens.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {itens.map((t) => {
                  const atrasada = t.prazo && t.prazo < hoje && t.status !== "concluido";
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setArrastando(t)}
                      className="rounded-lg p-3 border cursor-grab active:cursor-grabbing"
                      style={{
                        background: "var(--surface-2)",
                        borderColor: atrasada ? "var(--danger)" : "var(--border)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium leading-snug">{t.titulo}</p>
                        <button
                          onClick={() => excluir(t.id)}
                          className="text-xs shrink-0"
                          style={{ color: "var(--text-muted)" }}
                        >
                          ✕
                        </button>
                      </div>
                      {t.descricao && (
                        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                          {t.descricao}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span style={{ color: PRIORIDADE_COR[t.prioridade] }}>● {t.prioridade}</span>
                        {t.prazo && (
                          <span style={{ color: atrasada ? "var(--danger)" : "var(--text-muted)" }}>
                            {new Date(t.prazo + "T00:00:00").toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {t.responsavel && <span>{t.responsavel.avatar_emoji}</span>}
                      </div>
                      {t.autor && (
                        <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                          Postado por {t.autor.avatar_emoji} {t.autor.nome}
                        </p>
                      )}

                      {col.v !== "concluido" && (
                        <select
                          value={t.status}
                          onChange={(e) => moverPara(t, e.target.value)}
                          className="mt-2 w-full text-xs rounded-md px-2 py-1 border outline-none"
                          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-muted)" }}
                        >
                          {COLUNAS.map((c) => (
                            <option key={c.v} value={c.v}>
                              → {c.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
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
            onSubmit={criarTarefa}
            className="w-full max-w-md rounded-2xl p-6 border flex flex-col gap-4"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <h2 className="font-display text-lg font-semibold">Nova tarefa</h2>
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
