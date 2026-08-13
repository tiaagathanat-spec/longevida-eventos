import { redirect } from "next/navigation";
import { OrganizacaoSidebar } from "@/components/layouts/organizacao-sidebar";
import { CabecalhoUsuario } from "@/components/layouts/cabecalho-usuario";
import { getUsuarioAtual, getOrganizacoesDoUsuario, temPapelEm } from "@/lib/auth";

// Layout do grupo "Área da Organização/Cronometragem".
//
// Checagem de autenticação e vínculo feita no SERVIDOR antes de renderizar:
// apenas usuários vinculados a alguma organização (qualquer papel de
// equipe) acessam /organizacao. As permissões de módulos dentro da área
// continuam sendo controladas pelo papel (PERMISSOES_POR_PAPEL) na
// sidebar e nas telas.

const PAPEIS_EQUIPE = [
  "administrador",
  "organizador",
  "cronometragem",
  "financeiro",
  "leitura",
] as const;

export default async function OrganizacaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioAtual();

  if (!usuario) {
    redirect("/login");
  }

  const organizacoes = await getOrganizacoesDoUsuario(usuario.id);
  const autorizado = temPapelEm(organizacoes, [...PAPEIS_EQUIPE]);

  if (!autorizado) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Acesso restrito
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Você não está vinculado a nenhuma organização. Fale com o
          administrador da plataforma se acredita que isso é um engano.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <OrganizacaoSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <CabecalhoUsuario tomClasse="bg-brand-green/10 text-brand-green" />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
