import { redirect } from "next/navigation";
import { getUsuarioAtual, getOrganizacoesDoUsuario, temPapelEm } from "@/lib/auth";
import { CronometragemClient } from "@/components/cronometragem/cronometragem-client";

// Server Component: faz a checagem de autenticação/autorização no
// servidor, ANTES de qualquer HTML da tela ser enviado ao cliente.
// A lógica de autorização (lib/auth.ts) nunca é exposta no client —
// só o resultado (renderizar a tela ou negar acesso) chega ao browser.
//
// A UI em si (interativa, com estado) foi só movida para
// components/cronometragem/cronometragem-client.tsx — nenhuma linha
// de lógica ou de markup foi alterada nessa extração.
export default async function CronometragemPage() {
  const usuario = await getUsuarioAtual();

  if (!usuario) {
    redirect("/login");
  }

  const organizacoes = await getOrganizacoesDoUsuario(usuario.id);
  const autorizado = temPapelEm(organizacoes, [
    "cronometragem",
    "administrador",
    "organizador",
  ]);

  if (!autorizado) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Acesso restrito
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Você não tem permissão para acessar a Cronometragem. Fale com o
          administrador da sua organização se acredita que isso é um engano.
        </p>
      </div>
    );
  }

  return <CronometragemClient />;
}
