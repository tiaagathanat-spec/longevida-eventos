"use client";

// Store temporário do módulo Galeria, em memória (Context + useState).
// Mesmo padrão dos demais módulos: substituir por Server Actions +
// Supabase Storage quando o backend real entrar.
//
// ARMAZENAMENTO REAL (planejado): bucket `galeria` no Supabase Storage,
// organizado por evento e categoria:
//   galeria/{eventoId}/logos/...
//   galeria/{eventoId}/banners/...
//   galeria/{eventoId}/kits/...
//   galeria/{eventoId}/medalhas/...
//   galeria/{eventoId}/evento/...
//   galeria/{eventoId}/premiacao/...
//   galeria/{eventoId}/percurso/...
// O campo `url` abaixo guardaria a URL pública (ou assinada, se
// privada) retornada pelo Storage. Por enquanto, guardamos a imagem ou
// vídeo como data URL em memória (some ao recarregar a página), só para
// o fluxo de upload/visualização funcionar de ponta a ponta.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";
import { TipoMidia } from "@/lib/mock/galeria-midias";

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
  url: string; // data URL (mock) — vira URL do Supabase Storage no backend real
  visibilidade: Visibilidade;
  enviadoEm: string; // ISO datetime
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
  listarPorEvento: (eventoId: string) => ImagemGaleria[];
  listarPublicasPorEvento: (eventoId: string) => ImagemGaleria[];
  obterCapa: (eventoId: string) => ImagemGaleria | undefined;
  adicionar: (dados: Omit<ImagemGaleria, "id" | "enviadoEm">) => ImagemGaleria;
  atualizar: (
    id: string,
    dados: Partial<Pick<ImagemGaleria, "nome" | "categoria" | "visibilidade">>
  ) => void;
  excluir: (id: string) => void;
};

const GaleriaContext = createContext<GaleriaContextValue | null>(null);

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function GaleriaProvider({ children }: { children: ReactNode }) {
  const { dados: imagens, setDados: setImagens } = usePersistencia<ImagemGaleria>(
    "app_galeria",
    [],
    { ordem: "id" }
  );

  const value = useMemo<GaleriaContextValue>(
    () => ({
      imagens,
      listarPorEvento: (eventoId) => imagens.filter((i) => i.eventoId === eventoId),
      listarPublicasPorEvento: (eventoId) =>
        imagens.filter((i) => i.eventoId === eventoId && i.visibilidade === "publica"),
      obterCapa: (eventoId) =>
        imagens.find((i) => i.eventoId === eventoId && i.categoria === "capa" && i.visibilidade === "publica"),
      adicionar: (dados) => {
        const nova: ImagemGaleria = {
          id: gerarId(),
          enviadoEm: new Date().toISOString(),
          ...dados,
          tipo: dados.tipo ?? "imagem",
        };
        setImagens((atual) => [nova, ...atual]);
        return nova;
      },
      atualizar: (id, dados) => {
        setImagens((atual) => atual.map((i) => (i.id === id ? { ...i, ...dados } : i)));
      },
      excluir: (id) => {
        setImagens((atual) => atual.filter((i) => i.id !== id));
      },
    }),
    [imagens]
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
