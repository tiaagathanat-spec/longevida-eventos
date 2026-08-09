// Tipos compartilhados de perfis/usuários do sistema.
// Espelham os enums da migration de produção
// (supabase/migrations/0002_schema_producao.sql) e as camadas de
// autenticação (lib/auth.ts, lib/mock/sessao.ts).

export type TipoContaUsuario = "staff" | "responsavel" | "atleta";

export type PapelOrganizacao =
  | "administrador"
  | "organizador"
  | "cronometragem"
  | "financeiro"
  | "leitura";

export type PerfilUsuario = "administrador" | "organizacao" | "atleta";

export type OrganizacaoDoUsuario = {
  organizacaoId: string;
  papel: PapelOrganizacao;
};

export type UsuarioAtual = {
  id: string;
  email: string | null;
};

export type InscricaoStatus = "pendente" | "confirmada" | "cancelada";

export type EventoStatus =
  | "rascunho"
  | "em_espera"
  | "inscricoes_abertas"
  | "inscricoes_encerradas"
  | "encerrado";

export type ResultadoStatus = "finalizado" | "dnf" | "dns" | "dsq";

export type PagamentoStatus = "pago" | "pendente" | "cancelado";

export type FormaPagamento = "pix" | "dinheiro" | "cartao" | "cortesia";
