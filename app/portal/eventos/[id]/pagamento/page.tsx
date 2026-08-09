"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard, CheckCircle2, UploadCloud, ImageIcon } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { usePagamentos } from "@/lib/mock/pagamentos-store";
import { useSessao } from "@/lib/mock/sessao";
import { CHAVE_PIX_LONGEVIDA } from "@/lib/config";
import { Button } from "@/components/ui/button";

type FormaEscolhida = "pix" | "local";

export default function PagamentoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventoId = params.id;

  const { sessao } = useSessao();
  const { obterPorId: obterEvento } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { atletas } = useAtletas();
  const { inscricoes, alterarStatus } = useInscricoes();
  const { salvar: salvarPagamento } = usePagamentos();

  const evento = obterEvento(eventoId);
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);
  const [forma, setForma] = useState<FormaEscolhida>("pix");
  const [comprovante, setComprovante] = useState<string | null>(null);
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const [copiadoPix, setCopiadoPix] = useState(false);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  const meusNomesDeAtletas = useMemo(
    () =>
      new Set(
        atletas
          .filter((a) => a.responsavelNome === sessao.nome)
          .map((a) => a.nome)
      ),
    [atletas, sessao.nome]
  );

  const pendentes = useMemo(
    () =>
      inscricoes.filter(
        (i) =>
          i.eventoId === eventoId &&
          i.status === "pendente" &&
          meusNomesDeAtletas.has(i.atletaNome)
      ),
    [inscricoes, eventoId, meusNomesDeAtletas]
  );

  // Apenas as inscrições marcadas são confirmadas — não tudo que está
  // pendente. Novas pendências entram selecionadas por padrão.
  const [selecionadas, setSelecionadas] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSelecionadas((atual) => {
      const proximas = new Set(atual);
      pendentes.forEach((i) => proximas.add(i.id));
      return proximas;
    });
  }, [pendentes]);

  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }
  function descricaoProva(provaId: string) {
    const prova = provas.find((p) => p.id === provaId);
    if (!prova) return "—";
    return `${nomeModalidade(prova.modalidadeId)} · ${nomeCategoria(prova.categoriaId)}`;
  }
  function valorDaInscricao(provaId: string) {
    return provas.find((p) => p.id === provaId)?.valor ?? 0;
  }
  function formatarMoeda(valor: number) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function copiarChavePix() {
    navigator.clipboard.writeText(CHAVE_PIX_LONGEVIDA);
    setCopiadoPix(true);
    setTimeout(() => setCopiadoPix(false), 2000);
  }

  const selecionadasLista = pendentes.filter((i) => selecionadas.has(i.id));
  const total = selecionadasLista.reduce((soma, i) => soma + valorDaInscricao(i.provaId), 0);

  function toggleSelecao(id: string) {
    setSelecionadas((atual) => {
      const proximas = new Set(atual);
      if (proximas.has(id)) proximas.delete(id);
      else proximas.add(id);
      return proximas;
    });
  }

  function handleArquivoSelecionado(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErroUpload("O arquivo deve ter no máximo 5 MB.");
      return;
    }
    setErroUpload(null);
    const reader = new FileReader();
    reader.onload = () => setComprovante(String(reader.result));
    reader.readAsDataURL(file);
  }

  function handleConfirmar() {
    const hoje = new Date().toISOString().slice(0, 10);

    // PIX: o comprovante chega pendente no Financeiro do admin, que
    // confirma o pagamento e a inscrição manualmente.
    if (forma === "pix") {
      if (!comprovante) {
        setErroUpload("Anexe o comprovante do PIX para continuar.");
        return;
      }
      selecionadasLista.forEach((i) => {
        salvarPagamento(i.id, {
          valor: valorDaInscricao(i.provaId),
          formaPagamento: "pix",
          status: "pendente",
          dataPagamento: null,
          comprovanteUrl: comprovante,
        });
      });
      setAguardandoConfirmacao(true);
      return;
    }

    // Pagamento no local: confirmado na hora, igual ao fluxo simulado.
    selecionadasLista.forEach((i) => {
      salvarPagamento(i.id, {
        valor: valorDaInscricao(i.provaId),
        formaPagamento: "dinheiro",
        status: "pago",
        dataPagamento: hoje,
      });
      alterarStatus(i.id, "confirmada");
    });
    setPagamentoConfirmado(true);
  }

  if (!evento) {
    return (
      <div className="mx-auto max-w-xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
        <Link href="/portal/eventos" className="mt-4 inline-block text-sm font-medium text-brand-blue hover:underline">
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  if (aguardandoConfirmacao) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <UploadCloud className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-slate-900 dark:text-white">
          Comprovante enviado
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          O comprovante do PIX foi anexado às inscrições selecionadas em {evento.nome} e segue
          para conferência da organização. Assim que confirmado, as inscrições aparecem como
          confirmadas em Minhas Inscrições.
        </p>
        <Link href="/portal/minhas-inscricoes" className="mt-8 inline-block">
          <Button>Acompanhar inscrições</Button>
        </Link>
      </div>
    );
  }

  if (pagamentoConfirmado) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-slate-900 dark:text-white">
          Pagamento confirmado
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Suas inscrições selecionadas em {evento.nome} estão confirmadas. Acompanhe pela tela de Minhas Inscrições.
        </p>
        <Link href="/portal/minhas-inscricoes" className="mt-8 inline-block">
          <Button>Ver minhas inscrições</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <Link
        href={`/portal/eventos/${eventoId}/inscricao`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Pagamento</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{evento.nome}</p>

      {pendentes.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Não há inscrições pendentes de pagamento para este evento.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {pendentes.map((inscricao) => {
                const marcada = selecionadas.has(inscricao.id);
                return (
                  <label
                    key={inscricao.id}
                    className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={marcada}
                        onChange={() => toggleSelecao(inscricao.id)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {inscricao.atletaNome}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {descricaoProva(inscricao.provaId)}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {formatarMoeda(valorDaInscricao(inscricao.provaId))}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {selecionadasLista.length} de {pendentes.length} selecionadas
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Total: {formatarMoeda(total)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-brand-blue/5 p-4 text-sm text-slate-600 dark:text-slate-300">
              Pagamento simulado — a integração com o gateway real ainda será desenvolvida.
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Como você vai pagar?
              </p>

              <div className="mt-3 flex flex-col gap-2">
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                    forma === "pix"
                      ? "border-brand-green bg-brand-green/5"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    checked={forma === "pix"}
                    onChange={() => setForma("pix")}
                    className="h-4 w-4 text-brand-green focus:ring-brand-green"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      PIX — enviar comprovante
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      O pagamento fica pendente até a organização confirmar o comprovante.
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Chave Pix: <span className="font-mono font-medium">{CHAVE_PIX_LONGEVIDA}</span>
                    </p>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                    forma === "local"
                      ? "border-brand-green bg-brand-green/5"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    checked={forma === "local"}
                    onChange={() => setForma("local")}
                    className="h-4 w-4 text-brand-green focus:ring-brand-green"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Pagar no local
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Confirmação imediata, pagamento no dia do evento.
                    </p>
                  </div>
                </label>
              </div>

              {forma === "pix" && (
                <div className="mt-4">
                  <input
                    ref={inputArquivoRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => handleArquivoSelecionado(e.target.files?.[0])}
                  />

                  {comprovante ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        {comprovante.startsWith("data:image") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={comprovante}
                            alt="Comprovante anexado"
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                            <ImageIcon className="h-5 w-5 text-slate-400" />
                          </div>
                        )}
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          Comprovante anexado
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => inputArquivoRef.current?.click()}
                        >
                          Trocar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setComprovante(null)}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => inputArquivoRef.current?.click()}
                      className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 transition-colors hover:border-brand-green hover:text-brand-green dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                    >
                      <UploadCloud className="h-6 w-6" />
                      Anexar comprovante do PIX (imagem ou PDF)
                    </button>
                  )}

                  {erroUpload && <p className="mt-2 text-sm text-red-500">{erroUpload}</p>}
                </div>
              )}
            </div>

            <Button
              onClick={handleConfirmar}
              disabled={selecionadasLista.length === 0}
              className="mt-2"
            >
              <CreditCard className="h-4 w-4" />
              {forma === "pix" ? "Enviar comprovante" : "Confirmar pagamento"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
