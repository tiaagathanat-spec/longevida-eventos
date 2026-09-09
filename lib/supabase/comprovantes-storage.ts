// Integração dos comprovantes de pagamento com o Supabase Storage.
//
// Os comprovantes de PIX eram guardados como data URL (base64) na própria
// coluna `comprovante_url` de app_pagamentos — inchavam o banco. Novos
// anexos passam pelo bucket `comprovantes`; a linha guarda a URL pública
// do arquivo. Comprovantes antigos (data URL) continuam renderizando.
//
// Formato do path:
//   comprovantes/{eventoId}/{inscricaoId}/{uuid}{ext}
//   [1]=eventoId (TEXT)  [2]=inscricaoId (TEXT)
// Espelha as policies da migration 0020 (storage_comprovantes_*_escopo):
// financeiro do evento ou dono da inscrição.
//
// Quando uma seleção de várias inscrições gera um único comprovante, o
// arquivo é enviado uma vez usando a primeira inscrição como caminho e a
// mesma URL é gravada em todos os pagamentos selecionados.

import { createClient } from "@/lib/supabase/client";
import { extensaoDoArquivo } from "@/lib/supabase/galeria-storage";

export const BUCKET_COMPROVANTES = "comprovantes";

const PREFIXO_PUBLICO = "/storage/v1/object/public/comprovantes/";

/** Monta o caminho do arquivo no bucket (uuid gera nome não adivinhável). */
export function montarCaminhoComprovante(opts: {
  eventoId: string;
  inscricaoId: string;
  extensao: string;
}): string {
  return `${opts.eventoId}/${opts.inscricaoId}/${crypto.randomUUID()}${opts.extensao}`;
}

/** Extrai o caminho a partir da URL pública do Storage (ou null se não for). */
export function caminhoDeUrlPublica(url: string): string | null {
  const indice = url.indexOf(PREFIXO_PUBLICO);
  if (indice < 0) return null;
  const caminho = url.slice(indice + PREFIXO_PUBLICO.length);
  return caminho || null;
}

/** URL pública do caminho (usada para exibir e para `comprovante_url`). */
export function urlPublicaDoCaminho(caminho: string): string {
  return createClient().storage.from(BUCKET_COMPROVANTES).getPublicUrl(caminho).data.publicUrl;
}

/** Envia o comprovante ao Storage e devolve caminho + URL pública. */
export async function enviarComprovantePix(opts: {
  arquivo: File;
  eventoId: string;
  inscricaoId: string;
}): Promise<{ caminho: string; url: string }> {
  const caminho = montarCaminhoComprovante({
    eventoId: opts.eventoId,
    inscricaoId: opts.inscricaoId,
    extensao: extensaoDoArquivo(opts.arquivo.name),
  });
  const { error } = await createClient()
    .storage.from(BUCKET_COMPROVANTES)
    .upload(caminho, opts.arquivo, { cacheControl: "3600", upsert: false });
  if (error) {
    throw new Error(`Falha ao enviar o comprovante: ${error.message}`);
  }
  return { caminho, url: urlPublicaDoCaminho(caminho) };
}

/** Remove o arquivo do Storage (melhor esforço). Data URLs antigas não fazem nada. */
export async function removerComprovante(url: string): Promise<void> {
  const caminho = caminhoDeUrlPublica(url);
  if (!caminho) return;
  const { error } = await createClient().storage.from(BUCKET_COMPROVANTES).remove([caminho]);
  if (error) {
    console.warn(`[comprovantes-storage] remover ${caminho}:`, error.message);
  }
}