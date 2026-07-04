"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import KanbanTarefas from "../_components/KanbanTarefas";

export default function TarefasPage() {
  const { supabase, perfil, recarregarPerfil } = useAuth();
  const [tarefas, setTarefas] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ titulo: "", descricao: "", prazo: "", prioridade: "media", projeto_id: "" });

  async function carregar() {
    const { data } = await supabase
      .from("tarefas")
      .select("*, responsavel:responsavel_id(nome, avatar_emoji), autor:criado_por(nome, avatar_emoji)")
      .order("created_at", { ascending: false });
    setTarefas(data ?? []);
  }

  async function carregarProjetos() {
    const { data } = await supabase.from("projetos").select("id, nome").order("nome", { ascending: true });
    setProjetos(data ?? []);
  }

  useEffect(() => {
    carregar();
    carregarProjetos();
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
      projeto_id: form.projeto_id || null,
    });
    setForm({ titulo: "", descricao: "", prazo: "", prioridade: "media", projeto_id: "" });
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

      <KanbanTarefas tarefas={tarefas} onMover={moverPara} onExcluir={excluir} />

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
            <select
              value={form.projeto_id}
              onChange={(e) => setForm({ ...form, projeto_id: e.target.value })}
              className="px-3 py-2.5 rounded-lg text-sm outline-none border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <option value="">Sem projeto</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
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
