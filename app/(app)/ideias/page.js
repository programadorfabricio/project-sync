"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

const CATEGORIAS = [
  { v: "negocios", label: "Negócios" },
  { v: "marketing", label: "Marketing" },
  { v: "sistema", label: "Sistema" },
  { v: "ia", label: "IA" },
  { v: "investimento", label: "Investimento" },
  { v: "pessoal", label: "Pessoal" },
];

const IMPORTANCIAS = { baixa: "Baixa", media: "Média", alta: "Alta" };
const STATUS = {
  nova: { label: "Nova", cor: "var(--sync)" },
  em_analise: { label: "Em análise", cor: "var(--xp)" },
  aprovada: { label: "Aprovada", cor: "var(--success)" },
  descartada: { label: "Descartada", cor: "var(--text-muted)" },
};

export default function IdeiasPage() {
  const { supabase, perfil, todosPerfis, recarregarPerfil } = useAuth();
  const [ideias, setIdeias] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ titulo: "", descricao: "", categoria: "negocios", importancia: "media" });

  async function carregar() {
    const { data } = await supabase
      .from("ideias")
      .select("*, responsavel:responsavel_id(nome, avatar_emoji), autor:criado_por(nome, avatar_emoji)")
      .order("created_at", { ascending: false });
    setIdeias(data ?? []);
  }

  useEffect(() => {
    carregar();
  }, [supabase]);

  async function criarIdeia(e) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    await supabase.from("ideias").insert({
      titulo: form.titulo,
      descricao: form.descricao,
      categoria: form.categoria,
      importancia: form.importancia,
      responsavel_id: perfil.id,
      criado_por: perfil.id,
    });
    await supabase.rpc("dar_xp", { usuario_id: perfil.id, quantidade: 5 });
    recarregarPerfil();
    setForm({ titulo: "", descricao: "", categoria: "negocios", importancia: "media" });
    setModalAberto(false);
    carregar();
  }

  async function mudarStatus(id, status) {
    await supabase.from("ideias").update({ status }).eq("id", id);
    carregar();
  }

  async function excluir(id) {
    await supabase.from("ideias").delete().eq("id", id);
    carregar();
  }

  const filtradas = ideias.filter((i) => filtroCategoria === "todas" || i.categoria === filtroCategoria);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Ideias</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Tudo que passa pela cabeça, registrado antes de esquecer.
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: "var(--accent)", color: "#0f1420" }}
        >
          + Nova ideia
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFiltroCategoria("todas")}
          className="px-3 py-1.5 rounded-full text-xs font-medium border"
          style={{
            borderColor: "var(--border)",
            background: filtroCategoria === "todas" ? "var(--surface-2)" : "transparent",
            color: filtroCategoria === "todas" ? "var(--text)" : "var(--text-muted)",
          }}
        >
          Todas
        </button>
        {CATEGORIAS.map((c) => (
          <button
            key={c.v}
            onClick={() => setFiltroCategoria(c.v)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border"
            style={{
              borderColor: "var(--border)",
              background: filtroCategoria === c.v ? "var(--surface-2)" : "transparent",
              color: filtroCategoria === c.v ? "var(--text)" : "var(--text-muted)",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtradas.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Nenhuma ideia por aqui ainda. Bora criar a primeira.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {filtradas.map((ideia) => (
          <div
            key={ideia.id}
            className="rounded-xl p-5 border flex flex-col gap-3"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-snug">{ideia.titulo}</h3>
              <button
                onClick={() => excluir(ideia.id)}
                className="text-xs shrink-0"
                style={{ color: "var(--text-muted)" }}
              >
                excluir
              </button>
            </div>
            {ideia.descricao && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {ideia.descricao}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span
                className="px-2 py-1 rounded-md font-medium"
                style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
              >
                {CATEGORIAS.find((c) => c.v === ideia.categoria)?.label}
              </span>
              <span
                className="px-2 py-1 rounded-md font-medium"
                style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
              >
                Importância: {IMPORTANCIAS[ideia.importancia]}
              </span>
              {ideia.responsavel && (
                <span style={{ color: "var(--text-muted)" }}>
                  {ideia.responsavel.avatar_emoji} {ideia.responsavel.nome}
                </span>
              )}
            </div>
            {ideia.autor && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Postado por {ideia.autor.avatar_emoji} {ideia.autor.nome}
              </p>
            )}
            <select
              value={ideia.status}
              onChange={(e) => mudarStatus(ideia.id, e.target.value)}
              className="text-xs font-medium rounded-md px-2 py-1.5 border self-start outline-none"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface-2)",
                color: STATUS[ideia.status].cor,
              }}
            >
              {Object.entries(STATUS).map(([v, s]) => (
                <option key={v} value={v}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {modalAberto && (
        <div
          className="fixed inset-0 flex items-center justify-center p-6 z-50"
          style={{ background: "#00000090" }}
          onClick={() => setModalAberto(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={criarIdeia}
            className="w-full max-w-md rounded-2xl p-6 border flex flex-col gap-4"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <h2 className="font-display text-lg font-semibold">Nova ideia</h2>
            <input
              required
              autoFocus
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Título da ideia"
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
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="px-3 py-2.5 rounded-lg text-sm outline-none border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.v} value={c.v}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                value={form.importancia}
                onChange={(e) => setForm({ ...form, importancia: e.target.value })}
                className="px-3 py-2.5 rounded-lg text-sm outline-none border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
              >
                {Object.entries(IMPORTANCIAS).map(([v, l]) => (
                  <option key={v} value={v}>
                    Importância: {l}
                  </option>
                ))}
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
                Salvar (+5 XP)
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
