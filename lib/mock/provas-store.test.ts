import { describe, expect, it } from "vitest";
import {
  identificacaoDaProva,
  situacaoDaProva,
  SITUACAO_PROVA_LABEL,
  type Prova,
} from "@/lib/mock/provas-utils";

function prova(parcial: Partial<Prova> = {}): Prova {
  return {
    id: "p1",
    eventoId: "1",
    modalidadeId: "m1",
    categoriaId: "c1",
    tipoProvaId: "t1",
    horario: "",
    observacoes: "",
    valor: 0,
    ...parcial,
  };
}

describe("situacaoDaProva", () => {
  it("padrão é nao_iniciada quando o campo está ausente", () => {
    expect(situacaoDaProva(prova())).toBe("nao_iniciada");
    expect(situacaoDaProva(undefined)).toBe("nao_iniciada");
  });

  it("retorna a situação definida", () => {
    expect(situacaoDaProva(prova({ situacao: "em_andamento" }))).toBe("em_andamento");
    expect(situacaoDaProva(prova({ situacao: "encerrada" }))).toBe("encerrada");
  });

  it("expõe rótulo amigável para cada situação", () => {
    expect(SITUACAO_PROVA_LABEL.encerrada).toBe("Realizada");
    expect(SITUACAO_PROVA_LABEL.em_andamento).toBe("Em andamento");
    expect(SITUACAO_PROVA_LABEL.nao_iniciada).toBe("Não iniciada");
  });
});

describe("identificacaoDaProva", () => {
  it("padrão é dorsal quando o campo está ausente", () => {
    expect(identificacaoDaProva(prova())).toBe("dorsal");
    expect(identificacaoDaProva(undefined)).toBe("dorsal");
  });

  it("respeita card quando definido", () => {
    expect(identificacaoDaProva(prova({ tipoIdentificacao: "card" }))).toBe("card");
  });
});
