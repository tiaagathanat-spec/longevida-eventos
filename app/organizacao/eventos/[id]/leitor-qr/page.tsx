"use client";

// Leitor de QR Code do evento (Organização).
//
// Fluxo (seções 37–40 da especificação):
//   1. A Organização lê o QR Code da inscrição (câmera ou código manual).
//   2. A tela localiza a inscrição pelo identificador e verifica status.
//   3. "Após leitura": mostra atleta, prova, número de peito, check-in,
//      kit, medalha e alimentação — com ações rápidas para confirmar
//      cada entrega/check-in no dia do evento.

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Timer, Package, Award, Utensils } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import { useFuncionarios } from "@/lib/mock/funcionarios-store";
import { useQrCodes } from "@/lib/mock/qrcodes-store";
import { LeitorQr } from "@/components/qrcode/leitor-qr";
import { Button } from "@/components/ui/button";

type ResumoInscricao = {
  inscricaoId: string;
  atletaNome: string;
  provaNome: string;
  eventoNome: string;
  numeroPeito: string | null;
  status: string;
};

export default function OrganizacaoLeitorQrPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { atletas } = useAtletas();
  const { obterPorInscricao: obterDorsal, atualizarControles } = useDorsais();
  const { funcionarioAtivo } = useFuncionarios();
  const { localizarPorIdentificador, registrarLeitura, alternarAtivo } = useQrCodes();

  const evento = obterEvento(eventoId);

  const [identificador, setIdentificador] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [lido, setLido] = useState<number>(0);

  const inscricao = useMemo(() => {
    if (!identificador) return null;
    const qr = localizarPorIdentificador(identificador);
    if (!qr) return null;
    return inscricoes.find((i) => i.id === qr.inscricaoId) ?? null;
  }, [identificador, localizarPorIdentificador, inscricoes]);

  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }

  function lidarLeitura(codigo: string) {
    const qr = localizarPorIdentificador(codigo);
    setAviso(null);

    if (!qr) {
      setAviso("QR Code não encontrado. Confira se ele pertence a uma inscrição deste sistema.");
      setIdentificador(null);
      return;
    }

    const inscricaoEncontrada = inscricoes.find((i) => i.id === qr.inscricaoId);
    if (!inscricaoEncontrada) {
      setAviso("Inscrição não localizada para este QR Code.");
      setIdentificador(null);
      return;
    }

    if (!qr.ativo) {
      setAviso("Este QR Code foi cancelado. A inscrição não pode ser confirmada no evento.");
      setIdentificador(null);
      return;
    }

    if (inscricaoEncontrada.status === "cancelada") {
      setAviso("A inscrição vinculada a este QR Code está cancelada.");
      setIdentificador(codigo);
      return;
    }

    if (inscricaoEncontrada.status !== "confirmada") {
      setAviso("A inscrição ainda não está confirmada (pagamento pendente).");
      setIdentificador(codigo);
      return;
    }

    setIdentificador(codigo);
    registrarLeitura(inscricaoEncontrada.id, {
      local: `Evento: ${evento?.nome ?? "—"}`,
      usuario: funcionarioAtivo?.nome ?? "Operador",
    });
    setLido((n) => n + 1);
  }

  function reiniciar() {
    setIdentificador(null);
    setAviso(null);
  }

  function alternarControle(chave: "checkInFeito" | "kitEntregue" | "medalhaEntregue" | "alimentacaoEntregue") {
    if (!inscricao) return;
    atualizarControles(inscricao.id, { [chave]: !obterDorsal(inscricao.id)?.[chave] });
  }

  const dorsal = inscricao ? obterDorsal(inscricao.id) : null;
  const resumo: ResumoInscricao | null = useMemo(() => {
    if (!inscricao) return null;
    const prova = provas.find((p) => p.id === inscricao.provaId);
    return {
      inscricaoId: inscricao.id,
      atletaNome: inscricao.atletaNome,
      provaNome: prova
        ? `${nomeModalidade(prova.modalidadeId)} · ${nomeCategoria(prova.categoriaId)}`
        : "—",
      eventoNome: evento?.nome ?? "—",
      numeroPeito: inscricao.numeroPeito ?? null,
      status: inscricao.status,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inscricao, provas, evento, modalidades, categorias]);

  if (!evento) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
        <Link
          href="/organizacao/eventos"
          className="mt-4 inline-block text-sm font-medium text-brand-green hover:underline"
        >
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href={`/organizacao/eventos/${eventoId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o evento
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Leitor de QR Code</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {evento.nome} — aponte a câmera para o QR da inscrição.
        </p>
      </header>

      {aviso && (
        <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-300">
          {aviso}
        </div>
      )}

      {identificador && inscricao && resumo ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Inscrição encontrada
            </p>
            <span className="rounded-full bg-brand-green/10 px-2.5 py-0.5 text-xs font-medium text-brand-green">
              {resumo.status}
            </span>
          </div>

          <div className="mb-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-brand-green/10 p-2">
                <User className="h-5 w-5 text-brand-green" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-white">
                  {resumo.atletaNome}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {resumo.provaNome}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{resumo.eventoNome}</p>
              </div>
            </div>
          </div>

          {resumo.numeroPeito && (
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Número de peito:{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {resumo.numeroPeito}
              </span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <ControleCard
              icone={<User className="h-4 w-4" />}
              label="Check-in"
              ativo={dorsal?.checkInFeito ?? false}
              onClick={() => alternarControle("checkInFeito")}
            />
            <ControleCard
              icone={<Package className="h-4 w-4" />}
              label="Kit"
              ativo={dorsal?.kitEntregue ?? false}
              onClick={() => alternarControle("kitEntregue")}
            />
            <ControleCard
              icone={<Award className="h-4 w-4" />}
              label="Medalha"
              ativo={dorsal?.medalhaEntregue ?? false}
              onClick={() => alternarControle("medalhaEntregue")}
            />
            <ControleCard
              icone={<Utensils className="h-4 w-4" />}
              label="Alimentação"
              ativo={dorsal?.alimentacaoEntregue ?? false}
              onClick={() => alternarControle("alimentacaoEntregue")}
            />
          </div>

          <div className="mt-6 flex items-center justify-between gap-2">
            <Button variant="secondary" onClick={reiniciar}>
              Ler outro QR Code
            </Button>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {lido > 0 ? `${lido} leitura(s) registrada(s)` : "Leitura registrada"}
            </p>
          </div>
        </div>
      ) : (
        <LeitorQr onLeitura={lidarLeitura} />
      )}

      <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <Timer className="h-3.5 w-3.5" />
        Ações só são liberadas para inscrições confirmadas e com QR ativo.
      </div>
    </div>
  );
}

function ControleCard({
  icone,
  label,
  ativo,
  onClick,
}: {
  icone: React.ReactNode;
  label: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
        ativo
          ? "border-brand-green/40 bg-brand-green/10 text-brand-green"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
      }`}
    >
      {icone}
      {label}
      <span className={`ml-auto text-xs font-semibold ${ativo ? "text-brand-green" : "text-slate-400"}`}>
        {ativo ? "Sim" : "Não"}
      </span>
    </button>
  );
}
