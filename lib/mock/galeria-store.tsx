"use client";

// Store do módulo Galeria (Context + useState), com a mídia persistida no
// Supabase Storage e as linhas em app_galeria via usePersistencia.
//
// Os arquivos são enviados ao bucket `galeria` (policies da migration 0011)
// e o campo `url` da linha guarda a URL pública do arquivo. Registros
// antigos que guardavam data URL (base64) na coluna `url` continuam
// funcionando — o navegador renderiza data URLs; apenas novos uploads
// passam pelo Storage.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";
import { TipoMidia } from "@/lib/mock/galeria-midias";
import { enviarArquivoGaleria, removerArquivoGaleria } from "@/lib/supabase/galeria-storage";

export type CategoriaImagem =
  | "capa"
  | "logo"
  | "banner"
  | "kit"
  | "medalha"
  | "evento"
  | "premiacao"
  | "percurso";

export type Visibilidade = "publica" | "privada";

export type ImagemGaleria = {
  id: string;
  eventoId: string;
  categoria: CategoriaImagem;
  nome: string;
  tipo: TipoMidia; // "imagem" | "video" — registros antigos sem o campo são tratados como imagem
  url: string; // URL pública no Supabase Storage (ou data URL de registros antigos)
  visibilidade: Visibilidade;
  enviadoEm: string; // ISO datetime
};

export type NovosDadosGaleria = {
  nome: string;
  categoria: CategoriaImagem;
  tipo: TipoMidia; // "imagem" | "video"
  url: string; // URL pública retornada pelo Storage após o upload
  visibilidade: Visibilidade;
};

export type NovosArquivoGaleria = Omit<NovosDadosGaleria, "url"> & {
  arquivo: File;
};

export const CATEGORIA_LABEL: Record<CategoriaImagem, string> = {
  capa: "Capa",
  logo: "Logos",
  banner: "Banners",
  kit: "Kits",
  medalha: "Medalhas",
  evento: "Evento",
  premiacao: "Premiação",
  percurso: "Percurso",
};

export const CATEGORIAS_ORDENADAS: CategoriaImagem[] = [
  "capa",
  "logo",
  "banner",
  "medalha",
  "kit",
  "evento",
  "premiacao",
  "percurso",
];

type GaleriaContextValue = {
  imagens: ImagemGaleria[];
  pronto: boolean;
  erro: string | null;
  listarPorEvento: (eventoId: string) => ImagemGaleria[];
  listarPublicasPorEvento: (eventoId: string) => ImagemGaleria[];
  obterCapa: (eventoId: string) => ImagemGaleria | undefined;
  adicionar: (eventoId: string, dados: NovosArquivoGaleria) => Promise<ImagemGaleria>;
  atualizar: (
    id: string,
    dados: Partial<Pick<ImagemGaleria, "nome" | "categoria" | "visibilidade">>
  ) => void;
  excluir: (id: string) => Promise<void>;
};

const GaleriaContext = createContext<GaleriaContextValue | null>(null);

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function GaleriaProvider({ children }: { children: ReactNode }) {
  const {
    dados: imagens,
    setDados: setImagens,
    pronto,
    erro,
  } = usePersistencia<ImagemGaleria>(
    "app_galeria",
    [],
    { ordem: "id" }
  );

  const value = useMemo<GaleriaContextValue>(
    () => ({
      imagens,
      pronto,
      erro,
      listarPorEvento: (eventoId) => imagens.filter((i) => i.eventoId === eventoId),
      listarPublicasPorEvento: (eventoId) =>
        imagens.filter((i) => i.eventoId === eventoId && i.visibilidade === "publica"),
      obterCapa: (eventoId) =>
        imagens.find((i) => i.eventoId === eventoId && i.categoria === "capa" && i.visibilidade === "publica"),
      adicionar: async (eventoId, dados) => {
        const { url } = await enviarArquivoGaleria({
          arquivo: dados.arquivo,
          eventoId,
          categoria: dados.categoria,
          visibilidade: dados.visibilidade,
        });
        const nova: ImagemGaleria = {
          id: gerarId(),
          enviadoEm: new Date().toISOString(),
          eventoId,
          nome: dados.nome,
          categoria: dados.categoria,
          visibilidade: dados.visibilidade,
          tipo: dados.tipo,
          url,
        };
        setImagens((atual) => [nova, ...atual]);
        return nova;
      },
      atualizar: (id, dados) => {
        setImagens((atual) => atual.map((i) => (i.id === id ? { ...i, ...dados } : i)));
      },
      excluir: async (id) => {
        const alvo = imagens.find((i) => i.id === id);
        if (alvo) {
          await removerArquivoGaleria(alvo.url);
        }
        setImagens((atual) => atual.filter((i) => i.id !== id));
      },
    }),
    [imagens, pronto, erro]
  );

  return <GaleriaContext.Provider value={value}>{children}</GaleriaContext.Provider>;
}

export function useGaleria() {
  const ctx = useContext(GaleriaContext);
  if (!ctx) {
    throw new Error("useGaleria precisa ser usado dentro de <GaleriaProvider>");
  }
  return ctx;
}
