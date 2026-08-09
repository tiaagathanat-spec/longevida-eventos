import { AdminSidebar } from "@/components/layouts/admin-sidebar";

// Layout do grupo "Área do Administrador".
// Checagem de permissão (perfil = administrador) será feita via
// middleware/auth quando a autenticação estiver conectada às rotas.
//
// Os dados dos módulos (Eventos, Categorias, Provas etc.) vêm do
// AppProviders montado no layout raiz (app/layout.tsx), compartilhados
// entre Admin, Organização e Atleta.

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
