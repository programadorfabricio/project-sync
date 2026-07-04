"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState(undefined); // undefined = ainda carregando
  const [perfil, setPerfil] = useState(null);
  const [todosPerfis, setTodosPerfis] = useState([]);

  const carregarPerfil = useCallback(
    async (userId) => {
      const { data } = await supabase.from("perfis").select("*").eq("id", userId).single();
      setPerfil(data ?? null);
    },
    [supabase]
  );

  const carregarTodosPerfis = useCallback(async () => {
    const { data } = await supabase.from("perfis").select("*").order("xp", { ascending: false });
    setTodosPerfis(data ?? []);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        carregarPerfil(session.user.id);
        carregarTodosPerfis();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        carregarPerfil(session.user.id);
        carregarTodosPerfis();
      } else {
        setPerfil(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, carregarPerfil, carregarTodosPerfis]);

  const sair = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        supabase,
        session,
        perfil,
        todosPerfis,
        recarregarPerfil: () => session?.user && carregarPerfil(session.user.id),
        recarregarRanking: carregarTodosPerfis,
        sair,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de um AuthProvider");
  return ctx;
}
