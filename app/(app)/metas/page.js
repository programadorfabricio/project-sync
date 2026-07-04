"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

const TIPOS = [
  { v: "diaria", label: "Diárias" },
  { v: "semanal", label: "Semanais" },
  { v: "mensal", label: "Mensais" },
  { v: "anual", label: "Anuais" },
];

export default function MetasPage() {
  const { supabase, perfil, recarregarPerfil } = useAuth();
  const [metas, setMetas] = useState([]);
  const [tipo, setTipo] = useState("diaria");
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ titulo: "", valor_alvo: 1, unidade: "horas" });

  async function carregar() {
    const { data } = await supabase
      .from("metas")
      .select("*, responsavel:responsavel_id(nome, avatar_emoji)")
      .order("created_at", { ascending: false });
    setMetas(data ?? []);
  }

  useEffect(() => {
    carregar();
  }, [supabase]);

  async function criarMeta(e) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    const hoje = new Date().toISOString().slice(0, 10);
    await supabase.from("metas").insert({
      titulo: form.titulo,
      tipo,
      valor_alvo: Number(form.valor_alvo),
      unidade: form.unidade,
      responsavel_id: perfil.id,
      data_referencia: hoje,
    });
    setForm({ titulo: "", valor_alvo: 1, unidade: "horas" });
    setModalAberto(false);
    carregar();
  }

  async function atualizarProgresso(meta, novoValor) {
    const valor = Math.max(0, novoValor);
    const concluidaAntes = meta.concluida;
    const concluidaAgora = valor >= meta.valor_alvo;

    await supabase
      .from("metas")
      .update({ valor_atual: valor, concluida: concluidaAgora })
      .eq("id", meta.id);

    if (!concluidaAntes && concluidaAgora && meta.responsavel_id === perfil.id) {
      await supabase.rpc("dar_xp", { usuario_id: perfil.id, quantidade: 20 });
      recarregarPerfil();
    }
    carregar();
  }

  async function excluir(id) {
    await supabase.from("metas").delete().eq("id", id);
    carregar();
  }

  const filtradas = metas.filter((m) => m.tipo === tipo);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Metas</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            O que precisa acontecer, e quanto já andou.
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: "var(--accent)", color: "#0f1420" }}
        >
          + Nova meta
        </button>
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: "var(--surface-2)" }}>
        {TIPOS.map((t) => (
          <button
            key={t.v}
            onClick={() => setTipo(t.v)}
            className="px-4 py-2 rounded-md text-sm font-medium transition"
            style={{
              background: tipo === t.v ? "var(--accent)" : "transparent",
              color: tipo === t.v ? "#0f1420" : "var(--text-muted)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtradas.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Nenhuma meta {TIPOS.find((t) => t.v === tipo)?.label.toLowerCase()} ainda.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {filtradas.map((meta) => {
          const pct = Math.min(100, Math.round((meta.valor_atual / meta.valor_alvo) * 100));
          return (
            <div
              key={meta.id}
              className="rounded-xl p-5 border flex flex-col gap-3"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm">{meta.titulo}</h3>
                  {meta.responsavel && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Criada por {meta.responsavel.avatar_emoji} {meta.responsavel.nome}
                    </p>
                  )}
                </div>
                <button onClick={() => excluir(meta.id)} className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  excluir
                </button>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: "var(--text-muted)" }}>
                    {meta.valor_atual} / {meta.valor_alvo} {meta.unidade}
                  </span>
                  <span style={{ color: meta.concluida ? "var(--success)" : "var(--text-muted)" }}>
                    {pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: meta.concluida ? "var(--success)" : "var(--sync)",
                    }}
                  />
                </div>
              </div>

              {meta.responsavel_id === perfil?.id && !meta.concluida && (
                <div className="flex gap-2">
                  <button
                    onClick={() => atualizarProgresso(meta, meta.valor_atual + 1)}
                    className="flex-1 py-1.5 rounded-md text-xs font-medium border"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                  >
                    +1
                  </button>
                  <button
                    onClick={() => atualizarProgresso(meta, meta.valor_alvo)}
                    className="flex-1 py-1.5 rounded-md text-xs font-medium border"
                    style={{ borderColor: "var(--border)", color: "var(--success)" }}
                  >
                    Concluir
                  </button>
                </div>
              )}
              {meta.concluida && (
                <p className="text-xs font-medium" style={{ color: "var(--success)" }}>
                  ✓ Concluída
                </p>
              )}
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
            onSubmit={criarMeta}
            className="w-full max-w-md rounded-2xl p-6 border flex flex-col gap-4"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <h2 className="font-display text-lg font-semibold">
              Nova meta {TIPOS.find((t) => t.v === tipo)?.label.toLowerCase()}
            </h2>
            <input
              required
              autoFocus
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex: Estudar React"
              className="px-3 py-2.5 rounded-lg text-sm outline-none border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                type="number"
                min={1}
                value={form.valor_alvo}
                onChange={(e) => setForm({ ...form, valor_alvo: e.target.value })}
                placeholder="Alvo"
                className="px-3 py-2.5 rounded-lg text-sm outline-none border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
              />
              <select
                value={form.unidade}
                onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                className="px-3 py-2.5 rounded-lg text-sm outline-none border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
              >
                <option value="horas">horas</option>
                <option value="tarefas">tarefas</option>
                <option value="paginas">páginas</option>
                <option value="km">km</option>
                <option value="unidades">unidades</option>
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
