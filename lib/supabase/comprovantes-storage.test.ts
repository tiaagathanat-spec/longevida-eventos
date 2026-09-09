import { describe, it, expect } from "vitest";
import {
  montarCaminhoComprovante,
  caminhoDeUrlPublica,
} from "./comprovantes-storage";

describe("montarCaminhoComprovante", () => {
  it("monta o caminho com eventoId/inscricaoId/uuid.ext", () => {
    const caminho = montarCaminhoComprovante({
      eventoId: "bbo2gmwd",
      inscricaoId: "1aa6j0e4",
      extensao: ".jpg",
    });
    const partes = caminho.split("/");
    expect(partes).toHaveLength(3);
    expect(partes[0]).toBe("bbo2gmwd");
    expect(partes[1]).toBe("1aa6j0e4");
    expect(partes[2]).toMatch(/^[0-9a-f-]{36}\.jpg$/);
  });
});

describe("caminhoDeUrlPublica de comprovantes", () => {
  it("extrai o caminho de uma URL pública completa", () => {
    const url =
      "https://bvgozcltxilseqfmazow.supabase.co/storage/v1/object/public/comprovantes/bbo2gmwd/1aa6j0e4/uuid.jpg";
    expect(caminhoDeUrlPublica(url)).toBe("bbo2gmwd/1aa6j0e4/uuid.jpg");
  });

  it("devolve null para URLs de outros buckets ou data URLs", () => {
    expect(
      caminhoDeUrlPublica(
        "https://bvgozcltxilseqfmazow.supabase.co/storage/v1/object/public/galeria/bbo2gmwd/percurso/publica/uuid.mp4"
      )
    ).toBeNull();
    expect(caminhoDeUrlPublica("data:image/png;base64,AAAA")).toBeNull();
  });

  it("devolve null quando o caminho está vazio", () => {
    expect(caminhoDeUrlPublica("https://x.supabase.co/storage/v1/object/public/comprovantes/")).toBeNull();
  });
});