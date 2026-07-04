"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function LoginPage() {
  const { supabase, session } = useAuth();
  const router = useRouter();

  const [modo, setModo] = useState("entrar"); // entrar | criar
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) setErro(traduzirErro(error.message));
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome } },
      });
      if (error) setErro(traduzirErro(error.message));
      else setErro("Conta criada! Verifique seu e-mail para confirmar o acesso.");
    }
    setCarregando(false);
  }

  function traduzirErro(msg) {
    if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
    if (msg.includes("already registered")) return "Esse e-mail já tem uma conta.";
    if (msg.includes("Password should be")) return "A senha precisa ter pelo menos 6 caracteres.";
    return msg;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <div className="pulse-dot w-2.5 h-2.5 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="font-display text-xl font-semibold tracking-tight">Project Sync</span>
        </div>

        <div
          className="rounded-2xl p-7 border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: "var(--surface-2)" }}>
            {["entrar", "criar"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setModo(m);
                  setErro("");
                }}
                className="flex-1 py-2 rounded-md text-sm font-medium transition"
                style={{
                  background: modo === m ? "var(--accent)" : "transparent",
                  color: modo === m ? "#0f1420" : "var(--text-muted)",
                }}
              >
                {m === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <form onSubmit={enviar} className="flex flex-col gap-4">
            {modo === "criar" && (
              <div>
                <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  Seu nome
                </label>
                <input
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Rafa"
                  className="w-full mt-1 px-3 py-2.5 rounded-lg text-sm outline-none border"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                E-mail
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="w-full mt-1 px-3 py-2.5 rounded-lg text-sm outline-none border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Senha
              </label>
              <input
                required
                type="password"
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full mt-1 px-3 py-2.5 rounded-lg text-sm outline-none border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
              />
            </div>

            {erro && (
              <p className="text-xs" style={{ color: erro.includes("criada") ? "var(--success)" : "var(--danger)" }}>
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="mt-1 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#0f1420" }}
            >
              {carregando ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
          Só você e seu grupo têm acesso a esses dados.
        </p>
      </div>
    </div>
  );
}
