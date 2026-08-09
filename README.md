# Longevida Eventos

Sistema de gestão de eventos esportivos do Espaço Longevida.

## Stack
- Next.js (App Router) + React + TypeScript
- TailwindCSS
- Supabase (Auth, Storage, Postgres)
- Prisma ORM
- PWA instalável
- Deploy: Vercel

## Estrutura de pastas

```
app/
  (public)/      -> landing, lista de eventos, login, cadastro
  (admin)/       -> painel do Administrador
  (organizacao)/ -> painel da Organização/Cronometragem
  (atleta)/      -> área do Atleta/Responsável
  api/           -> rotas de API (webhooks, auth)
components/
  ui/            -> componentes base (Button, Card, Input, Badge)
  shared/        -> Navbar, Sidebar, Footer, Breadcrumbs
  layouts/       -> navegação específica por perfil
lib/
  supabase/      -> clientes Supabase (client, server, middleware)
  prisma.ts      -> instância do Prisma Client
  auth.ts        -> helpers de autenticação/autorização
prisma/
  schema.prisma  -> modelagem do banco (a implementar)
types/
  index.ts       -> tipos compartilhados
```

## Status

Estrutura inicial (scaffold) criada. Nenhuma funcionalidade implementada
ainda — aguardando aprovação da arquitetura antes do desenvolvimento.
