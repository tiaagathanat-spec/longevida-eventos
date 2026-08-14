import { describe, it, expect } from "vitest";
import {
  extensaoDoArquivo,
  montarCaminhoGaleria,
  caminhoDeUrlPublica,
} from "./galeria-storage";

describe("extensaoDoArquivo", () => {
  it("devolve a extensão em minúsculas com o ponto", () => {
    expect(extensaoDoArquivo("foto.JPEG")).toBe(".jpeg");
    expect(extensaoDoArquivo("video.MP4")).toBe(".mp4");
  });

  it("devolve vazio para arquivos sem extensão", () => {
    expect(extensaoDoArquivo("sem-extensao")).toBe("");
    expect(extensaoDoArquivo("nome.")).toBe("");
  });
});

describe("montarCaminhoGaleria", () => {
  it("monta o caminho com eventoId/categoria/visibilidade/uuid.ext", () => {
    const caminho = montarCaminhoGaleria({
      eventoId: "bbo2gmwd",
      categoria: "percurso",
      visibilidade: "publica",
      extensao: ".mp4",
    });
    const partes = caminho.split("/");
    expect(partes).toHaveLength(4);
    expect(partes[0]).toBe("bbo2gmwd");
    expect(partes[1]).toBe("percurso");
    expect(partes[2]).toBe("publica");
    expect(partes[3]).toMatch(/^[0-9a-f-]{36}\.mp4$/);
  });
});

describe("caminhoDeUrlPublica", () => {
  it("extrai o caminho de uma URL pública completa", () => {
    const url =
      "https://bvgozcltxilseqfmazow.supabase.co/storage/v1/object/public/galeria/bbo2gmwd/percurso/publica/uuid.mp4";
    expect(caminhoDeUrlPublica(url)).toBe("bbo2gmwd/percurso/publica/uuid.mp4");
  });

  it("devolve null para URLs que não são do bucket galeria", () => {
    expect(caminhoDeUrlPublica("https://exemplo.com/logo.png")).toBeNull();
    expect(caminhoDeUrlPublica("data:image/png;base64,AAAA")).toBeNull();
  });

  it("devolve null quando o caminho está vazio", () => {
    expect(caminhoDeUrlPublica("https://x.supabase.co/storage/v1/object/public/galeria/")).toBeNull();
  });
});
