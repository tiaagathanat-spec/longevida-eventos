// Utilitários puros para computação de dados de inscrições.
// Usados na página admin/inscricoes e em relatórios/QR Code.

import type { Inscricao } from "@/lib/mock/inscricoes-store";
import type { Prova } from "@/lib/mock/provas-store";
import type { Modalidade } from "@/lib/mock/modalidades-store";
import type { Categoria } from "@/lib/mock/categorias-store";
import type { TipoProva } from "@/lib/mock/tipos-prova-store";
import type { Dorsal } from "@/lib/mock/dorsais-store";
import type { Atleta } from "@/lib/mock/atletas-store";
import type { InscricaoQrCode } from "@/lib/mock/qrcodes-store";
import type { Pagamento } from "@/lib/mock/pagamentos-store";
import { calcularIdadeNaData } from "@/lib/idade";

export type InscricaoComputada = Inscricao & {
  prova?: ProvaCompleta;
  dorsal?: DorsalCompleto;
  qrCode?: InscricaoQrCode;
  pagamento?: Pagamento;
  participantes: ParticipanteComputado[];
  idadePrincipal: number | null;
  tipoInscricao: "individual" | "dupla" | "equipe";
};

export type ProvaCompleta = Prova & {
  modalidade?: Modalidade;
  categoria?: Categoria;
  tipoProva?: TipoProva;
};

export type DorsalCompleto = Dorsal & {
  numeroFormatado: string;
};

export type ParticipanteComputado = {
  posicao: number;
  nome: string;
  idade: number | null;
  funcao: string;
  percurso: string;
  distancia: string;
  distanciaMetros: number | null;
};

export type ResumoInscricoes = {
  totalInscricoes: number;
  totalParticipantes: number;
  individuais: number;
  duplas: number;
  equipes: number;
  confirmadas: number;
  pendentes: number;
  canceladas: number;
  pagamentosConfirmados: number;
  pagamentosPendentes: number;
};

/**
 * Calcula a idade de um atleta na data de referência.
 */
export function calcularIdadeAtleta(
  dataNascimento: string | undefined,
  dataReferencia: string
): number | null {
  if (!dataNascimento || !dataReferencia) return null;
  return calcularIdadeNaData(dataNascimento, dataReferencia);
}

/**
 * Busca atleta pelo nome (case-insensitive, ignora acentos).
 */
export function buscarAtletaPorNome(nome: string, atletas: Atleta[]): Atleta | undefined {
  if (!nome) return undefined;
  const normalizado = nome
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return atletas.find((a) => {
    const n = a.nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return n === normalizado;
  });
}

/**
 * Formata distância em metros para string legível.
 */
export function formatarDistanciaMetros(metros: number | null | undefined): string {
  if (metros == null || Number.isNaN(metros) || metros <= 0) return "—";
  if (metros >= 1000) {
    const km = metros / 1000;
    return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1).replace(".", ",")} km`;
  }
  return `${metros} m`;
}

/**
 * Constrói a prova completa com modalidade, categoria e tipo de prova.
 */
export function montarProvaCompleta(
  prova: Prova,
  modalidades: Modalidade[],
  categorias: Categoria[],
  tiposProva: TipoProva[]
): ProvaCompleta {
  return {
    ...prova,
    modalidade: modalidades.find((m) => m.id === prova.modalidadeId),
    categoria: categorias.find((c) => c.id === prova.categoriaId),
    tipoProva: tiposProva.find((t) => t.id === prova.tipoProvaId),
  };
}

/**
 * Determina o tipo de inscrição baseado no tipo de prova.
 */
export function determinarTipoInscricao(tipoProva?: TipoProva): "individual" | "dupla" | "equipe" {
  if (!tipoProva) return "individual";
  const n = tipoProva.integrantes ?? 1;
  if (n === 1) return "individual";
  if (n === 2) return "dupla";
  return "equipe";
}

/**
 * Obtém os participantes de uma inscrição com seus detalhes computados.
 * Para provas individuais: apenas o atleta principal.
 * Para duplas/equipes: todos os atletasNome + percurso/função de cada posição.
 */
export function obterParticipantesComputados(
  inscricao: Inscricao,
  provaCompleta: ProvaCompleta,
  atletas: Atleta[],
  dataReferencia: string
): ParticipanteComputado[] {
  const tipoInscricao = determinarTipoInscricao(provaCompleta.tipoProva);
  const modalidade = provaCompleta.modalidade;

  // Para provas individuais, usa a modalidade como percurso
  if (tipoInscricao === "individual") {
    const idade = buscarAtletaPorNome(inscricao.atletaNome, atletas)
      ? calcularIdadeAtleta(
          buscarAtletaPorNome(inscricao.atletaNome, atletas)!.dataNascimento,
          dataReferencia
        )
      : null;

    return [
      {
        posicao: 1,
        nome: inscricao.atletaNome,
        idade,
        funcao: "Atleta",
        percurso: modalidade?.nome ?? "—",
        distancia: formatarDistanciaMetros(modalidade?.distanciaMetros ?? null),
        distanciaMetros: modalidade?.distanciaMetros ?? null,
      },
    ];
  }

  // Para equipes, usa a configuração de etapas da prova se disponível
  // Por enquanto, usa a modalidade como base e distribui
  // TODO: integrar com app_prova_etapas quando disponível no store
  const nomes = [
    inscricao.atletaNome,
    inscricao.atletaNome2,
    inscricao.atletaNome3,
    inscricao.atletaNome4,
  ].filter((n): n is string => !!n?.trim());

  return nomes.map((nome, idx) => {
    const idade = buscarAtletaPorNome(nome, atletas)
      ? calcularIdadeAtleta(
          buscarAtletaPorNome(nome, atletas)!.dataNascimento,
          dataReferencia
        )
      : null;
    return {
      posicao: idx + 1,
      nome,
      idade,
      funcao: idx === 0 ? "Titular" : `Participante ${idx + 1}`,
      percurso: modalidade?.nome ?? "—",
      distancia: formatarDistanciaMetros(modalidade?.distanciaMetros ?? null),
      distanciaMetros: modalidade?.distanciaMetros ?? null,
    };
  });
}

/**
 * Computa a inscrição completa com todos os dados relacionados.
 */
export function computarInscricaoCompleta(
  inscricao: Inscricao,
  dados: {
    provas: Prova[];
    modalidades: Modalidade[];
    categorias: Categoria[];
    tiposProva: TipoProva[];
    atletas: Atleta[];
    dorsais: Dorsal[];
    qrCodes: InscricaoQrCode[];
    pagamentos: Pagamento[];
    eventos: { id: string; data: string }[];
  }
): InscricaoComputada {
  const prova = dados.provas.find((p) => p.id === inscricao.provaId);
  const provaCompleta = prova
    ? montarProvaCompleta(prova, dados.modalidades, dados.categorias, dados.tiposProva)
    : undefined;

  // Busca a data do evento para cálculo de idade
  const evento = provaCompleta
    ? dados.eventos.find((e) => e.id === provaCompleta.eventoId)
    : undefined;
  const dataEvento = evento?.data ?? new Date().toISOString().slice(0, 10);

  const dorsal = dados.dorsais.find((d) => d.inscricaoId === inscricao.id);
  const qrCode = dados.qrCodes.find((q) => q.inscricaoId === inscricao.id);
  const pagamento = dados.pagamentos.find((p) => p.inscricaoId === inscricao.id);

  const participantes = provaCompleta
    ? obterParticipantesComputados(inscricao, provaCompleta, dados.atletas, dataEvento)
    : [];

  const idadePrincipal = participantes[0]?.idade ?? null;

  return {
    ...inscricao,
    prova: provaCompleta,
    dorsal: dorsal
      ? {
          ...dorsal,
          numeroFormatado: String(dorsal.numero),
        }
      : undefined,
    qrCode,
    pagamento,
    participantes,
    idadePrincipal,
    tipoInscricao: determinarTipoInscricao(provaCompleta?.tipoProva),
  };
}

/**
 * Calcula o resumo estatístico das inscrições filtradas.
 */
export function calcularResumoInscricoes(
  inscricoes: InscricaoComputada[]
): ResumoInscricoes {
  let totalParticipantes = 0;
  let individuais = 0;
  let duplas = 0;
  let equipes = 0;
  let confirmadas = 0;
  let pendentes = 0;
  let canceladas = 0;
  let pagamentosConfirmados = 0;
  let pagamentosPendentes = 0;

  for (const insc of inscricoes) {
    totalParticipantes += insc.participantes.length;

    switch (insc.tipoInscricao) {
      case "individual":
        individuais++;
        break;
      case "dupla":
        duplas++;
        break;
      case "equipe":
        equipes++;
        break;
    }

    switch (insc.status) {
      case "confirmada":
        confirmadas++;
        break;
      case "pendente":
        pendentes++;
        break;
      case "cancelada":
        canceladas++;
        break;
    }

    if (insc.pagamento) {
      if (insc.pagamento.status === "pago") pagamentosConfirmados++;
      else if (insc.pagamento.status === "pendente") pagamentosPendentes++;
    } else {
      // Sem registro de pagamento
      if (insc.status === "confirmada") pagamentosConfirmados++;
      else if (insc.status === "pendente") pagamentosPendentes++;
    }
  }

  return {
    totalInscricoes: inscricoes.length,
    totalParticipantes,
    individuais,
    duplas,
    equipes,
    confirmadas,
    pendentes,
    canceladas,
    pagamentosConfirmados,
    pagamentosPendentes,
  };
}