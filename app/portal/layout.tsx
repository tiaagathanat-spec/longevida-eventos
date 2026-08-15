import { AtletaNavbar } from "@/components/layouts/atleta-navbar";

// Layout do grupo "Área do Atleta/Responsável".
// Checagem de permissão (perfil = atleta) será feita via
// middleware/auth quando a autenticação estiver conectada às rotas.

export default function AtletaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-brand-blue/10 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <AtletaNavbar />
      <div className="h-1 bg-gradient-to-r from-brand-blue via-brand-green to-brand-blue-dark" />
      {children}
    </div>
  );
}
