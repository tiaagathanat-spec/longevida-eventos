// Módulo Relatórios Operacionais — modelo puro (sem React/Next).
//
// Constrói relatórios operacionais de inscrições/atletas/equipes para
// QUALQUER evento e QUALQUER prova cadastrados, a partir dos dados
// reais persistidos (payload fornecido pela API /api/admin/relatorios/
// dados, que lê as tabelas app_* com service_role).
//
// É 100% dinâmico:
//   * Provas individuais sem etapas configuradas derivam percurso e
//     distância da Modalidade da prova.
//   * Duplas/equipes são UMA inscrição com N participantes: cada
//     participante tem função, percurso/etapa, distância e idade
//     (configuração de etapas em app_prova_etapas — migration 0022).
//   * As colunas são montadas conforme os dados, sem regra fixa por
//     evento/prova.

import { calcularIdadeNaData } from "../idade";
import { normalizarNomePessoa } from "../utils/nomes";

// ---------------------------------------------------------------------------
// Tipos dos dados crus (formato do payload da API)
// ---------------------------------------------------------------------------

export type EventoRel = {
  id: string;
  nome: string;
  data: string;
  status: string;
  local: string;
};

export type ProvaRel = {
  id: string;
  eventoId: string;
  modalidadeId: string;
  categoriaId: string;
  tipoProvaId: string;
  horario: string;
  valor: number;
  tipoIdentificacao?: string;
  situacao?: string;
};

export type CategoriaRel = {
  id: string;
  nome: string;
  idadeMinima: number | null;
  idadeMaxima: number | null;
};

export type ModalidadeRel = {
  id: string;
  nome: string;
  distanciaMetros: number | null;
};

export type TipoProvaRel = {
  id: string;
  nome: string;
  permiteEquipe: boolean;
  integrantes: number;
};

export type InscricaoRel = {
  id: string;
  eventoId: string;
  provaId: string;
  atletaNome: string;
  atletaNome2?: string | null;
  atletaNome3?: string | null;
  atletaNome4?: string | null;
  status: string;
  dataInscricao: string;
  numeroPeito?: string | null;
};

export type AtletaRel = {
  id: string;
  nome: string;
  dataNascimento: string;
  categoriaId: string;
  responsavelNome: string;
  email: string;
  telefone: string;
};

export type DorsalRel = {
  id: string;
  inscricaoId: string;
  numero: number;
  checkInFeito: boolean;
  kitEntregue: boolean;
  medalhaEntregue: boolean;
  alimentacaoEntregue: boolean;
};

export type PagamentoRel = {
  inscricaoId: string;
  valor: number | null;
  formaPagamento: string | null;
  status: string;
  dataPagamento: string | null;
  /** Formas múltiplas da transação (cada uma com seu valor). */
  itens?: { forma: string; valor: number }[];
  observacao?: string;
  clienteId?: string;
};

export type EtapaProvaRel = {
  id: string;
  provaId: string;
  posicao: number;
  funcao: string;
  nome: string;
  ordem: number;
  distanciaMetros: number | null;
  unidade: string;
  descricao: string;
};

export type DadosRelatorio = {
  eventos: EventoRel[];
  provas: ProvaRel[];
  categorias: CategoriaRel[];
  modalidades: ModalidadeRel[];
  tiposProva: TipoProvaRel[];
  inscricoes: InscricaoRel[];
  atletas: AtletaRel[];
  dorsais: DorsalRel[];
  pagamentos: PagamentoRel[];
  etapas: EtapaProvaRel[];
};

export type FiltrosRelatorio = {
  eventoId: string;
  provaId?: string; // '' ou ausente = todas as provas do evento
  categoriaId?: string; // '' ou ausente = todas
  modalidadeId?: string; // '' ou ausente = todas
  tipoInscricao?: "todas" | "individual" | "equipe";
  situacaoInscricao?: "todas" | "pendente" | "confirmada" | "cancelada";
  situacaoPagamento?:
    | "todas"
    | "pago"
    | "pendente"
    | "cancelado"
    | "sem_registro";
};

// ---------------------------------------------------------------------------
// Rótulos
// ---------------------------------------------------------------------------

export const SITUACAO_INSCRICAO_LABEL: Record<string, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

export const PAGAMENTO_LABEL: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

export const SEM_REGISTRO = "Sem registro";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function eInscricaoEquipe(
  inscricao: InscricaoRel,
  tipo?: TipoProvaRel
): boolean {
  const n = tipo?.integrantes ?? 1;
  return n > 1;
}

export function integrantesPara(tipo?: TipoProvaRel): number {
  const n = tipo?.integrantes ?? 0;
  return n >= 1 ? n : 1;
}

export function normalizarNome(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Participantes de uma inscrição, na ordem das posições (1..N). */
export function participantesDaInscricao(
  inscricao: InscricaoRel,
  tipo?: TipoProvaRel
): { posicao: number; nome: string }[] {
  const n = integrantesPara(tipo);
  const nomes = [
    inscricao.atletaNome,
    inscricao.atletaNome2,
    inscricao.atletaNome3,
    inscricao.atletaNome4,
  ];
  return Array.from({ length: n }, (_, i) => ({
    posicao: i + 1,
    nome: (nomes[i] ?? "").trim() || `Participante ${i + 1}`,
  }));
}

export function idadeDoParticipante(
  nome: string,
  atletas: AtletaRel[],
  dataReferencia: string
): number | null {
  if (!nome || !dataReferencia) return null;
  const chave = normalizarNome(nome);
  const atleta = atletas.find((a) => normalizarNome(a.nome) === chave);
  if (!atleta?.dataNascimento) return null;
  return calcularIdadeNaData(atleta.dataNascimento, dataReferencia);
}

/** Etapa resolvida de um participante ("o que ele faz" na prova). */
export type EtapaResolvida = {
  posicao: number;
  funcao: string;
  nome: string;
  ordem: number;
  distanciaMetros: number | null;
  unidade: string;
};

/**
 * Etapas de uma prova. Se a prova tem etapas configuradas (dupla/equipe),
 * usa a configuração; senão (individual) deriva da Modalidade.
 */
export function etapasDaProva(
  prova: ProvaRel,
  etapasConfig: EtapaProvaRel[],
  modalidade?: ModalidadeRel
): EtapaResolvida[] {
  const configuradas = etapasConfig
    .filter((e) => e.provaId === prova.id)
    .sort((a, b) => a.ordem - b.ordem || a.posicao - b.posicao);
  if (configuradas.length > 0) {
    return configuradas.map((e) => ({
      posicao: e.posicao,
      funcao: e.funcao || `Participante ${e.posicao}`,
      nome: e.nome || "Etapa",
      ordem: e.ordem,
      distanciaMetros: e.distanciaMetros,
      unidade: e.unidade || "m",
    }));
  }
  return [
    {
      posicao: 1,
      funcao: "Atleta",
      nome: modalidade?.nome || "Etapa única",
      ordem: 0,
      distanciaMetros: modalidade?.distanciaMetros ?? null,
      unidade: "m",
    },
  ];
}

export function formatarDistancia(
  metros: number | null | undefined,
  unidade = "m"
): string {
  if (metros == null || Number.isNaN(metros) || metros <= 0) return "—";
  if (unidade === "km") {
    const km = metros / 1000;
    const texto = Number.isInteger(km)
      ? String(km)
      : km.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    return `${texto} km`;
  }
  const n = Number.isInteger(metros) ? String(metros) : metros.toFixed(2);
  return `${n} m`;
}

export function peitoDaInscricao(
  inscricao: InscricaoRel,
  dorsal?: DorsalRel
): { texto: string; numero: number | null } {
  if (dorsal) {
    return { texto: String(dorsal.numero), numero: dorsal.numero };
  }
  const textoPeito = inscricao.numeroPeito?.trim();
  if (textoPeito) {
    const n = Number.parseInt(textoPeito, 10);
    return {
      texto: textoPeito,
      numero: Number.isNaN(n) ? null : n,
    };
  }
  return { texto: "—", numero: null };
}

// ---------------------------------------------------------------------------
// Montagem do relatório
// ---------------------------------------------------------------------------

export type RelatorioMontado = {
  colunas: string[];
  linhas: Record<string, string>[];
  participantesTotal: number;
};

export function montarRelatorio(
  dados: DadosRelatorio,
  filtros: FiltrosRelatorio
): RelatorioMontado {
  const evento = dados.eventos.find((e) => e.id === filtros.eventoId);
  const dataReferencia = evento?.data ?? "";

  let provasEv = dados.provas.filter((p) => p.eventoId === filtros.eventoId);
  if (filtros.provaId) {
    provasEv = provasEv.filter((p) => p.id === filtros.provaId);
  }
  const idsProvasEv = new Set(provasEv.map((p) => p.id));

  const inscricoesEv = dados.inscricoes.filter(
    (i) =>
      i.eventoId === filtros.eventoId &&
      (!filtros.provaId || idsProvasEv.has(i.provaId))
  );

  const dorsalPorInscricao = new Map(
    dados.dorsais.map((d) => [d.inscricaoId, d])
  );
  const pagamentoPorInscricao = new Map(
    dados.pagamentos.map((p) => [p.inscricaoId, p])
  );
  const modalidadePorId = new Map(
    dados.modalidades.map((m) => [m.id, m])
  );
  const categoriaPorId = new Map(
    dados.categorias.map((c) => [c.id, c])
  );
  const tipoPorId = new Map(dados.tiposProva.map((t) => [t.id, t]));

  const inscricoesFiltradas = inscricoesEv.filter((inscricao) => {
    const prova = dados.provas.find((p) => p.id === inscricao.provaId);
    const categoriaOk =
      !filtros.categoriaId || prova?.categoriaId === filtros.categoriaId;
    const modalidadeOk =
      !filtros.modalidadeId || prova?.modalidadeId === filtros.modalidadeId;
    const tipoProva = prova ? tipoPorId.get(prova.tipoProvaId) : undefined;
    const equipe = eInscricaoEquipe(inscricao, tipoProva);
    const tipoOk =
      !filtros.tipoInscricao ||
      filtros.tipoInscricao === "todas" ||
      (filtros.tipoInscricao === "equipe" && equipe) ||
      (filtros.tipoInscricao === "individual" && !equipe);
    const situacaoOk =
      !filtros.situacaoInscricao ||
      filtros.situacaoInscricao === "todas" ||
      inscricao.status === filtros.situacaoInscricao;
    const pg = pagamentoPorInscricao.get(inscricao.id);
    let pagamentoOk = true;
    if (
      filtros.situacaoPagamento &&
      filtros.situacaoPagamento !== "todas"
    ) {
      if (filtros.situacaoPagamento === "sem_registro") {
        pagamentoOk = !pg;
      } else {
        pagamentoOk = pg?.status === filtros.situacaoPagamento;
      }
    }
    return (
      categoriaOk &&
      modalidadeOk &&
      tipoOk &&
      situacaoOk &&
      pagamentoOk
    );
  });

  const linhas: Record<string, string>[] = [];
  let participantesTotal = 0;

  for (const inscricao of inscricoesFiltradas) {
    const prova = dados.provas.find((p) => p.id === inscricao.provaId);
    const tipoProva = prova
      ? tipoPorId.get(prova.tipoProvaId)
      : undefined;
    const modalidade = prova
      ? modalidadePorId.get(prova.modalidadeId)
      : undefined;
    const dorsal = dorsalPorInscricao.get(inscricao.id);
    const pagamento = pagamentoPorInscricao.get(inscricao.id);
    const equipe = eInscricaoEquipe(inscricao, tipoProva);
    const participantes = participantesDaInscricao(inscricao, tipoProva);
    const etapas = etapaPorPosicao(
      prova
        ? etapasDaProva(prova, dados.etapas, modalidade)
        : []
    );

    const linha: Record<string, string> = {};
    const peito = peitoDaInscricao(inscricao, dorsal);
    linha["Nº de peito"] = peito.texto;
    linha["Categoria"] = prova
      ? categoriaPorId.get(prova.categoriaId)?.nome ?? "—"
      : "—";
    linha["Modalidade"] = modalidade?.nome ?? "—";
    linha["Tipo de inscrição"] = equipe
      ? `Equipe (${participantes.length})`
      : "Individual";

    if (!equipe) {
      const etapa = etapas.get(1) as EtapaResolvida | undefined;
      const idade = idadeDoParticipante(
        inscricao.atletaNome,
        dados.atletas,
        dataReferencia
      );
      linha["Nome"] = normalizarNomePessoa(inscricao.atletaNome);
      linha["Idade"] = idade != null ? String(idade) : "—";
      linha["Percurso/Etapa"] = etapa?.nome ?? "—";
      linha["Função"] = etapa?.funcao ?? "—";
      linha["Distância"] = formatarDistancia(etapa?.distanciaMetros, etapa?.unidade);
      participantesTotal += 1;
    } else {
      linha["Participantes"] = participantes
        .map((p) => normalizarNomePessoa(p.nome))
        .join(" + ");
      const somasDistancia: number[] = [];
      for (const p of participantes) {
        const etapa = etapas.get(p.posicao);
        const idade = idadeDoParticipante(
          p.nome,
          dados.atletas,
          dataReferencia
        );
        linha[`Participante ${p.posicao}`] = normalizarNomePessoa(p.nome);
        linha[`Função ${p.posicao}`] = etapa?.funcao ?? "—";
        linha[`Idade ${p.posicao}`] = idade != null ? String(idade) : "—";
        linha[`Percurso ${p.posicao}`] = etapa?.nome ?? "—";
        linha[`Distância ${p.posicao}`] = formatarDistancia(
          etapa?.distanciaMetros,
          etapa?.unidade
        );
        if (etapa?.distanciaMetros && etapa.distanciaMetros > 0) {
          somasDistancia.push(etapa.distanciaMetros);
        }
        participantesTotal += 1;
      }
      linha["Distância total (equipe)"] =
        somasDistancia.length > 0
          ? formatarDistancia(
              somasDistancia.reduce((a, b) => a + b, 0),
              "m"
            )
          : "—";
    }

    linha["Situação"] =
      SITUACAO_INSCRICAO_LABEL[inscricao.status] ?? inscricao.status;
    linha["Pagamento"] = pagamento
      ? PAGAMENTO_LABEL[pagamento.status] ?? pagamento.status
      : SEM_REGISTRO;

    linhas.push(linha);
  }

  // Ordenação por peito (numérico) e depois por nome.
  const peitoNumero = (linha: Record<string, string>) => {
    const texto = linha["Nº de peito"] ?? "";
    const n = Number.parseInt(texto, 10);
    return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
  };
  linhas.sort(
    (a, b) =>
      peitoNumero(a) - peitoNumero(b) ||
      (a["Nome"] ?? "").localeCompare(b["Nome"] ?? "", "pt-BR") ||
      (a["Participantes"] ?? "").localeCompare(b["Participantes"] ?? "", "pt-BR")
  );

  const colunas = colunasDasLinhas(linhas);
  return { colunas, linhas, participantesTotal };
}

function etapaPorPosicao(etapas: EtapaResolvida[]): Map<number, EtapaResolvida> {
  const mapa = new Map<number, EtapaResolvida>();
  for (const e of etapas) {
    if (!mapa.has(e.posicao) || e.ordem < (mapa.get(e.posicao)?.ordem ?? 0)) {
      mapa.set(e.posicao, e);
    }
  }
  return mapa;
}

function colunasDasLinhas(linhas: Record<string, string>[]): string[] {
  const usado = (coluna: string) => linhas.some((l) => coluna in l);

  // Maior número de participantes em uma linha (tamanho das duplas/equipes).
  let maxParticipantes = 0;
  for (const linha of linhas) {
    let n = 0;
    while (linha[`Participante ${n + 1}`] !== undefined) n += 1;
    if (n > maxParticipantes) maxParticipantes = n;
  }

  const ordem: string[] = ["Nº de peito"];
  const pushSeUsado = (...colunas: string[]) => {
    for (const coluna of colunas) {
      if (usado(coluna)) ordem.push(coluna);
    }
  };

  // Colunas de prova individual.
  pushSeUsado("Nome", "Idade", "Percurso/Etapa", "Função", "Distância");

  // Colunas de dupla/equipe (dinâmicas por participante).
  pushSeUsado("Participantes");
  for (let n = 1; n <= maxParticipantes; n++) {
    pushSeUsado(
      `Participante ${n}`,
      `Função ${n}`,
      `Idade ${n}`,
      `Percurso ${n}`,
      `Distância ${n}`
    );
  }
  pushSeUsado("Distância total (equipe)");

  pushSeUsado("Categoria", "Modalidade", "Tipo de inscrição", "Situação", "Pagamento");
  return ordem;
}

// ---------------------------------------------------------------------------
// Totalizações automáticas
// ---------------------------------------------------------------------------

export type ResumoRelatorio = {
  inscricoes: number;
  participantes: number;
  distribuicao: {
    situacao: [string, number][];
    pagamento: [string, number][];
    tipoInscricao: [string, number][];
    categoria: [string, number][];
    modalidade: [string, number][];
    percurso: [string, number][];
    funcao: [string, number][];
  };
  distancia: {
    totalMetros: number | null;
    porEtapa: [string, number][];
  };
};

export function contar(mapa: Map<string, number>): [string, number][] {
  return [...mapa.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")
  );
}

export function montarResumo(
  dados: DadosRelatorio,
  filtros: FiltrosRelatorio,
  montado: RelatorioMontado
): ResumoRelatorio {
  const evento = dados.eventos.find((e) => e.id === filtros.eventoId);
  const dataReferencia = evento?.data ?? "";

  const provasEv = filtros.provaId
    ? dados.provas.filter(
        (p) => p.eventoId === filtros.eventoId && p.id === filtros.provaId
      )
    : dados.provas.filter((p) => p.eventoId === filtros.eventoId);
  const idsProvasEv = new Set(provasEv.map((p) => p.id));
  const inscricoesEv = dados.inscricoes.filter(
    (i) =>
      i.eventoId === filtros.eventoId &&
      (!filtros.provaId || idsProvasEv.has(i.provaId))
  );

  const pagamentoPorInscricao = new Map(
    dados.pagamentos.map((p) => [p.inscricaoId, p])
  );
  const categoriaPorId = new Map(dados.categorias.map((c) => [c.id, c.nome]));
  const modalidadePorId = new Map(dados.modalidades.map((m) => [m.id, m.nome]));
  const tipoPorId = new Map(dados.tiposProva.map((t) => [t.id, t]));

  const inscricoesFiltradas = inscricoesEv.filter((i) => {
    const prova = dados.provas.find((p) => p.id === i.provaId);
    const categoriaOk =
      !filtros.categoriaId || prova?.categoriaId === filtros.categoriaId;
    const modalidadeOk =
      !filtros.modalidadeId || prova?.modalidadeId === filtros.modalidadeId;
    const tipoProva = prova ? tipoPorId.get(prova.tipoProvaId) : undefined;
    const equipe = eInscricaoEquipe(i, tipoProva);
    const tipoOk =
      !filtros.tipoInscricao ||
      filtros.tipoInscricao === "todas" ||
      (filtros.tipoInscricao === "equipe" && equipe) ||
      (filtros.tipoInscricao === "individual" && !equipe);
    const situacaoOk =
      !filtros.situacaoInscricao ||
      filtros.situacaoInscricao === "todas" ||
      i.status === filtros.situacaoInscricao;
    const pg = pagamentoPorInscricao.get(i.id);
    let pagamentoOk = true;
    if (filtros.situacaoPagamento && filtros.situacaoPagamento !== "todas") {
      pagamentoOk =
        filtros.situacaoPagamento === "sem_registro"
          ? !pg
          : pg?.status === filtros.situacaoPagamento;
    }
    return categoriaOk && modalidadeOk && tipoOk && situacaoOk && pagamentoOk;
  });

  const conta = new Map<string, number>();
  const contaPag = new Map<string, number>();
  const contaTipo = new Map<string, number>();
  const contaCat = new Map<string, number>();
  const contaMod = new Map<string, number>();
  const contaPercurso = new Map<string, number>();
  const contaFuncao = new Map<string, number>();
  const somaEtapa = new Map<string, number>();
  let totalMetros = 0;
  let haDistancia = false;

  for (const inscricao of inscricoesFiltradas) {
    const rotuloSituacao = SITUACAO_INSCRICAO_LABEL[inscricao.status] ?? inscricao.status;
    conta.set(rotuloSituacao, (conta.get(rotuloSituacao) ?? 0) + 1);
    const pg = pagamentoPorInscricao.get(inscricao.id);
    const rotuloPagamento = pg
      ? PAGAMENTO_LABEL[pg.status] ?? pg.status
      : SEM_REGISTRO;
    contaPag.set(rotuloPagamento, (contaPag.get(rotuloPagamento) ?? 0) + 1);

    const prova = dados.provas.find((p) => p.id === inscricao.provaId);
    const tipoProva = prova ? tipoPorId.get(prova.tipoProvaId) : undefined;
    const equipe = eInscricaoEquipe(inscricao, tipoProva);
    contaTipo.set(
      equipe ? "Equipe" : "Individual",
      (contaTipo.get(equipe ? "Equipe" : "Individual") ?? 0) + 1
    );

    const nomeCat = prova ? categoriaPorId.get(prova.categoriaId) : undefined;
    contaCat.set(nomeCat ?? "Sem categoria", (contaCat.get(nomeCat ?? "Sem categoria") ?? 0) + 1);
    const nomeMod =
      prova && modalidadePorId.has(prova.modalidadeId)
        ? modalidadePorId.get(prova.modalidadeId)!
        : "Sem modalidade";
    contaMod.set(nomeMod, (contaMod.get(nomeMod) ?? 0) + 1);

    const participantes = participantesDaInscricao(inscricao, tipoProva);
    const modalidade = prova
      ? dados.modalidades.find((m) => m.id === prova.modalidadeId)
      : undefined;
    const etapas = etapaPorPosicao(
      prova ? etapasDaProva(prova, dados.etapas, modalidade) : []
    );
    for (const p of participantes) {
      const etapa = etapas.get(p.posicao);
      const percurso = etapa?.nome ?? "Sem percurso";
      contaPercurso.set(percurso, (contaPercurso.get(percurso) ?? 0) + 1);
      const funcao = etapa?.funcao ?? (equipe ? `Participante ${p.posicao}` : "Atleta");
      contaFuncao.set(funcao, (contaFuncao.get(funcao) ?? 0) + 1);
      if (etapa?.distanciaMetros && etapa.distanciaMetros > 0) {
        haDistancia = true;
        totalMetros += etapa.distanciaMetros;
        somaEtapa.set(
          percurso,
          (somaEtapa.get(percurso) ?? 0) + etapa.distanciaMetros
        );
      }
    }
  }

  return {
    inscricoes: inscricoesFiltradas.length,
    participantes: montado.participantesTotal,
    distribuicao: {
      situacao: contar(conta),
      pagamento: contar(contaPag),
      tipoInscricao: contar(contaTipo),
      categoria: contar(contaCat),
      modalidade: contar(contaMod),
      percurso: contar(contaPercurso),
      funcao: contar(contaFuncao),
    },
    distancia: {
      totalMetros: haDistancia ? totalMetros : null,
      porEtapa: [...somaEtapa.entries()].sort((a, b) => b[1] - a[1]),
    },
  };
}

// ---------------------------------------------------------------------------
// Exportações de arquivo (CSV)
// ---------------------------------------------------------------------------

function escaparCSVCampo(valor: string, separador: string): string {
  if (/[;"\n\r]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

/** Gera o conteúdo CSV (pt-BR, separador ';', com BOM para Excel). */
export function gerarCSV(
  colunas: string[],
  linhas: Record<string, string>[],
  separador = ";"
): string {
  const cabecalho = colunas.map((c) => escaparCSVCampo(c, separador)).join(separador);
  const corpo = linhas.map(
    (linha) =>
      colunas
        .map((c) => escaparCSVCampo(linha[c] ?? "", separador))
        .join(separador)
  );
  return `\uFEFF${cabecalho}\r\n${corpo.join("\r\n")}`;
}

// ---------------------------------------------------------------------------
// Ordenação e busca na tabela do relatório (usadas pela página e pelos testes)
// ---------------------------------------------------------------------------

const VALOR_VAZIO = new Set(["", "—", "–", "-"]);

/** Normaliza texto para comparação (busca e ordenação sem diferenciar acento/caixa). */
export function normalizarComparacao(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Uma linha é "vazia" na coluna quando o valor está em branco ou é um dos
 * marcadores de ausência usados pelo modelo ("—"). Valores vazios ficam
 * sempre por último, independentemente da direção da ordenação.
 */
export function ehValorVazioColuna(valor: string): boolean {
  return VALOR_VAZIO.has(valor.trim());
}

/**
 * Compara dois valores de uma coluna do relatório:
 *  - número × número  → comparação numérica (ex.: "Nº de peito", idade);
 *  - qualquer outro    → comparação de texto pt-BR ignorando acento/caixa.
 */
export function compararValoresColuna(a: string, b: string): number {
  const ana = a.trim().replace(/\./g, "").replace(",", ".");
  const bna = b.trim().replace(/\./g, "").replace(",", ".");
  if (ana !== "" && bna !== "" && !Number.isNaN(Number(ana)) && !Number.isNaN(Number(bna))) {
    return Number(ana) - Number(bna);
  }
  return normalizarComparacao(a).localeCompare(normalizarComparacao(b), "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Ordena as linhas do relatório por uma coluna. Valores vazios ("—")
 * ficam sempre por último, no final do resultado, em qualquer direção.
 */
export function ordenarLinhas(
  linhas: Record<string, string>[],
  coluna: string,
  direcao: "asc" | "desc" = "asc"
): Record<string, string>[] {
  return [...linhas].sort((x, y) => {
    const vx = x[coluna] ?? "";
    const vy = y[coluna] ?? "";
    const ex = ehValorVazioColuna(vx);
    const ey = ehValorVazioColuna(vy);
    if (ex && ey) return 0;
    if (ex) return 1; // vazio sempre por último
    if (ey) return -1;
    const resultado = compararValoresColuna(vx, vy);
    return direcao === "asc" ? resultado : -resultado;
  });
}

/**
 * Filtra as linhas do relatório por texto livre, varrendo todas as colunas
 * (sem diferenciar acento/caixa). Retorna um novo array (não muta o original).
 */
export function buscarLinhas(
  linhas: Record<string, string>[],
  texto: string
): Record<string, string>[] {
  const alvo = normalizarComparacao(texto);
  if (!alvo) return linhas;
  return linhas.filter((linha) =>
    Object.values(linha).some((valor) => normalizarComparacao(valor).includes(alvo))
  );
}