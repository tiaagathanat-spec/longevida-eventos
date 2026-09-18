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
import { useTiposProva } from "@/lib/mock/tipos-prova-store";
import { useEtapasProva } from "@/lib/mock/etapas-prova-store";
import { useInscricoes, nomeDaInscricao, type Inscricao } from "@/lib/mock/inscricoes-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useDorsais, obterUltimaAuditoria } from "@/lib/mock/dorsais-store";
import { useUsuarioOrganizacao } from "@/lib/supabase/usuario-organizacao";
import { useQrCodes } from "@/lib/mock/qrcodes-store";
import { buscarLinhas } from "@/lib/supabase/persistencia";
import {
  localizarResolucao,
  normalizarIdentificador,
  extrairIdInscricaoDireto,
  validarEventoDaResolucao,
  type ResolucaoQr,
} from "@/lib/qrcodes/resolver";
import {
  montarParticipacao,
  funcaoComplementa,
  funcaoIndividualTexto,
  type DadosParticipacao,
} from "@/lib/dorsais/dados-participacao";
import { LeitorQr } from "@/components/qrcode/leitor-qr";
import { Button } from "@/components/ui/button";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";
import { normalizarNomePessoa } from "@/lib/utils/nomes";

type ResumoInscricao = {
  inscricaoId: string;
  atletaNome: string;
  atletaNome2?: string;
  atletaNome3?: string;
  atletaNome4?: string;
  provaNome: string;
  eventoNome: string;
  numeroPeito: string;
  status: string;
  participacao: DadosParticipacao;
};

export default function OrganizacaoLeitorQrPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { tiposProva } = useTiposProva();
  const { listarPorProva: listarEtapasDaProva } = useEtapasProva();
  const { inscricoes, erro: erroInscricoes } = useInscricoes();
  const { atletas } = useAtletas();
  const { obterPorInscricao: obterDorsal, atualizarControles } = useDorsais();
  const { nome } = useUsuarioOrganizacao();
  const {
    qrCodes,
    pronto: prontoQrCodes,
    localizarPorIdentificador,
    buscarPorIdentificadorNoBanco,
    registrarLeitura,
    alternarAtivo,
    erro: erroQrCodes,
  } = useQrCodes();

  const evento = obterEvento(eventoId);

  const [identificador, setIdentificador] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [lido, setLido] = useState<number>(0);
  const [processando, setProcessando] = useState(false);
  const [inscricaoRemota, setInscricaoRemota] = useState<Inscricao | null>(null);

  const inscricao = useMemo(() => {
    if (!identificador) return null;
    const qr = localizarPorIdentificador(identificador);
    if (!qr) return null;
    return (
      inscricoes.find((i) => i.id === qr.inscricaoId) ??
      inscricaoRemota ??
      null
    );
  }, [identificador, localizarPorIdentificador, inscricoes, inscricaoRemota]);

  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }

  // Consulta direta ao Supabase quando a inscrição não está em memória
  // (ex.: store ainda carregando). Nunca cria uma inscrição nova.
  async function buscarInscricaoNoBanco(id: string): Promise<Inscricao | null> {
    try {
      const linhas = await buscarLinhas<Inscricao>("app_inscricoes", "id", id);
      return linhas?.[0] ?? null;
    } catch {
      return null;
    }
  }

  // Valida evento/status/ativo e exibe o resultado. Retorna true para a
  // câmera parar (leitura aceita) ou false para continuar lendo.
  function aceitarResolucao(resolucao: ResolucaoQr, codigo: string): boolean {
    const eventoOk = validarEventoDaResolucao(resolucao, eventoId);
    if (!eventoOk.ok) {
      setAviso(
        eventoOk.motivo === "outro_evento"
          ? "Este QR Code pertence a outro evento. Confira se está lendo o código certo."
          : "Não foi possível validar o evento deste QR Code."
      );
      setIdentificador(null);
      return false;
    }

    if (resolucao.qr && !resolucao.qr.ativo) {
      setAviso("Este QR Code foi cancelado. A inscrição não pode ser confirmada no evento.");
      setIdentificador(null);
      return false;
    }

    if (resolucao.inscricao.status === "cancelada") {
      setAviso("A inscrição vinculada a este QR Code está cancelada.");
      setIdentificador(codigo);
      return true;
    }

    if (resolucao.inscricao.status !== "confirmada") {
      setAviso("A inscrição ainda não está confirmada (pagamento pendente).");
      setIdentificador(codigo);
      return true;
    }

    setIdentificador(codigo);
    registrarLeitura(resolucao.inscricao.id, {
      local: `Evento: ${evento?.nome ?? "—"}`,
      usuario: nome || "Operador",
    });
    setLido((n) => n + 1);
    return true;
  }

  async function lidarLeitura(codigo: string): Promise<boolean> {
    const normal = normalizarIdentificador(codigo);
    setAviso(null);
    if (!normal) {
      setAviso("QR Code inválido (vazio).");
      return false;
    }

    // 1) Resolve no estado em memória (individual ou Family/Dupla).
    const resolucaoLocal = localizarResolucao(qrCodes, inscricoes, normal);
    if (resolucaoLocal) return aceitarResolucao(resolucaoLocal, normal);

    // 2) Fallback: consulta direta ao Supabase (estado ainda carregando).
    setProcessando(true);
    try {
      const qr = await buscarPorIdentificadorNoBanco(normal);
      if (qr) {
        const inscricaoEncontrada =
          inscricoes.find((i) => i.id === qr.inscricaoId) ??
          (await buscarInscricaoNoBanco(qr.inscricaoId));
        if (inscricaoEncontrada) {
          if (inscricaoEncontrada.id === qr.inscricaoId) {
            setInscricaoRemota(
              inscricoes.some((i) => i.id === qr.inscricaoId) ? null : inscricaoEncontrada
            );
            return aceitarResolucao(
              { qr, inscricao: inscricaoEncontrada, porIdentificador: true },
              normal
            );
          }
          setAviso("Inscrição não localizada para este QR Code.");
          return false;
        }
        setAviso("Inscrição não localizada para este QR Code.");
        return false;
      }

      // 3) Conteúdo igual ao id da inscrição (QR antigos).
      const idDireto = extrairIdInscricaoDireto(normal);
      if (idDireto) {
        const inscricaoEncontrada =
          inscricoes.find((i) => i.id === idDireto) ??
          (await buscarInscricaoNoBanco(idDireto));
        if (inscricaoEncontrada) {
          setInscricaoRemota(
            inscricoes.some((i) => i.id === idDireto) ? null : inscricaoEncontrada
          );
          return aceitarResolucao(
            {
              qr: qrCodes.find((q) => q.inscricaoId === inscricaoEncontrada.id),
              inscricao: inscricaoEncontrada,
              porIdentificador: false,
            },
            normal
          );
        }
      }
    } finally {
      setProcessando(false);
    }

    setAviso("QR Code não encontrado. Confira se ele pertence a uma inscrição deste sistema.");
    return false;
  }

  function reiniciar() {
    setIdentificador(null);
    setAviso(null);
    setInscricaoRemota(null);
  }

  function alternarControle(chave: "checkInFeito" | "kitEntregue" | "medalhaEntregue" | "alimentacaoEntregue") {
    if (!inscricao) return;
    atualizarControles(inscricao.id, { [chave]: !obterDorsal(inscricao.id)?.[chave] }, nome);
  }

  const dorsal = inscricao ? obterDorsal(inscricao.id) : null;

  function horaDe(iso: string) {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  const resumo: ResumoInscricao | null = useMemo(() => {
    if (!inscricao) return null;
    const prova = provas.find((p) => p.id === inscricao.provaId);
    const modalidade = prova
      ? modalidades.find((m) => m.id === prova.modalidadeId)
      : undefined;
    const categoria = prova
      ? categorias.find((c) => c.id === prova.categoriaId)
      : undefined;
    const tipoProva = prova
      ? tiposProva.find((t) => t.id === prova.tipoProvaId)
      : undefined;
    const dorsal = obterDorsal(inscricao.id);
    const participacao = montarParticipacao({
      inscricao,
      prova,
      modalidade,
      categoria,
      tipoProva,
      dorsal,
      etapas: listarEtapasDaProva(inscricao.provaId),
    });
    return {
      inscricaoId: inscricao.id,
      atletaNome: inscricao.atletaNome,
      atletaNome2: inscricao.atletaNome2,
      atletaNome3: inscricao.atletaNome3,
      atletaNome4: inscricao.atletaNome4,
      provaNome: prova
        ? `${nomeModalidade(prova.modalidadeId)} · ${nomeCategoria(prova.categoriaId)}`
        : "—",
      eventoNome: evento?.nome ?? "—",
      numeroPeito: participacao.peito.texto,
      status: inscricao.status,
      participacao,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inscricao, provas, evento, modalidades, categorias, tiposProva, obterDorsal, listarEtapasDaProva]);

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

      <AlertaPersistencia erro={erroInscricoes ?? erroQrCodes} />

      {aviso && (
        <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-300">
          {aviso}
        </div>
      )}

      {processando && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Localizando inscrição no banco…
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
                  {normalizarNomePessoa(nomeDaInscricao(resumo))}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {resumo.provaNome}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{resumo.eventoNome}</p>
              </div>
            </div>
          </div>

          {resumo.numeroPeito && resumo.numeroPeito !== "—" ? (
            <p className="mb-4 flex items-center text-sm text-slate-500 dark:text-slate-400">
              Número de peito:
              <span className="ml-2 rounded-lg bg-slate-900 px-2.5 py-0.5 font-black text-white dark:bg-white dark:text-slate-900">
                {resumo.numeroPeito}
              </span>
            </p>
          ) : null}

          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Participação
            </p>
            {resumo.participacao.tipo === "individual" ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <CampoIdentificacao
                  rotulo="Modalidade"
                  valor={resumo.participacao.modalidade}
                />
                <CampoIdentificacao
                  rotulo="Categoria"
                  valor={resumo.participacao.categoria}
                />
                <CampoIdentificacao
                  rotulo="Percurso/etapa"
                  valor={resumo.participacao.participanteUnico.percurso}
                />
                <CampoIdentificacao
                  rotulo="Função"
                  valor={funcaoIndividualTexto(resumo.participacao.participanteUnico)}
                />
                <CampoIdentificacao
                  rotulo="Distância"
                  valor={resumo.participacao.participanteUnico.distancia}
                />
              </div>
            ) : (
              <div>
                <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                  {resumo.participacao.nomeExibicao} · {resumo.participacao.modalidade} ·{" "}
                  {resumo.participacao.categoria}
                </p>
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                  {resumo.participacao.participantes.map((p) => (
                    <li
                      key={p.posicao}
                      className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1.5"
                    >
                      <span className="w-40 shrink-0 font-semibold text-slate-900 dark:text-white">
                        {p.nome}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {funcaoComplementa({ funcao: p.funcao, percurso: p.percurso }) && p.funcao}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {p.percurso}
                      </span>
                      <span className="ml-auto text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {p.distancia}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ControleCard
              icone={<User className="h-4 w-4" />}
              label="Check-in"
              ativo={dorsal?.checkInFeito ?? false}
              onClick={() => alternarControle("checkInFeito")}
              detalhe={(() => {
                const aud = obterUltimaAuditoria(dorsal, "checkInFeito");
                return aud ? `${aud.usuario} · ${horaDe(aud.em)}` : "";
              })()}
            />
            <ControleCard
              icone={<Package className="h-4 w-4" />}
              label="Kit"
              ativo={dorsal?.kitEntregue ?? false}
              onClick={() => alternarControle("kitEntregue")}
              detalhe={(() => {
                const aud = obterUltimaAuditoria(dorsal, "kitEntregue");
                return aud ? `${aud.usuario} · ${horaDe(aud.em)}` : "";
              })()}
            />
            <ControleCard
              icone={<Award className="h-4 w-4" />}
              label="Medalha"
              ativo={dorsal?.medalhaEntregue ?? false}
              onClick={() => alternarControle("medalhaEntregue")}
              detalhe={(() => {
                const aud = obterUltimaAuditoria(dorsal, "medalhaEntregue");
                return aud ? `${aud.usuario} · ${horaDe(aud.em)}` : "";
              })()}
            />
            <ControleCard
              icone={<Utensils className="h-4 w-4" />}
              label="Alimentação"
              ativo={dorsal?.alimentacaoEntregue ?? false}
              onClick={() => alternarControle("alimentacaoEntregue")}
              detalhe={(() => {
                const aud = obterUltimaAuditoria(dorsal, "alimentacaoEntregue");
                return aud ? `${aud.usuario} · ${horaDe(aud.em)}` : "";
              })()}
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
  detalhe,
}: {
  icone: React.ReactNode;
  label: string;
  ativo: boolean;
  onClick: () => void;
  detalhe?: string;
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
      <span className="flex flex-col items-start">
        {label}
        {detalhe ? (
          <span className={`text-[10px] font-normal ${ativo ? "text-brand-green/70" : "text-slate-400"}`}>
            {detalhe}
          </span>
        ) : null}
      </span>
      <span className={`ml-auto text-xs font-semibold ${ativo ? "text-brand-green" : "text-slate-400"}`}>
        {ativo ? "Sim" : "Não"}
      </span>
    </button>
  );
}

function CampoIdentificacao({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-slate-200 pb-1 dark:border-slate-700">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {rotulo}
      </span>
      <span className="text-right font-semibold text-slate-900 dark:text-white">
        {valor && valor !== "—" ? valor : "—"}
      </span>
    </div>
  );
}
