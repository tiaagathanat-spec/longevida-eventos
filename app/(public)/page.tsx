// Tela: Acesso — porta de entrada do Longevida Eventos.
// Antes do login e do cadastro, o visitante escolhe qual fluxo seguir.

import Link from "next/link";
import { LogIn, UserPlus, ArrowRight } from "lucide-react";
import { LogoLongevida } from "@/components/brand/logo-longevida";

export default function Page() {
  return (
    <main className="relative grid min-h-screen grid-cols-1 overflow-hidden lg:grid-cols-2">
      {/* Identificação — canto superior direito */}
      <div className="absolute right-5 top-5 z-20">
        <LogoLongevida className="h-14 w-auto" />
      </div>
      {/* Painel de identidade — visível a partir de telas grandes */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-blue-dark via-brand-blue to-brand-green p-12 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 left-0 h-80 w-80 rounded-full bg-brand-green-light/20 blur-3xl"
        />

        <span className="relative text-lg font-semibold tracking-tight">Longevida Eventos</span>

        <div className="relative max-w-sm">
          <h1 className="text-3xl font-semibold leading-tight">
            Sua inscrição e acompanhamento de provas em um só lugar.
          </h1>
          <p className="mt-4 text-sm text-white/80">
            Atletas e responsáveis criam sua conta, se inscrevem nos eventos e acompanham
            resultados e classificações do Espaço Longevida.
          </p>
        </div>

        <span className="relative text-xs text-white/60">Espaço Longevida</span>
      </div>

      {/* Opções de acesso */}
      <div className="relative flex items-center justify-center px-6 py-16">
        {/* Marca d'água */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <LogoLongevida watermark className="h-[420px] w-auto opacity-[0.05]" />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              Longevida Eventos
            </span>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Bem-vindo</h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Como você quer continuar?
          </p>

          <div className="mt-8 flex flex-col gap-4">
            <Link href="/login" className="group block">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand-blue hover:bg-brand-blue/5 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-brand-blue">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                  <LogIn className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Já tenho conta
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Acesse o seu painel com seu e-mail e senha.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-blue" />
              </div>
            </Link>

            <Link href="/cadastro" className="group block">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand-green hover:bg-brand-green/5 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-brand-green">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                  <UserPlus className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Não tenho conta
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Cadastre-se em poucos passos, como atleta ou responsável.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-green" />
              </div>
            </Link>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Precisando de ajuda?{" "}
            <a
              href="https://wa.me/5562981236127"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-blue hover:text-brand-blue-dark hover:underline"
            >
              Entre em contato com a organização no WhatsApp.
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
