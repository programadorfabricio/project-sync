"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

const TIPOS = [
  { v: "diaria", label: "Diárias" },
  { v: "semanal", label: "Semanais" },
  { v: "mensal", label: "Mensais" },
  { v: "anual", label: "Anuais" },
];

const TIPO_SINGULAR = { diaria: "Diária", semanal: "Semanal", mensal: "Mensal", anual: "Anual" };

const ABAS = [{ v: "todas", label: "Todas" }, ...TIPOS];

export default function MetasPage() {
  const { supabase, perfil, recarregarPerfil } = useAuth();
  const [metas, setMetas] = useState([]);
  const [tipo, setTipo] = useState("diaria");
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ titulo: "", valor_alvo: 1, unidade: "horas" });
  const [itensPorMeta, setItensPorMeta] = useState({});
  const [expandidas, setExpandidas] = useState(new Set());
  const [novoItemTexto, setNovoItemTexto] = useState({});

  async function carregar() {
    const { data } = await supabase
      .from("metas")
      .select("*, responsavel:responsavel_id(nome, avatar_emoji)")
      .order("created_at", { ascending: false });
    const listaMetas = data ?? [];
    setMetas(listaMetas);

    if (listaMetas.length === 0) {
      setItensPorMeta({});
      return;
    }
    const { data: itens } = await supabase
      .from("meta_itens")
      .select("*")
      .in("meta_id", listaMetas.map((m) => m.id))
      .order("ordem", { ascending: true });
    const agrupado = {};
    for (const item of itens ?? []) {
      (agrupado[item.meta_id] ??= []).push(item);
    }
    setItensPorMeta(agrupado);
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
      tipo: tipoCriacao,
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

  function alternarExpandir(metaId) {
    setExpandidas((prev) => {
      const novo = new Set(prev);
      if (novo.has(metaId)) novo.delete(metaId);
      else novo.add(metaId);
      return novo;
    });
  }

  async function sincronizarConclusao(meta, itensAtualizados) {
    if (itensAtualizados.length === 0) return;
    const concluidaAntes = meta.concluida;
    const concluidaAgora = itensAtualizados.every((i) => i.concluido);

    if (concluidaAgora !== concluidaAntes) {
      await supabase.from("metas").update({ concluida: concluidaAgora }).eq("id", meta.id);
    }
    if (!concluidaAntes && concluidaAgora && meta.responsavel_id === perfil.id) {
      await supabase.rpc("dar_xp", { usuario_id: perfil.id, quantidade: 20 });
      recarregarPerfil();
    }
  }

  async function adicionarItem(meta, texto) {
    if (!texto.trim()) return;
    const itensAtuais = itensPorMeta[meta.id] ?? [];
    const { data: novoItem } = await supabase
      .from("meta_itens")
      .insert({ meta_id: meta.id, texto: texto.trim(), ordem: itensAtuais.length })
      .select()
      .single();
    setNovoItemTexto((prev) => ({ ...prev, [meta.id]: "" }));
    if (novoItem) {
      await sincronizarConclusao(meta, [...itensAtuais, novoItem]);
    }
    carregar();
  }

  async function alternarItem(meta, item) {
    const concluido = !item.concluido;
    await supabase.from("meta_itens").update({ concluido }).eq("id", item.id);
    const itensAtualizados = (itensPorMeta[meta.id] ?? []).map((i) =>
      i.id === item.id ? { ...i, concluido } : i
    );
    await sincronizarConclusao(meta, itensAtualizados);
    carregar();
  }

  const tipoCriacao = tipo === "todas" ? "diaria" : tipo;
  const filtradas = tipo === "todas" ? metas : metas.filter((m) => m.tipo === tipo);

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
        {ABAS.map((t) => (
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
            {tipo === "todas"
              ? "Nenhuma meta ainda."
              : `Nenhuma meta ${TIPOS.find((t) => t.v === tipo)?.label.toLowerCase()} ainda.`}
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {filtradas.map((meta) => {
          const itens = itensPorMeta[meta.id] ?? [];
          const temChecklist = itens.length > 0;
          const concluidosChecklist = itens.filter((i) => i.concluido).length;
          const pct = temChecklist
            ? Math.round((concluidosChecklist / itens.length) * 100)
            : Math.min(100, Math.round((meta.valor_atual / meta.valor_alvo) * 100));
          const concluidaEfetiva = temChecklist ? concluidosChecklist === itens.length : meta.concluida;
          const souDono = meta.responsavel_id === perfil?.id;
          const expandida = expandidas.has(meta.id);

          return (
            <div
              key={meta.id}
              className="rounded-xl p-5 border flex flex-col gap-3"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div
                className="flex items-start justify-between gap-2 cursor-pointer"
                onClick={() => alternarExpandir(meta.id)}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs mt-1 leading-none" style={{ color: "var(--text-muted)" }}>
                    {expandida ? "▾" : "▸"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{meta.titulo}</h3>
                      {tipo === "todas" && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                          style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                        >
                          {TIPO_SINGULAR[meta.tipo]}
                        </span>
                      )}
                    </div>
                    {meta.responsavel && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Criada por {meta.responsavel.avatar_emoji} {meta.responsavel.nome}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    excluir(meta.id);
                  }}
                  className="text-xs shrink-0"
                  style={{ color: "var(--text-muted)" }}
                >
                  excluir
                </button>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: "var(--text-muted)" }}>
                    {temChecklist
                      ? `${concluidosChecklist} / ${itens.length} itens`
                      : `${meta.valor_atual} / ${meta.valor_alvo} ${meta.unidade}`}
                  </span>
                  <span style={{ color: concluidaEfetiva ? "var(--success)" : "var(--text-muted)" }}>
                    {pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: concluidaEfetiva ? "var(--success)" : "var(--sync)",
                    }}
                  />
                </div>
              </div>

              {!temChecklist && souDono && !meta.concluida && (
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
              {concluidaEfetiva && (
                <p className="text-xs font-medium" style={{ color: "var(--success)" }}>
                  ✓ Concluída
                </p>
              )}

              {expandida && (
                <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  {itens.length === 0 && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Nenhum item na checklist ainda.
                    </p>
                  )}
                  {itens.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 text-xs"
                      style={{ cursor: souDono ? "pointer" : "default" }}
                    >
                      <input
                        type="checkbox"
                        checked={item.concluido}
                        disabled={!souDono}
                        onChange={() => alternarItem(meta, item)}
                      />
                      <span
                        style={{
                          color: item.concluido ? "var(--text-muted)" : "var(--text)",
                          textDecoration: item.concluido ? "line-through" : "none",
                        }}
                      >
                        {item.texto}
                      </span>
                    </label>
                  ))}

                  {souDono && (
                    <form
                      onClick={(e) => e.stopPropagation()}
                      onSubmit={(e) => {
                        e.preventDefault();
                        adicionarItem(meta, novoItemTexto[meta.id] ?? "");
                      }}
                      className="flex gap-2 mt-1"
                    >
                      <input
                        value={novoItemTexto[meta.id] ?? ""}
                        onChange={(e) =>
                          setNovoItemTexto((prev) => ({ ...prev, [meta.id]: e.target.value }))
                        }
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
                  )}
                </div>
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
              Nova meta {TIPOS.find((t) => t.v === tipoCriacao)?.label.toLowerCase()}
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
