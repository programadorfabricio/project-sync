"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";

const NaoLidasContext = createContext({ naoLidas: 0, marcarComoLido: () => {} });

export function NaoLidasProvider({ children }) {
  const { supabase, perfil } = useAuth();
  const [naoLidas, setNaoLidas] = useState(0);

  // Marca tudo como lido: zera o badge e salva o momento no banco
  const marcarComoLido = useCallback(async () => {
    if (!perfil) return;
    setNaoLidas(0);
    await supabase.from("leituras_chat").upsert({
      usuario_id: perfil.id,
      lido_ate: new Date().toISOString(),
    });
  }, [supabase, perfil]);

  // Carga inicial: busca até quando o usuário leu e conta o que veio depois
  useEffect(() => {
    if (!perfil) return;

    async function carregarContagem() {
      const { data: leitura } = await supabase
        .from("leituras_chat")
        .select("lido_ate")
        .eq("usuario_id", perfil.id)
        .maybeSingle();

      let query = supabase
        .from("mensagens")
        .select("*", { count: "exact", head: true })
        .neq("remetente_id", perfil.id);

      if (leitura?.lido_ate) {
        query = query.gt("created_at", leitura.lido_ate);
      }

      const { count } = await query;
      setNaoLidas(count ?? 0);
    }

    carregarContagem();
  }, [supabase, perfil]);

  // Escuta global: mensagem nova chegando em QUALQUER tela
  useEffect(() => {
    if (!perfil) return;

    const canal = supabase
      .channel("mensagens-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens" },
        (payload) => {
          if (payload.new.remetente_id === perfil.id) return; // mensagem minha, ignora
          if (window.location.pathname.startsWith("/chat")) return; // chat aberto, não conta
          setNaoLidas((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, [supabase, perfil]);

  return (
    <NaoLidasContext.Provider value={{ naoLidas, marcarComoLido }}>
      {children}
    </NaoLidasContext.Provider>
  );
}

export function useNaoLidas() {
  return useContext(NaoLidasContext);
}