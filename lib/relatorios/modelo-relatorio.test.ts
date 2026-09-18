import { describe, expect, it } from "vitest";
import {
  montarRelatorio,
  montarResumo,
  gerarCSV,
  formatarDistancia,
  participantesDaInscricao,
  etapasDaProva,
  eInscricaoEquipe,
  ordenarLinhas,
  buscarLinhas,
} from "@/lib/relatorios/modelo-relatorio";
import type { DadosRelatorio } from "@/lib/relatorios/modelo-relatorio";

// Cenário espelhando o caso real: evento de Aquathlon com provas
// individuais (derivam percurso/distância da Modalidade) e uma prova de
// DUPLA/Family (1 inscrição, 2 participantes, funções e distâncias por
// config de etapas). Sem nenhuma regra fixa por evento no modelo.

function cenarios(): DadosRelatorio {
  const dados: DadosRelatorio = {
    eventos: [
      {
        id: "ev-aq",
        nome: "2º Aquathlon 2026",
        data: "2026-10-18",
        status: "inscricoes_abertas",
        local: "Espaço Longevida",
      },
      {
        id: "ev-run",
        nome: "Corrida Rústica",
        data: "2026-12-05",
        status: "inscricoes_abertas",
        local: "Parque",
      },
    ],
    provas: [
      {
        id: "p-kids",
        eventoId: "ev-aq",
        modalidadeId: "natacao",
        categoriaId: "kids",
        tipoProvaId: "individual",
        horario: "",
        valor: 80,
      },
      {
        id: "p-family",
        eventoId: "ev-aq",
        modalidadeId: "aquathlon-family",
        categoriaId: "family",
        tipoProvaId: "revezamento-dupla",
        horario: "",
        valor: 120,
      },
      {
        id: "p-run",
        eventoId: "ev-run",
        modalidadeId: "corrida5k",
        categoriaId: "geral",
        tipoProvaId: "individual",
        horario: "",
        valor: 60,
      },
    ],
    categorias: [
      { id: "kids", nome: "Kids", idadeMinima: 6, idadeMaxima: 14 },
      { id: "family", nome: "Family", idadeMinima: null, idadeMaxima: null },
      { id: "geral", nome: "Geral", idadeMinima: 16, idadeMaxima: null },
    ],
    modalidades: [
      { id: "natacao", nome: "Natação", distanciaMetros: 500 },
      { id: "aquathlon-family", nome: "Aquathlon Family", distanciaMetros: null },
      { id: "corrida5k", nome: "Corrida 5 km", distanciaMetros: 5000 },
    ],
    tiposProva: [
      { id: "individual", nome: "Individual", permiteEquipe: false, integrantes: 1 },
      { id: "revezamento-dupla", nome: "Revezamento Dupla", permiteEquipe: true, integrantes: 2 },
    ],
    inscricoes: [
      {
        id: "insc-fam",
        eventoId: "ev-aq",
        provaId: "p-family",
        atletaNome: "Ana Souza",
        atletaNome2: "Bruno Souza",
        status: "confirmada",
        dataInscricao: "2026-08-01",
        numeroPeito: "1",
      },
      {
        id: "insc-maria",
        eventoId: "ev-aq",
        provaId: "p-kids",
        atletaNome: "Maria Silva",
        status: "confirmada",
        dataInscricao: "2026-08-02",
        numeroPeito: "3",
      },
      {
        id: "insc-joana",
        eventoId: "ev-aq",
        provaId: "p-kids",
        atletaNome: "Joana Lima",
        status: "confirmada",
        dataInscricao: "2026-08-03",
        numeroPeito: "4",
      },
      {
        id: "insc-run",
        eventoId: "ev-run",
        provaId: "p-run",
        atletaNome: "Carlos",
        status: "pendente",
        dataInscricao: "2026-09-10",
        numeroPeito: "",
      },
    ],
    atletas: [
      {
        id: "a-ana",
        nome: "Ana Souza",
        dataNascimento: "1985-06-15",
        categoriaId: "",
        responsavelNome: "",
        email: "",
        telefone: "",
      },
      {
        id: "a-maria",
        nome: "Maria Silva",
        dataNascimento: "2014-03-01",
        categoriaId: "",
        responsavelNome: "",
        email: "",
        telefone: "",
      },
      {
        id: "a-joana",
        nome: "Joana Lima",
        dataNascimento: "2012-04-02",
        categoriaId: "",
        responsavelNome: "",
        email: "",
        telefone: "",
      },
    ],
    dorsais: [
      { id: "d1", inscricaoId: "insc-fam", numero: 1, checkInFeito: false, kitEntregue: false, medalhaEntregue: false, alimentacaoEntregue: false },
      { id: "d3", inscricaoId: "insc-maria", numero: 3, checkInFeito: false, kitEntregue: false, medalhaEntregue: false, alimentacaoEntregue: false },
      { id: "d4", inscricaoId: "insc-joana", numero: 4, checkInFeito: false, kitEntregue: false, medalhaEntregue: false, alimentacaoEntregue: false },
    ],
    pagamentos: [
      { inscricaoId: "insc-fam", valor: 120, formaPagamento: "pix", status: "pago", dataPagamento: "2026-08-01" },
      { inscricaoId: "insc-maria", valor: 80, formaPagamento: "pix", status: "pago", dataPagamento: "2026-08-02" },
    ],
    etapas: [
      { id: "e1", provaId: "p-family", posicao: 1, funcao: "Nadador", nome: "Natação", ordem: 0, distanciaMetros: null, unidade: "m", descricao: "" },
      { id: "e2", provaId: "p-family", posicao: 2, funcao: "Corredor", nome: "Corrida", ordem: 1, distanciaMetros: 3000, unidade: "km", descricao: "" },
    ],
  };
  return dados;
}

describe("montarRelatorio — prova individual", () => {
  it("deriva percurso e distância da Modalidade (sem etapas configuradas)", () => {
    const { linhas, colunas } = montarRelatorio(cenarios(), {
      eventoId: "ev-aq",
      provaId: "p-kids",
    });
    expect(linhas).toHaveLength(2);
    const maria = linhas[0];
    expect(maria["Nome"]).toBe("MARIA SILVA");
    expect(maria["Idade"]).toBe("12");
    expect(maria["Percurso/Etapa"]).toBe("Natação");
    expect(maria["Distância"]).toBe("500 m");
    expect(maria["Categoria"]).toBe("Kids");
    expect(maria["Modalidade"]).toBe("Natação");
    expect(maria["Tipo de inscrição"]).toBe("Individual");
    expect(maria["Nº de peito"]).toBe("3");
    expect(maria["Situação"]).toBe("Confirmada");
    expect(maria["Pagamento"]).toBe("Pago");
    // Sem colunas de equipe numa seleção 100% individual.
    expect(colunas).not.toContain("Participante 1");
    expect(colunas).not.toContain("Participantes");
  });

  it("ordena linhas por número de peito", () => {
    const { linhas } = montarRelatorio(cenarios(), {
      eventoId: "ev-aq",
      provaId: "p-kids",
    });
    expect(linhas.map((l) => l["Nº de peito"])).toEqual(["3", "4"]);
  });
});

describe("montarRelatorio — dupla/equipe (Family)", () => {
  it("monta UMA inscrição com 2 participantes, funções e distâncias por posição", () => {
    const { linhas, colunas } = montarRelatorio(cenarios(), {
      eventoId: "ev-aq",
      provaId: "p-family",
    });
    expect(linhas).toHaveLength(1);
    const fam = linhas[0];
expect(fam["Participantes"]).toBe("ANA SOUZA + BRUNO SOUZA");
expect(fam["Participante 1"]).toBe("ANA SOUZA");
expect(fam["Participante 2"]).toBe("BRUNO SOUZA");
expect(fam["Função 1"]).toBe("Nadador");
expect(fam["Percurso 1"]).toBe("Natação");
expect(fam["Distância 1"]).toBe("—");
expect(fam["Participante 2"]).toBe("BRUNO SOUZA");
expect(fam["Função 2"]).toBe("Corredor");
expect(fam["Percurso 2"]).toBe("Corrida");
expect(fam["Distância 2"]).toBe("3 km");
expect(fam["Distância total (equipe)"]).toBe("3000 m");
expect(fam["Categoria"]).toBe("Family");
expect(fam["Tipo de inscrição"]).toBe("Equipe (2)");
    // Sem colunas específicas de prova individual numa seleção 100% equipe.
    expect(colunas).not.toContain("Nome");
    expect(colunas).toBeDefined();
  });

  it("soma as distâncias dos participantes no total da equipe", () => {
    const { linhas } = montarRelatorio(cenarios(), {
      eventoId: "ev-aq",
      provaId: "p-family",
    });
    expect(linhas[0]["Distância total (equipe)"]).toBe("3000 m");
  });
});

describe("filtros", () => {
  it("filtra por tipo de inscrição (equipe vs individual)", () => {
    const eq = montarRelatorio(cenarios(), {
      eventoId: "ev-aq",
      tipoInscricao: "equipe",
    });
    expect(eq.linhas).toHaveLength(1);
    expect(eq.linhas[0]["Participantes"]).toBe("ANA SOUZA + BRUNO SOUZA");

    const ind = montarRelatorio(cenarios(), {
      eventoId: "ev-aq",
      tipoInscricao: "individual",
    });
    expect(ind.linhas).toHaveLength(2);
  });

  it("filtra por pagamento sem registro", () => {
    const { linhas } = montarRelatorio(cenarios(), {
      eventoId: "ev-aq",
      situacaoPagamento: "sem_registro",
    });
    expect(linhas).toHaveLength(1);
    expect(linhas[0]["Nome"]).toBe("JOANA LIMA");
    expect(linhas[0]["Pagamento"]).toBe("Sem registro");
  });

  it("filtra por situação de inscrição", () => {
    const { linhas } = montarRelatorio(cenarios(), {
      eventoId: "ev-run",
      situacaoInscricao: "pendente",
    });
    expect(linhas).toHaveLength(1);
    expect(linhas[0]["Situação"]).toBe("Pendente");
  });

  it("não mistura eventos diferentes", () => {
    const aq = montarRelatorio(cenarios(), { eventoId: "ev-aq" });
    const run = montarRelatorio(cenarios(), { eventoId: "ev-run" });
    expect(aq.linhas).toHaveLength(3);
    expect(run.linhas).toHaveLength(1);
    expect(run.linhas[0]["Modalidade"]).toBe("Corrida 5 km");
    expect(run.linhas[0]["Percurso/Etapa"]).toBe("Corrida 5 km");
    expect(run.linhas[0]["Distância"]).toBe("5000 m");
  });
});

describe("montarResumo — totalizações", () => {
  it("conta inscrições, participantes, situações, pagamentos, percursos e distâncias", () => {
    const dados = cenarios();
    const montado = montarRelatorio(dados, { eventoId: "ev-aq" });
    const resumo = montarResumo(dados, { eventoId: "ev-aq" }, montado);

    expect(resumo.inscricoes).toBe(3);
    expect(resumo.participantes).toBe(4); // 2 + 1 + 1

    const pagamento = new Map(resumo.distribuicao.pagamento);
    expect(pagamento.get("Pago")).toBe(2);
    expect(pagamento.get("Sem registro")).toBe(1);

    const situacao = new Map(resumo.distribuicao.situacao);
    expect(situacao.get("Confirmada")).toBe(3);

    const tipo = new Map(resumo.distribuicao.tipoInscricao);
    expect(tipo.get("Equipe")).toBe(1);
    expect(tipo.get("Individual")).toBe(2);

    const percurso = new Map(resumo.distribuicao.percurso);
    expect(percurso.get("Natação")).toBe(3); // 2 individuais + 1 etapa da dupla
    expect(percurso.get("Corrida")).toBe(1);

    const funcao = new Map(resumo.distribuicao.funcao);
    expect(funcao.get("Atleta")).toBe(2);
    expect(funcao.get("Nadador")).toBe(1);
    expect(funcao.get("Corredor")).toBe(1);

    // 2 individuais x 500 m + 1 corrida x 3000 m = 4000 m previstos.
    expect(resumo.distancia.totalMetros).toBe(4000);
    expect(new Map(resumo.distancia.porEtapa).get("Natação")).toBe(1000);
    expect(new Map(resumo.distancia.porEtapa).get("Corrida")).toBe(3000);
  });

  it("respeita os filtros nas totalizações", () => {
    const dados = cenarios();
    const montado = montarRelatorio(dados, { eventoId: "ev-aq", tipoInscricao: "equipe" });
    const resumo = montarResumo(
      dados,
      { eventoId: "ev-aq", tipoInscricao: "equipe" },
      montado
    );
    expect(resumo.inscricoes).toBe(1);
    expect(resumo.participantes).toBe(2);
    expect(resumo.distancia.totalMetros).toBe(3000);
  });
});

describe("etapasDaProva e formato de distância", () => {
  it("usa a configuração de etapas quando existente", () => {
    const dados = cenarios();
    const prova = dados.provas.find((p) => p.id === "p-family")!;
    const modalidade = dados.modalidades.find((m) => m.id === prova.modalidadeId);
    const etapas = etapasDaProva(prova, dados.etapas, modalidade);
    expect(etapas.map((e) => `${e.posicao}:${e.funcao}`)).toEqual(["1:Nadador", "2:Corredor"]);
  });

  it("deriva etapa única da modalidade quando não há configuração", () => {
    const dados = cenarios();
    const prova = dados.provas.find((p) => p.id === "p-kids")!;
    const modalidade = dados.modalidades.find((m) => m.id === prova.modalidadeId);
    const etapas = etapasDaProva(prova, dados.etapas, modalidade);
    expect(etapas).toHaveLength(1);
    expect(etapas[0].nome).toBe("Natação");
    expect(etapas[0].distanciaMetros).toBe(500);
  });

  it("formata distâncias em m e km, e '—' quando não informada", () => {
    expect(formatarDistancia(3000, "km")).toBe("3 km");
    expect(formatarDistancia(1500, "km")).toBe("1,5 km");
    expect(formatarDistancia(500, "m")).toBe("500 m");
    expect(formatarDistancia(null, "m")).toBe("—");
    expect(formatarDistancia(0, "km")).toBe("—");
  });

  it("identifica equipe pelo número de integrantes do tipo de prova", () => {
    const dados = cenarios();
    const fam = dados.tiposProva.find((t) => t.id === "revezamento-dupla");
    const ind = dados.tiposProva.find((t) => t.id === "individual");
    const inscricao = dados.inscricoes[0];
    expect(eInscricaoEquipe(inscricao, fam)).toBe(true);
    expect(eInscricaoEquipe(inscricao, ind)).toBe(false);
    expect(participantesDaInscricao(inscricao, fam)).toHaveLength(2);
  });
});

describe("gerarCSV", () => {
  it("gera CSV com BOM, separador ';' e aspas quando necessário", () => {
    const csv = gerarCSV(["A", "B"], [{ A: "x;y", B: 'vai "assim"' }]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("A;B");
    expect(csv).toContain('"x;y"');
    expect(csv).toContain('"vai ""assim"""');
    const linhasSemBom = csv.slice(1).split("\r\n");
    expect(linhasSemBom[1]).toBe('"x;y";"vai ""assim"""');
  });
});

describe("robustez genérica (sem afinidade com qualquer evento)", () => {
  it("funciona com inscrição cuja prova é desconhecida (não quebra)", () => {
    const dados = cenarios();
    dados.inscricoes.push({
      id: "insc-ork",
      eventoId: "ev-aq",
      provaId: "prova-inexistente",
      atletaNome: "Atl Órfão",
      status: "confirmada",
      dataInscricao: "2026-08-09",
      numeroPeito: null,
    });
    const montado = montarRelatorio(dados, { eventoId: "ev-aq" });
    const linha = montado.linhas.find((l) => l["Nome"] === "ATL ÓRFÃO");
    expect(linha).toBeDefined();
    expect(linha?.["Modalidade"]).toBe("—");
    expect(linha?.["Categoria"]).toBe("—");
    expect(linha?.["Distância"]).toBe("—");
  });

  it("acumula o total previsto sem depender de unidade", () => {
    const dados = cenarios();
    const montado = montarRelatorio(dados, { eventoId: "ev-aq" });
    expect(montado.participantesTotal).toBe(4);
  });
});

describe("ordenarLinhas", () => {
  const linhas: Record<string, string>[] = [
    { "Nº de peito": "12", Nome: "Álvaro Costa", Categoria: "Aquathlon" },
    { "Nº de peito": "3", Nome: "Bia Melo", Categoria: "Family" },
    { "Nº de peito": "108", Nome: "Caio Reis", Categoria: "Aquathlon" },
    { "Nº de peito": "22", Nome: "Duda Prado", Categoria: "—" },
  ];

  it("ordena por coluna numérica (Nº de peito) em ordem crescente", () => {
    const ordenadas = ordenarLinhas(linhas, "Nº de peito", "asc").map((l) => l["Nº de peito"]);
    expect(ordenadas).toEqual(["3", "12", "22", "108"]);
  });

  it("ordena por coluna numérica em ordem decrescente", () => {
    const ordenadas = ordenarLinhas(linhas, "Nº de peito", "desc").map((l) => l["Nº de peito"]);
    expect(ordenadas).toEqual(["108", "22", "12", "3"]);
  });

  it("ordena texto pt-BR ignorando acento e caixa", () => {
    const ordenadas = ordenarLinhas(linhas, "Nome", "asc").map((l) => l.Nome);
    expect(ordenadas).toEqual(["Álvaro Costa", "Bia Melo", "Caio Reis", "Duda Prado"]);
  });

  it("mantém valores vazios ('—') sempre por último, em qualquer direção", () => {
    const asc = ordenarLinhas(linhas, "Categoria", "asc").map((l) => l.Nome);
    const desc = ordenarLinhas(linhas, "Categoria", "desc").map((l) => l.Nome);
    expect(asc[asc.length - 1]).toBe("Duda Prado");
    expect(desc[desc.length - 1]).toBe("Duda Prado");
    expect(asc.slice(0, 3)).toContain("Álvaro Costa");
    expect(desc.slice(0, 3)).toContain("Álvaro Costa");
  });

  it("não muta o array original", () => {
    const copia = [...linhas];
    ordenarLinhas(linhas, "Nome", "desc");
    expect(linhas).toEqual(copia);
  });
});

describe("buscarLinhas", () => {
  const linhas: Record<string, string>[] = [
    { "Nº de peito": "12", Nome: "Álvaro Costa", Categoria: "Aquathlon" },
    { "Nº de peito": "3", Nome: "Bia Melo", Categoria: "Family" },
  ];

  it("filtra por texto ignorando acento e caixa", () => {
    expect(buscarLinhas(linhas, "alvaro")).toHaveLength(1);
    expect(buscarLinhas(linhas, "ALVARO")).toHaveLength(1);
    expect(buscarLinhas(linhas, "12")).toHaveLength(1);
  });

  it("retorna todas as linhas quando a busca está vazia", () => {
    expect(buscarLinhas(linhas, "  ")).toHaveLength(2);
    expect(buscarLinhas(linhas, "")).toHaveLength(2);
  });

  it("retorna lista vazia quando nada corresponde", () => {
    expect(buscarLinhas(linhas, "inexistente")).toHaveLength(0);
  });
});