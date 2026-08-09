import { OrganizacaoSidebar } from "@/components/layouts/organizacao-sidebar";

// Layout do grupo "Área da Organização/Cronometragem".
// Checagem de permissão (perfil = organizacao) será feita via
// middleware/auth quando a autenticação estiver conectada às rotas.

export default function OrganizacaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <OrganizacaoSidebar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
