import { AdminSidebar } from "@/components/layouts/admin-sidebar";
import { CabecalhoUsuario } from "@/components/layouts/cabecalho-usuario";

// Layout do grupo "Área do Administrador".
// Checagem de permissão (perfil = administrador) será feita via
// middleware/auth quando a autenticação estiver conectada às rotas.
//
// Os dados dos módulos (Eventos, Categorias, Provas etc.) vêm do
// AppProviders montado no layout raiz (app/layout.tsx), compartilhados
// entre Admin, Organização e Atleta.

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 print:bg-white dark:bg-slate-900">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <CabecalhoUsuario tomClasse="bg-brand-blue/10 text-brand-blue" />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
