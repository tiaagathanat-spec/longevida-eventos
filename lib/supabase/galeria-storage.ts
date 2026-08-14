// Integração da galeria com o Supabase Storage.
//
// Os arquivos de mídia (fotos/vídeos) são enviados ao bucket `galeria` e
// a linha em app_galeria guarda a URL pública do arquivo no campo `url`.
// Antes desta camada, a mídia era guardada como data URL (base64) na
// própria coluna `url` — registros antigos continuam funcionando (o
// navegador renderiza data URLs), mas novos uploads passam pelo Storage.
//
// Formato do path:
//   galeria/{eventoId}/{categoria}/{visibilidade}/{uuid}{ext}
//   [1]=eventoId (TEXT)  [2]=categoria  [3]=visibilidade ('publica'|'privada')
// Espelha as policies da migration 0011 (storage_galeria_*_escopo).

import { createClient } from "@/lib/supabase/client";
import type { CategoriaImagem, Visibilidade } from "@/lib/mock/galeria-store";

export const BUCKET_GALERIA = "galeria";

const PREFIXO_PUBLICO = "/storage/v1/object/public/galeria/";

/** Extensão do arquivo em minúsculas, com o ponto ("mp4" → ".mp4"). */
export function extensaoDoArquivo(nomeArquivo: string): string {
  const ponto = nomeArquivo.lastIndexOf(".");
  if (ponto < 0 || ponto === nomeArquivo.length - 1) return "";
  return nomeArquivo.slice(ponto).toLowerCase();
}

/** Monta o caminho do arquivo no bucket (uuid gera nome não adivinhável). */
export function montarCaminhoGaleria(opts: {
  eventoId: string;
  categoria: string;
  visibilidade: string;
  extensao: string;
}): string {
  return `${opts.eventoId}/${opts.categoria}/${opts.visibilidade}/${crypto.randomUUID()}${opts.extensao}`;
}

/** Extrai o caminho a partir da URL pública do Storage (ou null se não for). */
export function caminhoDeUrlPublica(url: string): string | null {
  const indice = url.indexOf(PREFIXO_PUBLICO);
  if (indice < 0) return null;
  const caminho = url.slice(indice + PREFIXO_PUBLICO.length);
  return caminho || null;
}

/** URL pública do caminho (usada para exibir e para o campo `url` da linha). */
export function urlPublicaDoCaminho(caminho: string): string {
  return createClient().storage.from(BUCKET_GALERIA).getPublicUrl(caminho).data.publicUrl;
}

/** Envia o arquivo ao Storage e devolve caminho + URL pública. */
export async function enviarArquivoGaleria(opts: {
  arquivo: File;
  eventoId: string;
  categoria: CategoriaImagem;
  visibilidade: Visibilidade;
}): Promise<{ caminho: string; url: string }> {
  const caminho = montarCaminhoGaleria({
    eventoId: opts.eventoId,
    categoria: opts.categoria,
    visibilidade: opts.visibilidade,
    extensao: extensaoDoArquivo(opts.arquivo.name),
  });
  const { error } = await createClient()
    .storage.from(BUCKET_GALERIA)
    .upload(caminho, opts.arquivo, { cacheControl: "3600", upsert: false });
  if (error) {
    throw new Error(`Falha ao enviar o arquivo: ${error.message}`);
  }
  return { caminho, url: urlPublicaDoCaminho(caminho) };
}

/** Remove o arquivo do Storage (melhor esforço). Data URLs antigas não fazem nada. */
export async function removerArquivoGaleria(url: string): Promise<void> {
  const caminho = caminhoDeUrlPublica(url);
  if (!caminho) return;
  const { error } = await createClient().storage.from(BUCKET_GALERIA).remove([caminho]);
  if (error) {
    console.warn(`[galeria-storage] remover ${caminho}:`, error.message);
  }
}
