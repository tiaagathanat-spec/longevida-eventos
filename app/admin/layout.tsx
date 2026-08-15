import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layouts/admin-sidebar";
import { CabecalhoUsuario } from "@/components/layouts/cabecalho-usuario";
import { getUsuarioAtual, getOrganizacoesDoUsuario, temPapelEm } from "@/lib/auth";

// Layout do grupo "Área do Administrador".
//
// Checagem de autenticação e papel feita no SERVIDOR, antes de qualquer
// HTML da tela chegar ao navegador: apenas usuários com papel
// "administrador" em pelo menos uma organização acessam /admin. Quem não
// estiver autenticado é levado ao login; quem está logado sem o papel de
// administrador vê um aviso de acesso restrito (mesmo padrão da página de
// Cronometragem).
//
// Os dados dos módulos (Eventos, Categorias, Provas etc.) vêm do
// AppProviders montado no layout raiz (app/layout.tsx), compartilhados
// entre Admin, Organização e Atleta.

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioAtual();

  if (!usuario) {
    redirect("/login");
  }

  const organizacoes = await getOrganizacoesDoUsuario(usuario.id);
  const autorizado = temPapelEm(organizacoes, ["administrador"]);

  if (!autorizado) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Acesso restrito
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Você não tem permissão de administrador para acessar esta área. Fale
          com o administrador da plataforma se acredita que isso é um engano.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-brand-blue/10 print:bg-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-1 shrink-0 bg-gradient-to-r from-brand-blue via-brand-green to-brand-blue-dark" />
        <CabecalhoUsuario tomClasse="bg-brand-blue/10 text-brand-blue" />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
