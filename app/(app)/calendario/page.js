"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatarISO(date) {
  return date.toISOString().slice(0, 10);
}

function inicioFimMes(ano, mes) {
  const inicio = new Date(ano, mes, 1);
  const fim = new Date(ano, mes + 1, 0);
  return { inicio: formatarISO(inicio), fim: formatarISO(fim) };
}

export default function CalendarioPage() {
  const { supabase, perfil } = useAuth();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [itensPorDia, setItensPorDia] = useState({});
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ titulo: "", hora: "", cor: "#4a9eff" });

  async function carregar() {
    const { inicio, fim } = inicioFimMes(ano, mes);

    const [tarefasRes, metasRes, projetosRes, eventosRes] = await Promise.all([
      supabase
        .from("tarefas")
        .select("id, titulo, prazo, status")
        .gte("prazo", inicio)
        .lte("prazo", fim),
      supabase
        .from("metas")
        .select("id, titulo, data_referencia, concluida")
        .gte("data_referencia", inicio)
        .lte("data_referencia", fim),
      supabase
        .from("projetos")
        .select("id, nome, prazo, status")
        .gte("prazo", inicio)
        .lte("prazo", fim),
      supabase
        .from("eventos")
        .select("*")
        .gte("data", inicio)
        .lte("data", fim),
    ]);

    const agrupado = {};

    for (const t of tarefasRes.data ?? []) {
      (agrupado[t.prazo] ??= []).push({
        tipo: "tarefa",
        id: t.id,
        titulo: t.titulo,
        concluido: t.status === "concluido",
        cor: "var(--sync)",
      });
    }
    for (const m of metasRes.data ?? []) {
      (agrupado[m.data_referencia] ??= []).push({
        tipo: "meta",
        id: m.id,
        titulo: m.titulo,
        concluido: m.concluida,
        cor: "var(--accent)",
      });
    }
    for (const p of projetosRes.data ?? []) {
      (agrupado[p.prazo] ??= []).push({
        tipo: "projeto",
        id: p.id,
        titulo: p.nome,
        concluido: p.status === "concluido",
        cor: p.cor,
      });
    }
    for (const e of eventosRes.data ?? []) {
      (agrupado[e.data] ??= []).push({
        tipo: "evento",
        id: e.id,
        titulo: e.titulo,
        hora: e.hora,
        cor: e.cor,
      });
    }

    setItensPorDia(agrupado);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, ano, mes]);

  async function criarEvento(e) {
    e.preventDefault();
    if (!form.titulo.trim() || !diaSelecionado) return;
    await supabase.from("eventos").insert({
      titulo: form.titulo,
      hora: form.hora || null,
      cor: form.cor,
      data: diaSelecionado,
      criado_por: perfil.id,
    });
    setForm({ titulo: "", hora: "", cor: "#4a9eff" });
    setModalAberto(false);
    carregar();
  }

  async function excluirEvento(id) {
    await supabase.from("eventos").delete().eq("id", id);
    carregar();
  }

  function mesAnterior() {
    if (mes === 0) {
      setMes(11);
      setAno((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  }

  function mesSeguinte() {
    if (mes === 11) {
      setMes(0);
      setAno((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  }

  const celulas = useMemo(() => {
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const lista = [];

    for (let i = 0; i < primeiroDiaSemana; i++) {
      lista.push(null);
    }
    for (let dia = 1; dia <= totalDias; dia++) {
      lista.push(formatarISO(new Date(ano, mes, dia)));
    }
    return lista;
  }, [ano, mes]);

  const hojeISO = formatarISO(hoje);
  const itensDoSelecionado = diaSelecionado ? itensPorDia[diaSelecionado] ?? [] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Calendário</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Tarefas, metas, projetos e eventos, tudo num só lugar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={mesAnterior}
            className="w-9 h-9 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            ‹
          </button>
          <span className="text-sm font-semibold w-36 text-center">
            {MESES[mes]} {ano}
          </span>
          <button
            onClick={mesSeguinte}
            className="w-9 h-9 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-xs font-semibold text-center py-1" style={{ color: "var(--text-muted)" }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {celulas.map((iso, idx) => {
          if (!iso) return <div key={`vazio-${idx}`} />;

          const itens = itensPorDia[iso] ?? [];
          const dia = Number(iso.slice(-2));
          const ehHoje = iso === hojeISO;

          return (
            <button
              key={iso}
              onClick={() => setDiaSelecionado(iso)}
              className="rounded-lg border p-2 text-left flex flex-col gap-1 min-h-[84px] transition"
              style={{
                background: diaSelecionado === iso ? "var(--accent-soft)" : "var(--surface)",
                borderColor: ehHoje ? "var(--accent)" : "var(--border)",
              }}
            >
              <span
                className="text-xs font-semibold"
                style={{ color: ehHoje ? "var(--accent)" : "var(--text-muted)" }}
              >
                {dia}
              </span>
              <div className="flex flex-col gap-0.5">
                {itens.slice(0, 3).map((item) => (
                  <span
                    key={`${item.tipo}-${item.id}`}
                    className="text-[10px] px-1 py-0.5 rounded truncate"
                    style={{
                      background: item.cor,
                      color: "#0f1420",
                      opacity: item.concluido ? 0.5 : 1,
                      textDecoration: item.concluido ? "line-through" : "none",
                    }}
                  >
                    {item.titulo}
                  </span>
                ))}
                {itens.length > 3 && (
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    +{itens.length - 3} mais
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {diaSelecionado && (
        <div
          className="fixed inset-0 flex items-center justify-center p-6 z-50"
          style={{ background: "#00000090" }}
          onClick={() => setDiaSelecionado(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl p-6 border flex flex-col gap-4"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">
                {new Date(diaSelecionado + "T00:00:00").toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                })}
              </h2>
              <button
                onClick={() => setModalAberto(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "var(--accent)", color: "#0f1420" }}
              >
                + Evento
              </button>
            </div>

            {itensDoSelecionado.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Nada marcado nesse dia.
              </p>
            )}

            <div className="flex flex-col gap-2">
              {itensDoSelecionado.map((item) => (
                <div
                  key={`${item.tipo}-${item.id}`}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg border"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: item.cor }}
                    />
                    <div className="min-w-0">
                      <p
                        className="text-sm truncate"
                        style={{
                          textDecoration: item.concluido ? "line-through" : "none",
                          color: item.concluido ? "var(--text-muted)" : "var(--text)",
                        }}
                      >
                        {item.titulo}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                        {item.tipo}{item.hora ? ` · ${item.hora.slice(0, 5)}` : ""}
                      </p>
                    </div>
                  </div>
                  {item.tipo === "evento" && (
                    <button
                      onClick={() => excluirEvento(item.id)}
                      className="text-xs shrink-0"
                      style={{ color: "var(--danger)" }}
                    >
                      excluir
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setDiaSelecionado(null)}
              className="text-xs font-medium mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {modalAberto && diaSelecionado && (
        <div
          className="fixed inset-0 flex items-center justify-center p-6 z-[60]"
          style={{ background: "#00000090" }}
          onClick={() => setModalAberto(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={criarEvento}
            className="w-full max-w-md rounded-2xl p-6 border flex flex-col gap-4"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <h2 className="font-display text-lg font-semibold">Novo evento</h2>
            <input
              required
              autoFocus
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex: Reunião com cliente"
              className="px-3 py-2.5 rounded-lg text-sm outline-none border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="time"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
                className="px-3 py-2.5 rounded-lg text-sm outline-none border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
              />
              <input
                type="color"
                value={form.cor}
                onChange={(e) => setForm({ ...form, cor: e.target.value })}
                className="w-full h-full rounded-lg border cursor-pointer"
                style={{ borderColor: "var(--border)" }}
              />
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