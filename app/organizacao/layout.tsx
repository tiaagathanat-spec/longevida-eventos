import { OrganizacaoSidebar } from "@/components/layouts/organizacao-sidebar";
import { CabecalhoUsuario } from "@/components/layouts/cabecalho-usuario";

// Layout do grupo "Área da Organização/Cronometragem".
// Checagem de permissão (perfil = organizacao) será feita via
// middleware/auth quando a autenticação estiver conectada às rotas.

export default function OrganizacaoLayout({ children }: { children: React.ReactNode }) {
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
