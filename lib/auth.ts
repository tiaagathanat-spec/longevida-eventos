// Camada central de autenticação/autorização — SERVER-ONLY.
// Nunca importar este arquivo a partir de um Client Component
// ("use client"): ele depende de lib/supabase/server.ts, que por sua
// vez depende de next/headers.
//
// Este é o único lugar do projeto que deve saber como ler o usuário
// logado e seus papéis por organização. Páginas e outros helpers de
// servidor devem consumir estas funções em vez de consultar
// `organizacao_usuarios` diretamente.
import { createClient } from "@/lib/supabase/server";

export type PapelOrganizacao =
  | "administrador"
  | "organizador"
  | "cronometragem"
  | "financeiro"
  | "leitura";

export type UsuarioAtual = {
  id: string;
  email: string | null;
};

export type OrganizacaoDoUsuario = {
  organizacaoId: string;
  papel: PapelOrganizacao;
};

/**
 * Usuário autenticado na requisição atual, ou null se não houver
 * sessão válida. Usa `auth.getUser()` (não `getSession()`) porque
 * revalida o token direto com o Supabase Auth em vez de apenas
 * decodificar o que está no cookie — mais seguro contra sessão
 * adulterada.
 */
export async function getUsuarioAtual(): Promise<UsuarioAtual | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * Todas as organizações às quais o usuário está vinculado, com o
 * papel dele em cada uma. Consulta real a `public.organizacao_usuarios`
 * — nenhum dado fictício.
 */
export async function getOrganizacoesDoUsuario(
  usuarioId: string
): Promise<OrganizacaoDoUsuario[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizacao_usuarios")
    .select("organizacao_id, papel")
    .eq("usuario_id", usuarioId);

  if (error || !data) return [];

  return data.map((linha) => ({
    organizacaoId: linha.organizacao_id as string,
    papel: linha.papel as PapelOrganizacao,
  }));
}

/**
 * O usuário tem, em pelo menos uma das organizações às quais pertence,
 * algum dos papéis informados?
 */
export function temPapelEm(
  organizacoes: OrganizacaoDoUsuario[],
  papeisPermitidos: PapelOrganizacao[]
): boolean {
  return organizacoes.some((o) => papeisPermitidos.includes(o.papel));
}
