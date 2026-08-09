import { AtletaNavbar } from "@/components/layouts/atleta-navbar";

// Layout do grupo "Área do Atleta/Responsável".
// Checagem de permissão (perfil = atleta) será feita via
// middleware/auth quando a autenticação estiver conectada às rotas.

export default function AtletaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <AtletaNavbar />
      {children}
    </div>
  );
}
