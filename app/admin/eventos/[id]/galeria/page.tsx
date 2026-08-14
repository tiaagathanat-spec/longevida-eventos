"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, ImageIcon, Globe } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import {
  useGaleria,
  CategoriaImagem,
  CATEGORIA_LABEL,
  CATEGORIAS_ORDENADAS,
  ImagemGaleria,
} from "@/lib/mock/galeria-store";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CartaoImagem } from "@/components/galeria/cartao-imagem";
import { UploadImagemModal } from "@/components/galeria/upload-imagem-modal";
import { EditarImagemModal } from "@/components/galeria/editar-imagem-modal";
import { VisualizarImagemModal } from "@/components/galeria/visualizar-imagem-modal";

export default function GaleriaDoEventoPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { listarPorEvento, adicionar, atualizar, excluir } = useGaleria();

  const evento = obterEvento(eventoId);
  const imagens = listarPorEvento(eventoId);

  const [categoriaParaUpload, setCategoriaParaUpload] = useState<CategoriaImagem | undefined>();
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [editando, setEditando] = useState<ImagemGaleria | null>(null);
  const [visualizando, setVisualizando] = useState<ImagemGaleria | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const porCategoria = useMemo(() => {
    const grupos: Record<CategoriaImagem, ImagemGaleria[]> = {
      capa: [],
      logo: [],
      banner: [],
      kit: [],
      medalha: [],
      evento: [],
      premiacao: [],
      percurso: [],
    };
    imagens.forEach((img) => grupos[img.categoria].push(img));
    return grupos;
  }, [imagens]);

  const imagemParaExcluir = imagens.find((i) => i.id === excluindoId);

  function abrirUpload(categoria?: CategoriaImagem) {
    setCategoriaParaUpload(categoria);
    setModalUploadAberto(true);
  }

  if (!evento) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
        <Link href="/admin/eventos" className="mt-4 inline-block text-sm font-medium text-brand-blue hover:underline">
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link
        href={`/admin/eventos/${eventoId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o evento
      </Link>

      <header className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Galeria</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{evento.nome}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/galeria/${eventoId}`}
            className="text-sm font-medium text-brand-blue hover:underline"
          >
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Ver galeria pública
            </span>
          </Link>
          <Button onClick={() => abrirUpload()}>
            <Plus className="h-4 w-4" />
            Enviar mídia
          </Button>
        </div>
      </header>

      {imagens.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <ImageIcon className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Nenhuma imagem ou vídeo enviado para este evento ainda.
          </p>
          <Button onClick={() => abrirUpload()} className="mt-4">
            <Plus className="h-4 w-4" />
            Enviar primeira mídia
          </Button>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {CATEGORIAS_ORDENADAS.map((categoria) => {
            const itens = porCategoria[categoria];
            if (itens.length === 0) return null;

            return (
              <section key={categoria}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {CATEGORIA_LABEL[categoria]}{" "}
                    <span className="font-normal text-slate-400">({itens.length})</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => abrirUpload(categoria)}
                    className="text-xs font-medium text-brand-blue hover:underline"
                  >
                    + Adicionar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {itens.map((imagem) => (
                    <CartaoImagem
                      key={imagem.id}
                      imagem={imagem}
                      onVisualizar={() => setVisualizando(imagem)}
                      onEditar={() => setEditando(imagem)}
                      onExcluir={() => setExcluindoId(imagem.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <UploadImagemModal
        open={modalUploadAberto}
        categoriaInicial={categoriaParaUpload}
        onClose={() => setModalUploadAberto(false)}
        onEnviar={(dados) => {
          adicionar({ eventoId, ...dados });
          setModalUploadAberto(false);
        }}
      />

      <EditarImagemModal
        imagem={editando}
        onClose={() => setEditando(null)}
        onSalvar={(dados) => {
          if (editando) atualizar(editando.id, dados);
          setEditando(null);
        }}
      />

      <VisualizarImagemModal imagem={visualizando} onClose={() => setVisualizando(null)} />

      <ConfirmDialog
        open={!!imagemParaExcluir}
        title="Excluir mídia"
        description={
          imagemParaExcluir
            ? `Tem certeza que deseja excluir "${imagemParaExcluir.nome}"? Essa ação não pode ser desfeita.`
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
