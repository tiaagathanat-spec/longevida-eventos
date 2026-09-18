import { describe, expect, it } from "vitest";
import {
  montarParticipacao,
  linhaParticipante,
  percursoIndividualTexto,
  funcaoIndividualTexto,
  funcaoComplementa,
} from "@/lib/dorsais/dados-participacao";
import type {
  InscricaoRel,
  ProvaRel,
  ModalidadeRel,
  CategoriaRel,
  TipoProvaRel,
  DorsalRel,
  EtapaProvaRel,
} from "@/lib/relatorios/modelo-relatorio";

// Cenários genéricos: individual, dupla (Family) e revezamento — sem
// regra por evento/prova. Reutiliza os mesmos tipos do modelo de
// relatórios, pois os objetos das stores são estruturalmente compatíveis.

const individualTipo: TipoProvaRel = {
  id: "individual",
  nome: "Individual",
  permiteEquipe: false,
  integrantes: 1,
};
const duplaTipo: TipoProvaRel = {
  id: "revezamento-dupla",
  nome: "Dupla",
  permiteEquipe: true,
  integrantes: 2,
};
const quartetoTipo: TipoProvaRel = {
  id: "revezamento",
  nome: "Revezamento",
  permiteEquipe: true,
  integrantes: 4,
};

const natacao: ModalidadeRel = { id: "natacao", nome: "Natação", distanciaMetros: 50 };
const corrida: ModalidadeRel = { id: "corrida", nome: "Corrida", distanciaMetros: 3000 };
const aquathlon: ModalidadeRel = {
  id: "aquathlon-family",
  nome: "Aquathlon Family",
  distanciaMetros: null,
};

const kids: CategoriaRel = { id: "kids", nome: "Kids", idadeMinima: null, idadeMaxima: null };
const family: CategoriaRel = { id: "family", nome: "Family", idadeMinima: null, idadeMaxima: null };

function prova(id: string, modalidadeId: string, categoriaId: string, tipoProvaId: string): ProvaRel {
  return { id, eventoId: "ev", modalidadeId, categoriaId, tipoProvaId, horario: "", valor: 100 };
}

function inscricao(over: Partial<InscricaoRel> = {}): InscricaoRel {
  return {
    id: "ins-1",
    eventoId: "ev",
    provaId: "p-1",
    atletaNome: "JULIO",
    status: "confirmada",
    dataInscricao: "2026-09-01",
    ...over,
  };
}

const dorsal: DorsalRel = {
  id: "dor-1",
  inscricaoId: "ins-1",
  numero: 81,
  checkInFeito: false,
  kitEntregue: false,
  medalhaEntregue: false,
  alimentacaoEntregue: false,
};

const etapasFamily: EtapaProvaRel[] = [
  {
    id: "e1",
    provaId: "p-family",
    posicao: 1,
    funcao: "Nadador",
    nome: "Natação",
    ordem: 0,
    distanciaMetros: null,
    unidade: "m",
    descricao: "Distância de acordo com a faixa etária.",
  },
  {
    id: "e2",
    provaId: "p-family",
    posicao: 2,
    funcao: "Corredor",
    nome: "Corrida",
    ordem: 1,
    distanciaMetros: 3000,
    unidade: "km",
    descricao: "Corrida de 3 km.",
  },
];

describe("montarParticipacao — inscrição individual", () => {
  it("deriva percurso/distância da modalidade quando não há etapas configuradas", () => {
    const result = montarParticipacao({
      inscricao: inscricao({ provaId: "p-nat" }),
      prova: prova("p-nat", "natacao", "kids", "individual"),
      modalidade: natacao,
      categoria: kids,
      tipoProva: individualTipo,
      dorsal,
      etapas: [],
    });

    expect(result.tipo).toBe("individual");
    if (result.tipo !== "individual") return;
    expect(result.nome).toBe("JULIO");
    expect(result.nomeExibicao).toBe("JULIO");
    expect(result.categoria).toBe("Kids");
    expect(result.modalidade).toBe("Natação");
    expect(result.peito).toEqual({ texto: "81", numero: 81 });
    expect(percursoIndividualTexto(result.participanteUnico)).toBe("Natação 50 m");
  });

  it("usa a configuração de etapas quando a prova individual tiver", () => {
    const etapas: EtapaProvaRel[] = [
      {
        id: "e1",
        provaId: "p-nat",
        posicao: 1,
        funcao: "Nadador",
        nome: "Natação",
        ordem: 0,
        distanciaMetros: 200,
        unidade: "m",
        descricao: "",
      },
    ];
    const result = montarParticipacao({
      inscricao: inscricao(),
      prova: prova("p-nat", "natacao", "kids", "individual"),
      modalidade: natacao,
      categoria: kids,
      tipoProva: individualTipo,
      dorsal,
      etapas,
    });

    if (result.tipo !== "individual") throw new Error("esperado individual");
    expect(percursoIndividualTexto(result.participanteUnico)).toBe("Natação 200 m");
    expect(funcaoIndividualTexto(result.participanteUnico)).toBe("Nadador");
  });

  it("sem prova/dados completa chega com marcadores de ausência, sem quebrar", () => {
    const result = montarParticipacao({
      inscricao: inscricao({ numeroPeito: "150" }),
      etapas: [],
    });
    if (result.tipo !== "individual") throw new Error("esperado individual");
    expect(result.peito.texto).toBe("150");
    expect(result.categoria).toBe("—");
    expect(percursoIndividualTexto(result.participanteUnico)).toBe("—");
  });
});

describe("montarParticipacao — dupla/equipe", () => {
  it("monta a dupla com nome, categoria e um participante por função/percurso", () => {
    const result = montarParticipacao({
      inscricao: inscricao({
        provaId: "p-family",
        atletaNome: "AYLA",
        atletaNome2: "JULIO",
      }),
      prova: prova("p-family", "aquathlon-family", "family", "revezamento-dupla"),
      modalidade: aquathlon,
      categoria: family,
      tipoProva: duplaTipo,
      dorsal,
      etapas: etapasFamily,
    });

    expect(result.tipo).toBe("equipe");
    if (result.tipo !== "equipe") return;
    expect(result.nome).toBe("AYLA + JULIO");
    expect(result.nomeExibicao).toBe("AYLA + JULIO");
    expect(result.categoria).toBe("Family");
    expect(result.modalidade).toBe("Aquathlon Family");
    expect(result.peito).toEqual({ texto: "81", numero: 81 });

    expect(result.participantes).toHaveLength(2);
    const [ayla, julio] = result.participantes;
    expect(ayla).toMatchObject({ posicao: 1, nome: "AYLA", funcao: "Nadador", percurso: "Natação" });
    expect(ayla.distancia).toBe("—");
    expect(julio).toMatchObject({ posicao: 2, nome: "JULIO", funcao: "Corredor", percurso: "Corrida" });
    expect(julio.distancia).toBe("3 km");
  });

  it("revezamento com mais integrantes lista todos os participantes", () => {
    const etapas: EtapaProvaRel[] = [
      { id: "t1", provaId: "p-rev", posicao: 1, funcao: "Nadador", nome: "Natação", ordem: 0, distanciaMetros: 200, unidade: "m", descricao: "" },
      { id: "t2", provaId: "p-rev", posicao: 2, funcao: "Ciclista", nome: "Ciclismo", ordem: 1, distanciaMetros: 10000, unidade: "km", descricao: "" },
      { id: "t3", provaId: "p-rev", posicao: 3, funcao: "Corredor", nome: "Corrida", ordem: 2, distanciaMetros: 3000, unidade: "km", descricao: "" },
      { id: "t4", provaId: "p-rev", posicao: 4, funcao: "Corredor", nome: "Corrida", ordem: 3, distanciaMetros: 3000, unidade: "km", descricao: "" },
    ];
    const result = montarParticipacao({
      inscricao: inscricao({
        provaId: "p-rev",
        atletaNome: "A",
        atletaNome2: "B",
        atletaNome3: "C",
        atletaNome4: "D",
      }),
      prova: prova("p-rev", "aquathlon", "family", "revezamento"),
      modalidade: { id: "aquathlon", nome: "Aquathlon", distanciaMetros: null },
      categoria: family,
      tipoProva: quartetoTipo,
      dorsal,
      etapas,
    });

    if (result.tipo !== "equipe") throw new Error("esperado equipe");
    expect(result.nomeExibicao).toBe("A + B + C + D");
    expect(result.participantes.map((p) => p.nome)).toEqual(["A", "B", "C", "D"]);
    expect(result.participantes.map((p) => p.distancia)).toEqual(["200 m", "10 km", "3 km", "3 km"]);
  });

  it("peito vem do dorsal (app_dorsais) antes do numeroPeito da inscrição", () => {
    const result = montarParticipacao({
      inscricao: inscricao({ numeroPeito: "99" }),
      prova: prova("p-nat", "natacao", "kids", "individual"),
      modalidade: natacao,
      categoria: kids,
      tipoProva: individualTipo,
      dorsal,
      etapas: [],
    });
    expect(result.peito.texto).toBe("81");
  });

  it("peito usa o numeroPeito quando não há dorsal registrado", () => {
    const result = montarParticipacao({
      inscricao: inscricao({ numeroPeito: "150" }),
      prova: prova("p-nat", "natacao", "kids", "individual"),
      modalidade: natacao,
      categoria: kids,
      tipoProva: individualTipo,
      etapas: [],
    });
    expect(result.peito).toEqual({ texto: "150", numero: 150 });
  });
});

describe("linhaParticipante e funcoes", () => {
  it("escreve NOME: PERCURSO DISTÂNCIA quando a função é igual ao percurso", () => {
    expect(
      linhaParticipante({
        posicao: 1,
        nome: "AYLA",
        funcao: "Natação",
        percurso: "Natação",
        distancia: "25 m",
      })
    ).toBe("AYLA: Natação 25 m");
  });

  it("escreve NOME: FUNÇÃO · PERCURSO DISTÂNCIA quando a função agrega informação", () => {
    expect(
      linhaParticipante({
        posicao: 2,
        nome: "JULIO",
        funcao: "Corredor",
        percurso: "Corrida",
        distancia: "3 km",
      })
    ).toBe("JULIO: Corredor · Corrida 3 km");
  });

  it("ignora função genérica em favor da legibilidade", () => {
    expect(
      linhaParticipante({
        posicao: 1,
        nome: "MARIA",
        funcao: "Atleta",
        percurso: "Corrida",
        distancia: "5 km",
      })
    ).toBe("MARIA: Corrida 5 km");
    expect(funcaoComplementa({ funcao: "Atleta", percurso: "Corrida" })).toBe(false);
    expect(funcaoComplementa({ funcao: "Nadador", percurso: "Natação" })).toBe(true);
    expect(funcaoComplementa({ funcao: "", percurso: "Corrida" })).toBe(false);
  });

  it("sem distância não deixa linha pendurada", () => {
    expect(
      linhaParticipante({ posicao: 1, nome: "AYLA", funcao: "", percurso: "Natação", distancia: "—" })
    ).toBe("AYLA: Natação");
  });
});