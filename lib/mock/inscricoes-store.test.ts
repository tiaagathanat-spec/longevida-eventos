import { describe, it, expect } from "vitest";
import { nomeDaInscricao } from "./inscricoes-utils";

describe("nomeDaInscricao", () => {
  it("retorna apenas o atleta principal quando não há dupla", () => {
    expect(nomeDaInscricao({ atletaNome: "Marina Costa" })).toBe("Marina Costa");
    expect(nomeDaInscricao({ atletaNome: "Marina Costa", atletaNome2: "" })).toBe(
      "Marina Costa"
    );
    expect(nomeDaInscricao({ atletaNome: "Marina Costa", atletaNome2: "   " })).toBe(
      "Marina Costa"
    );
  });

  it("retorna 'X + Y' quando há segundo participante", () => {
    expect(
      nomeDaInscricao({ atletaNome: "Marina Costa", atletaNome2: "Beatriz Lima" })
    ).toBe("Marina Costa + Beatriz Lima");
  });

  it("ignora espaços extras do segundo participante", () => {
    expect(
      nomeDaInscricao({ atletaNome: "Marina Costa", atletaNome2: "  Beatriz Lima  " })
    ).toBe("Marina Costa + Beatriz Lima");
  });
});
