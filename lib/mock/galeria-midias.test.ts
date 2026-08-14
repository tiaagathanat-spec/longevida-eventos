import { describe, it, expect } from "vitest";
import { tipoDaMidia, ehMidiaSuportada, TIPOS_VIDEO } from "./galeria-midias";

describe("tipoDaMidia", () => {
  it("reconhece formatos de vídeo como vídeo", () => {
    expect(tipoDaMidia("video/mp4")).toBe("video");
    expect(tipoDaMidia("video/webm")).toBe("video");
    expect(tipoDaMidia("video/ogg")).toBe("video");
    expect(tipoDaMidia("video/quicktime")).toBe("video");
  });

  it("trata qualquer imagem como imagem", () => {
    expect(tipoDaMidia("image/jpeg")).toBe("imagem");
    expect(tipoDaMidia("image/png")).toBe("imagem");
  });

  it("é insensível a maiúsculas/minúsculas", () => {
    expect(tipoDaMidia("Video/MP4")).toBe("video");
  });
});

describe("ehMidiaSuportada", () => {
  it("aceita imagens e vídeos", () => {
    expect(ehMidiaSuportada("image/png")).toBe(true);
    expect(ehMidiaSuportada("video/mp4")).toBe(true);
  });

  it("rejeita arquivos que não são mídia", () => {
    expect(ehMidiaSuportada("application/pdf")).toBe(false);
    expect(ehMidiaSuportada("")).toBe(false);
  });
});

describe("TIPOS_VIDEO", () => {
  it("não é vazio e inclui os formatos esperados", () => {
    expect(TIPOS_VIDEO.size).toBeGreaterThan(0);
    expect(TIPOS_VIDEO.has("video/mp4")).toBe(true);
  });
});
