// Dados de participação de uma inscrição para o dorsal/credencial e para
// o leitor de QR Code da Organização.
//
// O objetivo é montar, a partir dos dados REAIS persistidos (inscrição,
// prova, modalidade, categoria, tipo de prova, dorsal e etapas), o
// resumo de participação de QUALQUER inscrição — individual ou em
// dupla/equipe/revezamento — sem nenhuma regra fixa por evento/prova.
//
// A resolução de percurso/etapa/distância por participante reutiliza o
// modelo de Relatórios Operacionais (lib/relatorios/modelo-relatorio.ts):
// provas individuais sem etapas configuradas derivam da Modalidade;
// duplas/equipes usam as etapas configuradas em app_prova_etapas.

import { nomeDaInscricao } from "@/lib/mock/inscricoes-utils";
import { normalizarNomePessoa } from "@/lib/utils/nomes";
import {
  etapasDaProva,
  formatarDistancia,
  integrantesPara,
  participantesDaInscricao,
  peitoDaInscricao,
  type CategoriaRel,
  type DorsalRel,
  type EtapaProvaRel,
  type EtapaResolvida,
  type InscricaoRel,
  type ModalidadeRel,
  type ProvaRel,
  type TipoProvaRel,
} from "@/lib/relatorios/modelo-relatorio";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ParticipanteParticipacao = {
  posicao: number;
  nome: string;
  funcao: string;
  percurso: string;
  distancia: string; // já formatada ("25 m", "3 km", "—")
};

export type DadosParticipacao =
  | {
      tipo: "individual";
      inscricaoId: string;
      // Nome do atleta (inscrição individual).
      nome: string;
      // Nome exibido em destaque (no individual é igual ao nome).
      nomeExibicao: string;
      categoria: string;
      modalidade: string;
      peito: { texto: string; numero: number | null };
      participanteUnico: ParticipanteParticipacao;
      participantes: ParticipanteParticipacao[];
    }
  | {
      tipo: "equipe";
      inscricaoId: string;
      // Nome da dupla/equipe = todos os participantes ("AYLA + JULIO").
      nome: string;
      nomeExibicao: string;
      categoria: string;
      modalidade: string;
      peito: { texto: string; numero: number | null };
      participantes: ParticipanteParticipacao[];
    };

export type EntradaParticipacao = {
  inscricao: InscricaoRel;
  prova?: ProvaRel;
  modalidade?: ModalidadeRel;
  categoria?: CategoriaRel;
  tipoProva?: TipoProvaRel;
  dorsal?: DorsalRel;
  etapas: EtapaProvaRel[];
};

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

/** Etapa resolvida do participante (primeira por posição, na ordem de exibição). */
function etapaDoParticipante(
  etapas: EtapaResolvida[],
  posicao: number
): EtapaResolvida | undefined {
  return etapas.find((e) => e.posicao === posicao);
}

/** Nome legível da equipe/inscrição, tolerando campos nulos do banco. */
function nomeExibicaoDaInscricao(inscricao: InscricaoRel): string {
  return nomeDaInscricao({
    atletaNome: inscricao.atletaNome,
    atletaNome2: inscricao.atletaNome2 ?? undefined,
    atletaNome3: inscricao.atletaNome3 ?? undefined,
    atletaNome4: inscricao.atletaNome4 ?? undefined,
  });
}

/**
 * Monta o resumo de participação de uma inscrição com os dados atuais:
 * dorsal, nome (atleta ou equipe), categoria, modalidade e, por
 * participante, função, percurso/etapa e distância.
 */
export function montarParticipacao({
  inscricao,
  prova,
  modalidade,
  categoria,
  tipoProva,
  dorsal,
  etapas,
}: EntradaParticipacao): DadosParticipacao {
  const equipe = (tipoProva ? integrantesPara(tipoProva) : 1) > 1;
  const participantes = participantesDaInscricao(inscricao, tipoProva);
  const etapasResolvidas = prova
    ? etapasDaProva(prova, etapas, modalidade)
    : [];

  const participar = (posicao: number): ParticipanteParticipacao => {
    const etapa = etapaDoParticipante(etapasResolvidas, posicao);
    return {
      posicao,
      nome: participantes[posicao - 1]?.nome ?? `Participante ${posicao}`,
      funcao: etapa?.funcao ?? "",
      percurso: etapa?.nome || "—",
      distancia: formatarDistancia(etapa?.distanciaMetros, etapa?.unidade),
    };
  };

  const comuns = {
    inscricaoId: inscricao.id,
    nomeExibicao: equipe ? normalizarNomePessoa(nomeExibicaoDaInscricao(inscricao)) : normalizarNomePessoa(inscricao.atletaNome),
    categoria: categoria?.nome ?? "—",
    modalidade: modalidade?.nome ?? "—",
    peito: peitoDaInscricao(inscricao, dorsal),
  };

  const participantesMontados = participantes.map((p) => participar(p.posicao));

  if (!equipe) {
    return {
      ...comuns,
      tipo: "individual",
      nome: normalizarNomePessoa(inscricao.atletaNome),
      participanteUnico: participantesMontados[0] ?? {
        posicao: 1,
        nome: normalizarNomePessoa(inscricao.atletaNome),
        funcao: "",
        percurso: "—",
        distancia: "—",
      },
      participantes: participantesMontados,
    };
  }

  return {
    ...comuns,
    tipo: "equipe",
    nome: nomeExibicaoDaInscricao(inscricao),
    participantes: participantesMontados,
  };
}

// ---------------------------------------------------------------------------
// Textos de exibição (legíveis nos impressos e no leitor)
// ---------------------------------------------------------------------------

const GENERICAS = new Set(["atleta", "participante", "participante 1", "participante 2", "participante 3", "participante 4"]);

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * A função complementa a linha quando é diferente do percurso e não é um
 * rótulo genérico ("Atleta", "Participante N").
 */
export function funcaoComplementa(p: Pick<ParticipanteParticipacao, "funcao" | "percurso">): boolean {
  const funcao = p.funcao.trim();
  const percurso = p.percurso.trim();
  if (!funcao) return false;
  if (GENERICAS.has(normalizar(funcao))) return false;
  if (percurso && normalizar(funcao) === normalizar(percurso)) return false;
  return true;
}

/**
 * Linha de um participante para cartões e leitor:
 *   "AYLA: Natação 25 m"
 *   "CARLOS: Nadador · Natação 25 m" (quando a função agrega informação)
 */
export function linhaParticipante(p: ParticipanteParticipacao): string {
  const partes: string[] = [];
  if (funcaoComplementa(p)) partes.push(p.funcao.trim());
  if (p.percurso && p.percurso !== "—") partes.push(p.percurso);
  let corpo = partes.length > 0 ? partes.join(" · ") : p.percurso;
  if (p.distancia && p.distancia !== "—") corpo = `${corpo} ${p.distancia}`;
  return `${normalizarNomePessoa(p.nome)}: ${corpo}`;
}

/** Percurso e distância de uma inscrição individual (ex.: "Corrida 3 km"). */
export function percursoIndividualTexto(p: ParticipanteParticipacao): string {
  const partes: string[] = [];
  if (p.percurso && p.percurso !== "—") partes.push(p.percurso);
  if (p.distancia && p.distancia !== "—") partes.push(p.distancia);
  return partes.length > 0 ? partes.join(" ") : "—";
}

/** Função de uma inscrição individual (ex.: "Atleta", "Nadador"). */
export function funcaoIndividualTexto(p: ParticipanteParticipacao): string {
  return p.funcao && !GENERICAS.has(normalizar(p.funcao)) ? p.funcao : "—";
}