"use client";

// Navegação mobile para Admin e Organização.
//
// Em telas grandes (lg+) as áreas usam a sidebar lateral; no celular a
// sidebar fica oculta (hidden lg:flex). Este componente fornece uma barra
// superior fixa com botão de menu que abre um painel deslizante (drawer)
// com as mesmas opções da sidebar, para o usuário nunca ficar preso numa
// página acessada por link direto.

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, type LucideIcon } from "lucide-react";

export type ItemMenuMobile = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type MenuMobileProps = {
  rotulo: string; // "Admin" | "Organização"
  rotuloClasse: string; // cor do selo do rótulo (ex.: "bg-brand-blue/10 text-brand-blue")
  ativoClasse: string; // gradiente do item ativo (ex.: "from-brand-blue to-sky-500 shadow-brand-blue/20")
  itens: ItemMenuMobile[];
  rodape?: React.ReactNode; // conteúdo extra no fim do drawer (ex.: trocador de perfil)
  onLogout: () => void;
};

export function MenuMobile({
  rotulo,
  rotuloClasse,
  ativoClasse,
  itens,
  rodape,
  onLogout,
}: MenuMobileProps) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {/* Barra superior mobile */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 lg:hidden print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
            Longevida
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${rotuloClasse}`}>
            {rotulo}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Drawer */}
      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setAberto(false)}
            className="absolute inset-0 bg-slate-900/50"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-y-auto bg-white px-4 py-6 shadow-2xl dark:bg-slate-950">
            <div className="mb-6 flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                  Longevida
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${rotuloClasse}`}>
                  {rotulo}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1">
              {itens.map(({ href, label, icon: Icon }) => {
                const ativo =
                  pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setAberto(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      ativo
                        ? `bg-gradient-to-r text-white shadow-md ${ativoClasse}`
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              {rodape}
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              >
                <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
