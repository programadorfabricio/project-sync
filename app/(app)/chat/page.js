"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useNaoLidas } from "@/lib/NaoLidasContext";

export default function ChatPage() {
  const { supabase, perfil } = useAuth();
  const { marcarComoLido } = useNaoLidas();
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const fimDaListaRef = useRef(null);

  async function carregarHistorico() {
    const { data } = await supabase
      .from("mensagens")
      .select("*, remetente:remetente_id(nome, avatar_emoji)")
      .order("created_at", { ascending: true })
      .limit(200);
    setMensagens(data ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregarHistorico();
    marcarComoLido();

    const canal = supabase
      .channel("mensagens-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens" },
        async (payload) => {
          // Busca o remetente junto, já que o payload bruto não traz o join
          const { data: remetente } = await supabase
            .from("perfis")
            .select("nome, avatar_emoji")
            .eq("id", payload.new.remetente_id)
            .single();

          setMensagens((prev) => [...prev, { ...payload.new, remetente }]);
          marcarComoLido();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function enviarMensagem(e) {
    e.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo) return;

    setTexto("");
    await supabase.from("mensagens").insert({
      remetente_id: perfil.id,
      texto: conteudo,
    });
    // Não precisa recarregar manualmente -- o Realtime vai trazer a
    // própria mensagem de volta via o INSERT acima
  }

  function formatarHora(iso) {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-semibold">Chat</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Conversa direta entre vocês, sem sair do sistema.
        </p>
      </div>

      <div
        className="flex-1 overflow-y-auto rounded-xl border p-4 flex flex-col gap-3 mb-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {carregando && (
          <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Carregando conversa...
          </p>
        )}

        {!carregando && mensagens.length === 0 && (
          <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Nenhuma mensagem ainda. Manda o primeiro "oi".
          </p>
        )}

        {mensagens.map((msg) => {
          const souEu = msg.remetente_id === perfil?.id;
          return (
            <div
              key={msg.id}
              className="flex flex-col max-w-[75%]"
              style={{ alignSelf: souEu ? "flex-end" : "flex-start" }}
            >
              {!souEu && (
                <span className="text-xs mb-1 px-1" style={{ color: "var(--text-muted)" }}>
                  {msg.remetente?.avatar_emoji} {msg.remetente?.nome}
                </span>
              )}
              <div
                className="rounded-2xl px-4 py-2.5 text-sm"
                style={{
                  background: souEu ? "var(--accent)" : "var(--surface-2)",
                  color: souEu ? "#0f1420" : "var(--text)",
                }}
              >
                {msg.texto}
              </div>
              <span
                className="text-[10px] mt-1 px-1"
                style={{ color: "var(--text-muted)", alignSelf: souEu ? "flex-end" : "flex-start" }}
              >
                {formatarHora(msg.created_at)}
              </span>
            </div>
          );
        })}
        <div ref={fimDaListaRef} />
      </div>

      <form onSubmit={enviarMensagem} className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma mensagem..."
          className="flex-1 px-4 py-3 rounded-lg text-sm outline-none border"
          style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
        />
        <button
          type="submit"
          className="px-5 py-3 rounded-lg text-sm font-semibold"
          style={{ background: "var(--accent)", color: "#0f1420" }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}