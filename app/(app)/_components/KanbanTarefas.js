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

export default function KanbanTarefas({ tarefas, onMover, onExcluir }) {
  const { supabase } = useAuth();
  const [itensPorTarefa, setItensPorTarefa] = useState({});
  const [expandidas, setExpandidas] = useState(new Set());
  const [novoItemTexto, setNovoItemTexto] = useState({});
  const [arrastando, setArrastando] = useState(null);

  async function carregarItens(lista) {
    if (lista.length === 0) {
      setItensPorTarefa({});
      return;
    }
    const { data } = await supabase
      .from("tarefa_itens")
      .select("*")
      .in("tarefa_id", lista.map((t) => t.id))
      .order("ordem", { ascending: true });
    const agrupado = {};
    for (const item of data ?? []) {
      (agrupado[item.tarefa_id] ??= []).push(item);
    }
    setItensPorTarefa(agrupado);
  }

  useEffect(() => {
    carregarItens(tarefas);
  }, [tarefas, supabase]);

  function alternarExpandir(tarefaId) {
    setExpandidas((prev) => {
      const novo = new Set(prev);
      if (novo.has(tarefaId)) novo.delete(tarefaId);
      else novo.add(tarefaId);
      return novo;
    });
  }

  async function adicionarItem(tarefa, texto) {
    if (!texto.trim()) return;
    const itensAtuais = itensPorTarefa[tarefa.id] ?? [];
    await supabase.from("tarefa_itens").insert({ tarefa_id: tarefa.id, texto: texto.trim(), ordem: itensAtuais.length });
    setNovoItemTexto((prev) => ({ ...prev, [tarefa.id]: "" }));
    carregarItens(tarefas);
  }

  async function alternarItem(item) {
    await supabase.from("tarefa_itens").update({ concluido: !item.concluido }).eq("id", item.id);
    carregarItens(tarefas);
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {COLUNAS.map((col) => {
        const itensColuna = tarefas.filter((t) => t.status === col.v);
        return (
          <div
            key={col.v}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (arrastando) onMover(arrastando, col.v);
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
                {itensColuna.length}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {itensColuna.map((t) => {
                const atrasada = t.prazo && t.prazo < hoje && t.status !== "concluido";
                const itensChecklist = itensPorTarefa[t.id] ?? [];
                const concluidosChecklist = itensChecklist.filter((i) => i.concluido).length;
                const expandida = expandidas.has(t.id);

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
                        onClick={() => onExcluir(t.id)}
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

                    <button
                      onClick={() => alternarExpandir(t.id)}
                      className="flex items-center gap-1 text-xs mt-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span className="leading-none">{expandida ? "▾" : "▸"}</span>
                      <span>
                        {itensChecklist.length > 0 ? `${concluidosChecklist}/${itensChecklist.length} itens` : "checklist"}
                      </span>
                    </button>

                    {expandida && (
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                        {itensChecklist.length === 0 && (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Nenhum item ainda.
                          </p>
                        )}
                        {itensChecklist.map((item) => (
                          <label key={item.id} className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" checked={item.concluido} onChange={() => alternarItem(item)} />
                            <span
                              style={{
                                color: item.concluido ? "var(--success)" : "var(--text)",
                                textDecoration: item.concluido ? "line-through" : "none",
                              }}
                            >
                              {item.texto}
                            </span>
                          </label>
                        ))}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            adicionarItem(t, novoItemTexto[t.id] ?? "");
                          }}
                          className="flex gap-2 mt-1"
                        >
                          <input
                            value={novoItemTexto[t.id] ?? ""}
                            onChange={(e) => setNovoItemTexto((prev) => ({ ...prev, [t.id]: e.target.value }))}
                            placeholder="Adicionar item..."
                            className="flex-1 px-2.5 py-1.5 rounded-md text-xs outline-none border"
                            style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-md text-xs font-semibold"
                            style={{ background: "var(--accent)", color: "#0f1420" }}
                          >
                            +
                          </button>
                        </form>
                      </div>
                    )}

                    {col.v !== "concluido" && (
                      <select
                        value={t.status}
                        onChange={(e) => onMover(t, e.target.value)}
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
  );
}
