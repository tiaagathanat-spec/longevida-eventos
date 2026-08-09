"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import {
  useGaleria,
  CategoriaImagem,
  CATEGORIA_LABEL,
  CATEGORIAS_ORDENADAS,
  ImagemGaleria,
} from "@/lib/mock/galeria-store";
import { CartaoImagem } from "@/components/galeria/cartao-imagem";
import { VisualizarImagemModal } from "@/components/galeria/visualizar-imagem-modal";

// Galeria pública do evento — só mostra imagens marcadas como
// "pública" pelo administrador. Sem ações de editar/excluir aqui.

export default function GaleriaPublicaPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { listarPublicasPorEvento } = useGaleria();

  const evento = obterEvento(eventoId);
  const imagens = listarPublicasPorEvento(eventoId);

  const [visualizando, setVisualizando] = useState<ImagemGaleria | null>(null);

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

  if (!evento) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10 text-center">
        <span className="text-xs font-medium uppercase tracking-wide text-brand-blue">
          Galeria
        </span>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">
          {evento.nome}
        </h1>
      </header>

      {imagens.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-700 dark:bg-slate-950">
          <ImageIcon className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Nenhuma imagem disponível para este evento ainda.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {CATEGORIAS_ORDENADAS.map((categoria) => {
            const itens = porCategoria[categoria];
            if (itens.length === 0) return null;

            return (
              <section key={categoria}>
                <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                  {CATEGORIA_LABEL[categoria]}
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {itens.map((imagem) => (
                    <CartaoImagem
                      key={imagem.id}
                      imagem={imagem}
                      onVisualizar={() => setVisualizando(imagem)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <VisualizarImagemModal imagem={visualizando} onClose={() => setVisualizando(null)} />

      <div className="mt-12 text-center">
        <Link href="/login" className="text-sm font-medium text-brand-blue hover:underline">
          Entrar para ver mais
        </Link>
      </div>
    </div>
  );
}
