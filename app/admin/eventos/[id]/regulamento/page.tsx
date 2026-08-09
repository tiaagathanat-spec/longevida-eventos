"use client";

import { useRef, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Plus,
  Trash2,
  UploadCloud,
  ExternalLink,
} from "lucide-react";
import { useEventos, EVENTO_STATUS_LABEL } from "@/lib/mock/eventos-store";
import { useRegulamentos, Regulamento, TipoRegulamento } from "@/lib/mock/regulamentos-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function RegulamentoPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { listarPorEvento, adicionar, excluir } = useRegulamentos();

  const evento = obterEvento(eventoId);
  const documentos = listarPorEvento(eventoId);

  const inputRef = useRef<HTMLInputElement>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [arquivoUrl, setArquivoUrl] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoRegulamento>("pdf");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const visivel = evento ? evento.status !== "rascunho" : false;

  function abrirModal() {
    setArquivoUrl(null);
    setNome("");
    setTipo("pdf");
    setErro(null);
    setModalAberto(true);
  }

  function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const tipoDetectado: TipoRegulamento =
      arquivo.type === "application/pdf"
        ? "pdf"
        : arquivo.type.startsWith("image/")
        ? "imagem"
        : "pdf";

    if (arquivo.type !== "application/pdf" && !arquivo.type.startsWith("image/")) {
      setErro("Selecione um arquivo PDF ou imagem.");
      return;
    }

    setErro(null);
    setTipo(tipoDetectado);
    if (!nome) setNome(arquivo.name.replace(/\.[^/.]+$/, ""));

    const leitor = new FileReader();
    leitor.onload = () => setArquivoUrl(leitor.result as string);
    leitor.readAsDataURL(arquivo);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!arquivoUrl) {
      setErro("Selecione um arquivo para enviar.");
      return;
    }
    if (!nome.trim()) {
      setErro("Informe um nome para o documento.");
      return;
    }

    adicionar({ eventoId, tipo, nome: nome.trim(), url: arquivoUrl });
    setModalAberto(false);
    setArquivoUrl(null);
    setNome("");
    setTipo("pdf");
  }

  const documentoParaExcluir = documentos.find((d) => d.id === excluindoId);

  if (!evento) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
        <Link
          href="/admin/eventos"
          className="mt-4 inline-block text-sm font-medium text-brand-blue hover:underline"
        >
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href={`/admin/eventos/${eventoId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o evento
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Regulamento</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{evento.nome}</p>
        </div>
        <Button onClick={abrirModal}>
          <Plus className="h-4 w-4" />
          Enviar documento
        </Button>
      </header>

      <div
        className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
          visivel
            ? "border-brand-green/30 bg-brand-green/5 text-brand-green"
            : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-400"
        }`}
      >
        {visivel
          ? "Este evento está publicado — os documentos abaixo ficam visíveis aos atletas."
          : `Este evento está em "${EVENTO_STATUS_LABEL[evento.status]}". Os documentos só aparecem para os atletas quando as informações forem liberadas.`}
      </div>

      {documentos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <FileText className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Nenhum regulamento enviado para este evento ainda.
          </p>
          <Button onClick={abrirModal} className="mt-4">
            <Plus className="h-4 w-4" />
            Enviar primeiro documento
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {documentos.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-xl p-2 ${
                    doc.tipo === "pdf" ? "bg-red-50 text-red-500" : "bg-brand-blue/10 text-brand-blue"
                  }`}
                >
                  {doc.tipo === "pdf" ? (
                    <FileText className="h-5 w-5" />
                  ) : (
                    <ImageIcon className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{doc.nome}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {doc.tipo === "pdf" ? "PDF" : "Imagem"} · Enviado em {formatarData(doc.enviadoEm)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <a href={doc.url} target="_blank" rel="noreferrer">
                  <Button variant="ghost">
                    <ExternalLink className="h-4 w-4" />
                    Ver
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => setExcluindoId(doc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalAberto} title="Enviar documento" onClose={() => setModalAberto(false)}>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Arquivo
            </label>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-brand-blue/50 dark:border-slate-700 dark:bg-slate-900"
            >
              {arquivoUrl ? (
                tipo === "imagem" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={arquivoUrl}
                    alt="Pré-visualização"
                    className="h-28 w-full rounded-lg object-cover"
                  />
                ) : (
                  <>
                    <FileText className="h-8 w-8 text-red-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      PDF selecionado
                    </span>
                  </>
                )
              ) : (
                <>
                  <UploadCloud className="h-6 w-6 text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Clique para escolher um PDF ou imagem
                  </span>
                </>
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={handleArquivoSelecionado}
              className="hidden"
            />
          </div>

          <Input
            id="nome"
            label="Nome do documento"
            placeholder="Ex: Regulamento geral 2026"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          {erro && <p className="text-sm text-red-500">{erro}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit">Enviar</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!documentoParaExcluir}
        title="Excluir documento"
        description={
          documentoParaExcluir
            ? `Tem certeza que deseja excluir "${documentoParaExcluir.nome}"? Ele deixará de ficar disponível aos atletas.`
            : undefined
        }
        confirmLabel="Excluir"
        onCancel={() => setExcluindoId(null)}
        onConfirm={() => {
          if (excluindoId) excluir(excluindoId);
          setExcluindoId(null);
        }}
      />
    </div>
  );
}
