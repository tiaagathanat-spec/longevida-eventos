"use client";

// Cabeçalho superior das áreas Admin e Organização (desktop).
//
// Concentra no canto superior direito o avatar do usuário atual (iniciais),
// o seletor de perfis e o logout. No mobile essa função é do MenuMobile
// (barra superior + drawer), então aqui o cabeçalho só aparece a partir de lg.

import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  useFuncionarios,
  PAPEL_ORGANIZACAO_LABEL,
} from "@/lib/mock/funcionarios-store";
import { useSessao } from "@/lib/mock/sessao";
import { TrocadorDePerfil } from "@/components/layouts/trocador-de-perfil";

type CabecalhoUsuarioProps = {
  tomClasse?: string; // cor do avatar (ex.: "bg-brand-blue/10 text-brand-blue")
};

function iniciaisDe(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

export function CabecalhoUsuario({
  tomClasse = "bg-brand-blue/10 text-brand-blue",
}: CabecalhoUsuarioProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { funcionarioAtivo } = useFuncionarios();
  const { sessao } = useSessao();

  const emAdmin = pathname.startsWith("/admin");
  const emOrganizacao = pathname.startsWith("/organizacao");

  const nome = emAdmin
    ? "Administrador"
    : emOrganizacao && funcionarioAtivo
      ? funcionarioAtivo.nome
      : sessao.nome;

  const papel = emAdmin
    ? "Plataforma"
    : emOrganizacao && funcionarioAtivo
      ? PAPEL_ORGANIZACAO_LABEL[funcionarioAtivo.papel]
      : "Atleta / Responsável";

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 hidden h-16 shrink-0 items-center justify-end gap-2 border-b border-slate-200 bg-white/80 px-6 backdrop-blur lg:flex print:hidden dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${tomClasse}`}
        >
          {iniciaisDe(nome)}
        </span>
        <div className="hidden min-w-0 leading-tight md:block">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{nome}</p>
          <p className="truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {papel}
          </p>
        </div>
      </div>

      <div className="mx-1 hidden h-6 w-px bg-slate-200 md:block dark:bg-slate-700" />

      <TrocadorDePerfil variante="navbar" />

      <button
        type="button"
        onClick={handleLogout}
        aria-label="Sair"
        title="Sair"
        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-400"
      >
        <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
    </header>
  );
}
