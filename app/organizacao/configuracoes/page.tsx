"use client";

import {
  Building2,
  UserCog,
  ShieldCheck,
  Check,
  Info,
} from "lucide-react";
import {
  ORGANIZACOES_DEMO,
  MODULOS_ORGANIZACAO,
  PAPEL_ORGANIZACAO_LABEL,
} from "@/lib/mock/funcionarios-store";
import { useUsuarioOrganizacao } from "@/lib/supabase/usuario-organizacao";

// Tela: Configurações da Organização (sem financeiro).
//
// Mostra os dados da organização vinculada e o perfil do usuário logado
// na área de Organização (nome, papel e módulos liberados). Ajustes de
// funcionários e permissões são feitos pelo Admin em /admin/funcionarios.

export default function OrganizacaoConfiguracoesPage() {
  const { nome, email, telefone, papel, permissoes } = useUsuarioOrganizacao();
  const organizacao = ORGANIZACOES_DEMO[0];

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Configurações
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Organização vinculada e permissões da sua equipe.
        </p>
      </header>

      {/* Dados da organização */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-brand-green/10 p-2">
            <Building2 className="h-5 w-5 text-brand-green" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Organização
          </h2>
        </div>
        {organizacao ? (
          <div className="mt-4">
            <p className="text-lg font-medium text-slate-900 dark:text-white">
              {organizacao.nome}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {organizacao.descricao}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Nenhuma organização vinculada.
          </p>
        )}
      </section>

      {/* Funcionário ativo */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-brand-blue/10 p-2">
            <UserCog className="h-5 w-5 text-brand-blue" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Perfil em uso
          </h2>
        </div>

        {nome ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <p className="font-medium text-slate-900 dark:text-white">
                {nome}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-xs font-medium text-brand-blue">
                <ShieldCheck className="h-3.5 w-3.5" />
                {papel ? PAPEL_ORGANIZACAO_LABEL[papel] : "Equipe"}
              </span>
            </div>
            <div className="mt-1 space-y-0.5 text-sm text-slate-500 dark:text-slate-400">
              <p>{email}</p>
              {telefone && <p>{telefone}</p>}
            </div>

            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Módulos liberados
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {MODULOS_ORGANIZACAO.map((modulo) => {
                  const liberado = permissoes.includes(modulo.chave);
                  return (
                    <span
                      key={modulo.chave}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                        liberado
                          ? "bg-brand-green/10 text-brand-green"
                          : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                      }`}
                    >
                      {liberado && <Check className="h-3.5 w-3.5" />}
                      {modulo.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Info className="h-4 w-4" />
            Dados do perfil não carregados.
          </p>
        )}
      </section>

      <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
        Ajustes de funcionários, papéis e permissões são feitos pelo Administrador em{" "}
        <span className="font-medium">Admin → Funcionários</span>.
      </p>
    </div>
  );
}
