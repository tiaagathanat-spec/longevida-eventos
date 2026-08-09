"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Timer,
  Settings,
  LogOut,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  useFuncionarios,
  PAPEL_ORGANIZACAO_LABEL,
  MODULOS_ORGANIZACAO,
  ModuloOrganizacao,
} from "@/lib/mock/funcionarios-store";
import { TrocadorDePerfil } from "@/components/layouts/trocador-de-perfil";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; permissao?: ModuloOrganizacao }[] = [
  { href: "/organizacao/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organizacao/eventos", label: "Eventos", icon: CalendarDays, permissao: "eventos" },
  { href: "/organizacao/cronometragem", label: "Cronometragem", icon: Timer, permissao: "cronometragem" },
  { href: "/organizacao/configuracoes", label: "Configurações", icon: Settings, permissao: "configuracoes" },
];

// Provas e Resultados são acessados de dentro de cada evento
// (ex: /eventos/[id]/provas), por isso não têm item próprio aqui.

export function OrganizacaoSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { funcionarioAtivo } = useFuncionarios();

  // Sem funcionário ativo (ex: acesso direto), libera tudo.
  const permissoes: ModuloOrganizacao[] =
    funcionarioAtivo?.permissoes ?? MODULOS_ORGANIZACAO.map((m) => m.chave);

  const navPermitido = NAV.filter(
    (item) => !item.permissao || permissoes.includes(item.permissao)
  );
  const temFinanceiro = permissoes.includes("financeiro");

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-gradient-to-b from-white to-lime-50/60 px-4 py-6 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900 lg:flex">
      <div className="mb-8 px-2">
        <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
          Longevida
        </span>
        <span className="ml-1.5 rounded-full bg-brand-green/10 px-2 py-0.5 text-[11px] font-medium text-brand-green">
          Organização
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navPermitido.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/organizacao/dashboard" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-gradient-to-r from-brand-green to-lime-500 text-white shadow-md shadow-brand-green/20"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mb-4 flex flex-col gap-1">
        {funcionarioAtivo && (
          <div className="flex items-start gap-2 rounded-xl bg-brand-green/10 px-3 py-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Operando como {funcionarioAtivo.nome}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {PAPEL_ORGANIZACAO_LABEL[funcionarioAtivo.papel]}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <TrocadorDePerfil />
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          Sair
        </button>
      </div>

      {!temFinanceiro && (
        <p className="mt-3 flex items-center gap-1.5 px-3 text-xs text-slate-400 dark:text-slate-500">
          <Lock className="h-3 w-3" />
          Funções sem acesso liberado não aparecem.
        </p>
      )}
    </aside>
  );
}
