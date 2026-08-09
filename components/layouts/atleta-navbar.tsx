"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, ClipboardList, Trophy, User, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePerfis } from "@/lib/mock/perfis-store";
import { useSessao } from "@/lib/mock/sessao";
import { LogoLongevida } from "@/components/brand/logo-longevida";
import { TrocadorDePerfil } from "@/components/layouts/trocador-de-perfil";

const NAV = [
  { href: "/portal/dashboard", label: "Início" },
  { href: "/portal/eventos", label: "Eventos" },
  { href: "/portal/meus-atletas", label: "Meus atletas", icon: Users },
  { href: "/portal/minhas-inscricoes", label: "Minhas inscrições", icon: ClipboardList },
  { href: "/portal/meus-resultados", label: "Meus resultados", icon: Trophy },
  { href: "/portal/perfil", label: "Meu perfil", icon: User },
];

export function AtletaNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sessao } = useSessao();
  const { obterPorEmail } = usePerfis();

  const fotoPerfil = obterPorEmail(sessao.email)?.foto;

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/portal/dashboard" className="flex items-center gap-2">
          <LogoLongevida className="h-9 w-auto" />
          <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            Longevida
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label }) => {
            const active =
              pathname === href ||
              (href !== "/portal/dashboard" && pathname.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-to-r from-brand-blue to-sky-500 text-white shadow-md shadow-brand-blue/20"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <TrocadorDePerfil variante="navbar" />
          <button
            onClick={handleLogout}
            aria-label="Sair"
            title="Sair"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
          <Link
            href="/portal/perfil"
            title="Meu perfil"
            aria-label="Meu perfil"
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-green/10 text-brand-green transition-colors hover:bg-brand-green/20"
          >
            {fotoPerfil ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fotoPerfil}
                alt={sessao.nome}
                title={sessao.nome}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-[18px] w-[18px]" strokeWidth={2} />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
