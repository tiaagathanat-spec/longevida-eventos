"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Tag,
  Waves,
  ListChecks,
  Users,
  ClipboardList,
  Wallet,
  Trophy,
  Globe,
  Settings,
  Handshake,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MenuMobile } from "@/components/layouts/menu-mobile";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/admin/categorias", label: "Categorias", icon: Tag },
  { href: "/admin/modalidades", label: "Modalidades", icon: Waves },
  { href: "/admin/tipos-prova", label: "Tipos de Prova", icon: ListChecks },
  { href: "/admin/atletas", label: "Atletas", icon: Users },
  { href: "/admin/inscricoes", label: "Inscrições", icon: ClipboardList },
  { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/admin/patrocinadores", label: "Patrocinadores", icon: Handshake },
  { href: "/admin/resultados", label: "Resultados", icon: Trophy },
  { href: "/admin/publicacao-resultados", label: "Publicação de Resultados", icon: Globe },
  { href: "/admin/configuracoes/usuarios", label: "Funcionários", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <MenuMobile
        rotulo="Admin"
        rotuloClasse="bg-brand-blue/10 text-brand-blue"
        ativoClasse="from-brand-blue to-sky-500 shadow-brand-blue/20"
        itens={NAV}
        onLogout={handleLogout}
      />

      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-gradient-to-b from-white to-sky-50/60 px-4 py-6 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900 lg:flex">
        <div className="mb-8 px-2">
          <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            Longevida
          </span>
          <span className="ml-1.5 rounded-full bg-brand-blue/10 px-2 py-0.5 text-[11px] font-medium text-brand-blue">
            Admin
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/admin/dashboard" && pathname.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-to-r from-brand-blue to-sky-500 text-white shadow-md shadow-brand-blue/20"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
