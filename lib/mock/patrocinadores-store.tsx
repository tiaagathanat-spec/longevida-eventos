"use client";

// Store temporário do módulo de Patrocinadores, em memória (Context +
// useState). Mesmo padrão dos demais módulos: substituir por Server
// Actions + Prisma quando o backend real entrar.
//
// Corresponde às tabelas `patrocinadores` e `evento_patrocinadores` da
// modelagem de produção: um patrocinador tem uma cota (ouro/prata/
// bronze/apoio) e pode ser vinculado a vários eventos.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";

export type CotaPatrocinio = "ouro" | "prata" | "bronze" | "apoio";

export const COTA_LABEL: Record<CotaPatrocinio, string> = {
  ouro: "Ouro",
  prata: "Prata",
  bronze: "Bronze",
  apoio: "Apoio",
};

export type Patrocinador = {
  id: string;
  nome: string;
  siteUrl: string;
  descricao: string;
  cota: CotaPatrocinio;
  eventos: string[]; // ids dos eventos em que o patrocinador participa
};

type PatrocinadoresContextValue = {
  patrocinadores: Patrocinador[];
  pronto: boolean;
  erro: string | null;
  obterPorId: (id: string) => Patrocinador | undefined;
  criar: (dados: Omit<Patrocinador, "id">) => Patrocinador;
  atualizar: (id: string, dados: Omit<Patrocinador, "id">) => void;
  excluir: (id: string) => void;
  listarPorEvento: (eventoId: string) => Patrocinador[];
  adicionarEvento: (id: string, eventoId: string) => void;
  removerEvento: (id: string, eventoId: string) => void;
};

const PatrocinadoresContext = createContext<PatrocinadoresContextValue | null>(null);

const PATROCINADORES_INICIAIS: Patrocinador[] = [
  {
    id: "1",
    nome: "Supermercado Bom Preço",
    siteUrl: "https://exemplo.com/bompreco",
    descricao: "Patrocínio principal da temporada.",
    cota: "ouro",
    eventos: ["1", "2"],
  },
  {
    id: "2",
    nome: "Padaria do Vale",
    siteUrl: "https://exemplo.com/padaria",
    descricao: "Kit de alimentação dos atletas.",
    cota: "prata",
    eventos: ["1"],
  },
  {
    id: "3",
    nome: "Clínica Vita",
    siteUrl: "https://exemplo.com/clinicavita",
    descricao: "Avaliações médicas para os inscritos.",
    cota: "apoio",
    eventos: ["2"],
  },
];

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function PatrocinadoresProvider({ children }: { children: ReactNode }) {
  const {
    dados: patrocinadores,
    setDados: setPatrocinadores,
    pronto,
    erro,
  } = usePersistencia<Patrocinador>(
    "app_patrocinadores",
    PATROCINADORES_INICIAIS,
    { ordem: "id" }
  );

  const value = useMemo<PatrocinadoresContextValue>(
    () => ({
      patrocinadores,
      pronto,
      erro,
      obterPorId: (id) => patrocinadores.find((p) => p.id === id),
      criar: (dados) => {
        const novo: Patrocinador = { id: gerarId(), ...dados };
        setPatrocinadores((atual) => [...atual, novo]);
        return novo;
      },
      atualizar: (id, dados) => {
        setPatrocinadores((atual) =>
          atual.map((p) => (p.id === id ? { id, ...dados } : p))
        );
      },
      excluir: (id) => {
        setPatrocinadores((atual) => atual.filter((p) => p.id !== id));
      },
      listarPorEvento: (eventoId) =>
        patrocinadores.filter((p) => p.eventos.includes(eventoId)),
      adicionarEvento: (id, eventoId) => {
        setPatrocinadores((atual) =>
          atual.map((p) =>
            p.id === id && !p.eventos.includes(eventoId)
              ? { ...p, eventos: [...p.eventos, eventoId] }
              : p
          )
        );
      },
      removerEvento: (id, eventoId) => {
        setPatrocinadores((atual) =>
          atual.map((p) =>
            p.id === id ? { ...p, eventos: p.eventos.filter((e) => e !== eventoId) } : p
          )
        );
      },
    }),
    [patrocinadores, pronto, erro]
  );

  return (
    <PatrocinadoresContext.Provider value={value}>{children}</PatrocinadoresContext.Provider>
  );
}

export function usePatrocinadores() {
  const ctx = useContext(PatrocinadoresContext);
  if (!ctx) {
    throw new Error(
      "usePatrocinadores precisa ser usado dentro de <PatrocinadoresProvider>"
    );
  }
  return ctx;
}
