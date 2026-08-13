"use client";

// Store temporário do módulo de Eventos, em memória (Context + useState).
// Mesmo padrão dos demais módulos: substituir por Server Actions + Prisma
// quando o backend real entrar.
//
// Mantém a mesma API pública (EventosProvider, useEventos, tipo Evento)
// da implementação anterior: criar/atualizar/excluir retornam Promise,
// então as telas que fazem escrita continuam usando await/.catch.
//
// Ciclo de vida do evento (status):
//   rascunho            → criado, ainda não visível aos atletas
//   em_espera           → informações liberadas para os atletas,
//                         mas inscrições ainda fechadas
//   inscricoes_abertas  → inscrições liberadas (até a data limite)
//   inscricoes_encerradas → inscrições fechadas (manual ou por data limite),
//                         evento ainda por acontecer
//   encerrado           → evento finalizado

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";
import { buscarOrganizacaoAtual } from "@/lib/supabase/usuario-organizacao";

export type EventoStatus =
  | "rascunho"
  | "em_espera"
  | "inscricoes_abertas"
  | "inscricoes_encerradas"
  | "encerrado";

export type Evento = {
  id: string;
  nome: string;
  descricao: string;
  data: string; // ISO date (yyyy-mm-dd)
  local: string; // nome do local / referência (ex: Espaço Longevida — Piscina Olímpica)
  status: EventoStatus;
  dataLimiteInscricoes: string; // ISO date (yyyy-mm-dd), vazio = sem limite
  vagas: number | null; // null = ilimitado
  logoUrl?: string; // logo do evento usada no dorsal (peito)
  // Endereço detalhado do evento (opcional — usado no mapa do Google).
  enderecoRua?: string;
  enderecoQuadra?: string;
  enderecoLote?: string;
  enderecoCep?: string;
  enderecoSetor?: string;
  enderecoCidade?: string;
  enderecoEstado?: string; // UF (ex: SP)
  // Organização dona do evento (uuid de `organizacoes`). Gravada APENAS
  // pelo store, a partir da organização real do usuário autenticado no
  // vínculo `organizacao_usuarios` — nunca vem do cliente. Eventos legados
  // (seed / pré-backfill) podem chegar sem este campo.
  organizacaoId?: string;
};

export const EVENTO_STATUS_LABEL: Record<EventoStatus, string> = {
  rascunho: "Rascunho",
  em_espera: "Em espera",
  inscricoes_abertas: "Inscrições abertas",
  inscricoes_encerradas: "Inscrições encerradas",
  encerrado: "Encerrado",
};

export const EVENTO_STATUS_STYLE: Record<EventoStatus, string> = {
  rascunho: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  em_espera: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  inscricoes_abertas: "bg-brand-green/10 text-brand-green",
  inscricoes_encerradas: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  encerrado: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Inscrições estão abertas? Considera status, data limite e lotação. */
export function inscricoesEstaoAbertas(evento: Evento, inscritos: number): boolean {
  if (evento.status !== "inscricoes_abertas") return false;
  if (evento.dataLimiteInscricoes && evento.dataLimiteInscricoes < hojeISO()) return false;
  if (evento.vagas != null && inscritos >= evento.vagas) return false;
  return true;
}

/** Inscrições foram encerradas pela passagem da data limite? */
export function inscricoesEncerradasPorData(evento: Evento): boolean {
  return !!evento.dataLimiteInscricoes && evento.dataLimiteInscricoes < hojeISO();
}

/** Dias restantes até a data limite de inscrições (null se não houver). */
export function diasParaDataLimite(evento: Evento): number | null {
  if (!evento.dataLimiteInscricoes) return null;
  const hoje = new Date(hojeISO() + "T00:00:00");
  const limite = new Date(evento.dataLimiteInscricoes + "T00:00:00");
  return Math.ceil((limite.getTime() - hoje.getTime()) / 86_400_000);
}

type EventosContextValue = {
  eventos: Evento[];
  carregando: boolean;
  erro: string | null;
  obterPorId: (id: string) => Evento | undefined;
  criar: (dados: Omit<Evento, "id" | "organizacaoId">) => Promise<Evento>;
  atualizar: (id: string, dados: Omit<Evento, "id" | "organizacaoId">) => Promise<void>;
  alterarStatus: (id: string, status: EventoStatus) => Promise<void>;
  definirLogo: (id: string, logoUrl: string) => Promise<void>;
  excluir: (id: string) => Promise<void>;
};

const EventosContext = createContext<EventosContextValue | null>(null);

// Eventos iniciais. Os IDs numéricos ("1", "2", "3") são referenciados
// pelos demais stores (provas, inscrições, faixas de numeração etc.).
const EVENTOS_INICIAIS: Evento[] = [
  {
    id: "1",
    nome: "Copa Longevida de Natação",
    descricao:
      "Etapa de abertura da temporada com provas de todas as modalidades.",
    data: "2026-09-20",
    local: "Espaço Longevida — Piscina Olímpica",
    status: "inscricoes_abertas",
    dataLimiteInscricoes: "2026-09-10",
    vagas: 100,
    enderecoRua: "Av. das Nações Unidas",
    enderecoQuadra: "12",
    enderecoLote: "8",
    enderecoSetor: "Central",
    enderecoCep: "04578-000",
    enderecoCidade: "São Paulo",
    enderecoEstado: "SP",
  },
  {
    id: "2",
    nome: "Travessia Aberta Longevida",
    descricao: "Travessia em águas abertas para todas as categorias.",
    data: "2026-10-18",
    local: "Represa do Guarapiranga",
    status: "em_espera",
    dataLimiteInscricoes: "2026-10-05",
    vagas: null,
    enderecoRua: "Estrada da Represa",
    enderecoSetor: "Parque",
    enderecoCep: "04914-000",
    enderecoCidade: "São Paulo",
    enderecoEstado: "SP",
  },
  {
    id: "3",
    nome: "Desafio Master 30+",
    descricao: "Evento exclusivo para atletas das categorias Master.",
    data: "2026-11-22",
    local: "Espaço Longevida — Piscina Olímpica",
    status: "rascunho",
    dataLimiteInscricoes: "",
    vagas: 50,
    enderecoRua: "Av. das Nações Unidas",
    enderecoQuadra: "12",
    enderecoLote: "8",
    enderecoSetor: "Central",
    enderecoCep: "04578-000",
    enderecoCidade: "São Paulo",
    enderecoEstado: "SP",
  },
];

/** Endereço do evento formatado a partir dos campos estruturados (vazio se não preenchido). */
export function enderecoFormatado(evento: Evento): string {
  const endereco = [
    [
      evento.enderecoRua,
      evento.enderecoQuadra ? `QD ${evento.enderecoQuadra}` : "",
      evento.enderecoLote ? `LT ${evento.enderecoLote}` : "",
    ]
      .filter(Boolean)
      .join(", "),
    evento.enderecoSetor ? `Setor ${evento.enderecoSetor}` : "",
    [evento.enderecoCidade, evento.enderecoEstado].filter(Boolean).join(" - "),
    evento.enderecoCep,
  ]
    .filter(Boolean)
    .join(", ");
  return endereco;
}

/** Texto usado na busca do mapa do Google (endereço ou o nome do local). */
export function enderecoParaMapa(evento: Evento): string {
  return enderecoFormatado(evento) || evento.local;
}

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function EventosProvider({ children }: { children: ReactNode }) {
  const { dados: eventos, setDados: setEventos } = usePersistencia<Evento>(
    "app_eventos",
    EVENTOS_INICIAIS,
    { ordem: "id" }
  );

  const value = useMemo<EventosContextValue>(
    () => ({
      eventos,
      carregando: false,
      erro: null,
      obterPorId: (id) => eventos.find((e) => e.id === id),
      criar: async (dados) => {
        // Organização REAL do usuário autenticado (vínculo
        // organizacao_usuarios). Nunca usa localStorage, seleção manual do
        // cliente ou valor fixo; um valor enviado pelo cliente é
        // ignorado/sobrescrito aqui.
        const organizacaoId = await buscarOrganizacaoAtual();
        if (!organizacaoId) {
          throw new Error(
            "Você não está vinculado a uma organização autorizada a criar eventos."
          );
        }
        const novo: Evento = { id: gerarId(), ...dados, organizacaoId };
        setEventos((atual) =>
          [...atual, novo].sort((a, b) => a.data.localeCompare(b.data))
        );
        return novo;
      },
      atualizar: async (id, dados) => {
        // Preserva a organização do evento: o cliente nunca pode trocar
        // organizacao_id para outra organização.
        setEventos((atual) =>
          atual.map((e) =>
            e.id === id ? { id, ...dados, organizacaoId: e.organizacaoId } : e
          )
        );
      },
      alterarStatus: async (id, status) => {
        setEventos((atual) =>
          atual.map((e) => (e.id === id ? { ...e, status } : e))
        );
      },
      definirLogo: async (id, logoUrl) => {
        setEventos((atual) =>
          atual.map((e) => (e.id === id ? { ...e, logoUrl } : e))
        );
      },
      excluir: async (id) => {
        setEventos((atual) => atual.filter((e) => e.id !== id));
      },
    }),
    [eventos]
  );

  return <EventosContext.Provider value={value}>{children}</EventosContext.Provider>;
}

export function useEventos() {
  const ctx = useContext(EventosContext);
  if (!ctx) {
    throw new Error("useEventos precisa ser usado dentro de <EventosProvider>");
  }
  return ctx;
}
