# Project Sync

Ideias, metas e tarefas — sincronizados entre você e seu grupo.

## O que tem nessa primeira versão

- **Login/cadastro** (Supabase Auth)
- **Dashboard** com saudação, contadores do dia e ranking de XP
- **Ideias** — CRUD com categoria, importância e status
- **Metas** — diárias/semanais/mensais/anuais com barra de progresso
- **Tarefas** — Kanban (A Fazer / Em andamento / Em revisão / Concluído), arrastável
- **XP automático**: +5 ao criar ideia, +20 ao concluir meta, +30 ao concluir tarefa

Todo mundo que criar conta enxerga os dados de todo mundo (é feito pra você e seu amigo usarem juntos, sem separação por empresa ainda — isso é o próximo passo quando for pro FH Manager).

## Passo 1 — Criar o projeto no Supabase

1. Vá em supabase.com → **New project** (pode usar o plano free).
2. Espere o banco provisionar (~2 min).
3. No painel do projeto, vá em **SQL Editor** → **New query**.
4. Cole todo o conteúdo do arquivo `supabase_schema.sql` (está na raiz desse projeto) e clique em **Run**.
5. Vá em **Project Settings → API**. Copie:
   - `Project URL`
   - `anon public key`

## Passo 2 — Configurar as variáveis de ambiente

Na raiz do projeto, crie um arquivo `.env.local` (copie de `.env.local.example`) com:

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

## Passo 3 — Rodar local pra testar

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000`. Crie sua conta e a do seu amigo.

> **Dica:** por padrão o Supabase pede confirmação por e-mail antes de liberar o login. Se quiser pular isso enquanto testam (mais rápido), vá em **Authentication → Providers → Email** no painel do Supabase e desative "Confirm email".

## Passo 4 — Subir pro GitHub

```bash
git init
git add .
git commit -m "primeira versao do Project Sync"
gh repo create project-sync --private --source=. --push
```

(ou crie o repo manualmente no GitHub e faça `git remote add origin ...` + `git push`)

## Passo 5 — Deploy na Vercel

1. Vá em vercel.com/new e importe o repositório.
2. Em **Environment Variables**, adicione as mesmas duas variáveis do `.env.local`.
3. Deploy. Pronto — você e seu amigo acessam pela URL da Vercel, em qualquer lugar.

## Próximos passos (se validar com vocês dois)

- Separar por `empresa_id` (grupo), como já é feito no FH Manager
- Desafios entre membros (competição por período)
- Chat
- Migrar pro backend Java do FH Manager como um módulo novo
