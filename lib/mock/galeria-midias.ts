// Utilidades puras do módulo Galeria para suportar mídias de imagem e
// vídeo, isoladas das stores (lib/mock/*-store.tsx) para permitir
// testes unitários com vitest.

export type TipoMidia = "imagem" | "video";

export const TIPOS_VIDEO = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

export function tipoDaMidia(tipoArquivo: string): TipoMidia {
  return TIPOS_VIDEO.has(tipoArquivo.toLowerCase()) ? "video" : "imagem";
}

export function ehMidiaSuportada(tipoArquivo: string): boolean {
  const tipo = tipoArquivo.toLowerCase();
  return tipo.startsWith("image/") || TIPOS_VIDEO.has(tipo);
}
