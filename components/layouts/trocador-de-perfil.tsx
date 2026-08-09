"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ChevronsUpDown,
  ShieldCheck,
  Building2,
  User,
  Check,
} from "lucide-react";
import {
  useFuncionarios,
  PAPEL_ORGANIZACAO_LABEL,
} from "@/lib/mock/funcionarios-store";
import { usePerfis } from "@/lib/mock/perfis-store";
import { useSessao } from "@/lib/mock/sessao";

// Trocador de perfil do modo demonstração. Disponível nas três áreas
// (Admin, Organização e Portal do Atleta) para alternar rapidamente
// entre as funções: administrador da plataforma, cada funcionário da
// organização e cada perfil de atleta/responsável.
//
// No backend real, cada pessoa tem UMA conta e a troca é feita pelo
// vínculo organização <-> papel. Aqui, como os dados são mock (em
// memória), alternar o perfil apenas troca a sessão/funcionário ativo
// exibidos nas telas para facilitar os testes.

type Variante = "sidebar" | "navbar";

export function TrocadorDePerfil({ variante = "sidebar" }: { variante?: Variante }) {
  const router = useRouter();
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { funcionarios, funcionarioAtivo, entrarComo } = useFuncionarios();
  const { perfis } = usePerfis();
  const { sessao, definirSessao } = useSessao();

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  const emAdmin = pathname.startsWith("/admin");
  const emOrganizacao = pathname.startsWith("/organizacao");
  const emPortal = pathname.startsWith("/portal");

  function irParaAdmin() {
    setAberto(false);
    router.push("/admin/dashboard");
  }

  function irParaFuncionario(id: string) {
    entrarComo(id);
    setAberto(false);
    router.push("/organizacao/dashboard");
  }

  function irParaAtleta(nome: string, email: string) {
    definirSessao({ nome, email });
    setAberto(false);
    router.push("/portal/dashboard");
  }

  const nomeAtual = emAdmin
    ? "Administrador"
    : emOrganizacao && funcionarioAtivo
    ? funcionarioAtivo.nome
    : emPortal
    ? sessao.nome
    : "Perfil";

  const subAtual = emAdmin
    ? "Plataforma"
    : emOrganizacao && funcionarioAtivo
    ? PAPEL_ORGANIZACAO_LABEL[funcionarioAtivo.papel]
    : emPortal
    ? "Atleta / Responsável"
    : "Demonstração";

  const painel = aberto && (
    <div
      className={`absolute z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-950 ${
        variante === "navbar"
          ? "right-0 top-full mt-2"
          : "bottom-full left-0 mb-2"
      }`}
    >
      <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
        <p className="text-xs font-semibold text-slate-900 dark:text-white">Trocar de perfil</p>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          Demonstração — cada função abre uma área diferente.
        </p>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Administração
        </p>
        <button
          type="button"
          onClick={irParaAdmin}
          className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${
            emAdmin
              ? "bg-brand-blue/10 text-brand-blue"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 text-left">Administrador da plataforma</span>
          {emAdmin && <Check className="h-4 w-4 shrink-0" />}
        </button>

        <p className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Organização
        </p>
        {funcionarios.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => irParaFuncionario(f.id)}
            className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors ${
              emOrganizacao && funcionarioAtivo?.id === f.id
                ? "bg-brand-green/10 text-brand-green"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate font-medium">{f.nome}</span>
              <span className="block text-[11px] font-normal text-slate-400 dark:text-slate-500">
                {PAPEL_ORGANIZACAO_LABEL[f.papel]}
              </span>
            </span>
            {emOrganizacao && funcionarioAtivo?.id === f.id && (
              <Check className="h-4 w-4 shrink-0" />
            )}
          </button>
        ))}

        <p className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Atleta / Responsável
        </p>
        {perfis.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => irParaAtleta(p.nome, p.email)}
            className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors ${
              emPortal && sessao.email === p.email
                ? "bg-brand-green/10 text-brand-green"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <User className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 truncate text-left font-medium">{p.nome}</span>
            {emPortal && sessao.email === p.email && <Check className="h-4 w-4 shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );

  if (variante === "navbar") {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setAberto((o) => !o)}
          aria-label="Trocar de perfil"
          title="Trocar de perfil"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeftRight className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        {painel}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((o) => !o)}
        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700 dark:hover:bg-slate-800"
      >
        <ArrowLeftRight className="h-[18px] w-[18px] shrink-0 text-brand-green" strokeWidth={2} />
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate font-semibold text-slate-900 dark:text-white">
            {nomeAtual}
          </span>
          <span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {subAtual}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
      </button>
      {painel}
    </div>
  );
}
