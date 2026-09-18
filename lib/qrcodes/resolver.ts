// Resolução de QR Codes da dorsal para inscrição.
//
// Ponto único da lógica de leitura: o conteúdo impresso no QR (o
// `identificador` da inscrição) é transformado na inscrição correspondente.
// Nenhum nome de atleta é usado para localizar — a correspondência é
// sempre pelo identificador/QR ou pelo id da inscrição.
//
// Também centraliza a NORMALIZAÇÃO do que é lido pela câmera (jsQR) ou
// digitado manualmente: leitores reais podem devolver BOM, caracteres de
// controle, quebras de linha ou espaços, e a comparação tolerante evita
// "QR Code não encontrado" falso quando o banco está íntegro.

import type { InscricaoQrCode } from "@/lib/mock/qrcodes-store";
import type { Inscricao } from "@/lib/mock/inscricoes-store";

// Normaliza o conteúdo lido de um QR antes de comparar com o
// identificador armazenado. Remove BOM, caracteres de largura zero,
// controles/formatação, quebras de linha e espaços externos.
export function normalizarIdentificador(entrada: string): string {
  if (!entrada || typeof entrada !== "string") return "";
  return entrada
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r?\n|\r/g, "")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .trim();
}

// Comparação tolerante: igualdade exata ou ignorando caixa. Identificadores
// são gerados minúsculos, mas alguns leitores podem devolver MAIÚSCULAS.
export function identificadoresCondizem(lido: string, salvo: string): boolean {
  if (lido === salvo) return true;
  return lido.toUpperCase() === salvo.toUpperCase();
}

// Localiza o QR Code de uma inscrição pelo conteúdo lido do QR.
export function localizarQrPorIdentificador(
  qrCodes: InscricaoQrCode[],
  lido: string
): InscricaoQrCode | undefined {
  const normal = normalizarIdentificador(lido);
  if (!normal) return undefined;
  return (
    qrCodes.find((q) => q.identificador === normal) ??
    qrCodes.find((q) => identificadoresCondizem(normal, q.identificador))
  );
}

// Extrai um possível id de inscrição quando o QR embute o id direto
// (formato antigo: "LQ-<id>" ou "<id>" sem prefixo).
export function extrairIdInscricaoDireto(lido: string): string | null {
  const normal = normalizarIdentificador(lido);
  if (!normal) return null;
  const semPrefixo = normal.startsWith("LQ-")
    ? normal.slice(3)
    : normal.startsWith("lq-")
      ? normal.slice(3)
      : normal;
  return semPrefixo || null;
}

export type ResolucaoQr = {
  // Registro em app_qrcodes quando localizado pelo identificador.
  qr?: InscricaoQrCode;
  // Inscrição correspondente (individual ou Family/Dupla).
  inscricao: Inscricao;
  // true quando a resolução veio do identificador em app_qrcodes.
  porIdentificador: boolean;
};

// Resolve uma leitura (câmera/manual) em inscrição. Ordem:
//   1. identificador exato em app_qrcodes (tolerante a leitura);
//   2. conteúdo direto igual ao id da inscrição (QR antigos / reutilizados).
// Nunca recorre ao nome do atleta.
export function localizarResolucao(
  qrCodes: InscricaoQrCode[],
  inscricoes: Inscricao[],
  lido: string
): ResolucaoQr | null {
  const normal = normalizarIdentificador(lido);
  if (!normal) return null;

  const qr = localizarQrPorIdentificador(qrCodes, normal);
  if (qr) {
    const inscricao = inscricoes.find((i) => i.id === qr.inscricaoId);
    return inscricao ? { qr, inscricao, porIdentificador: true } : null;
  }

  const idDireto = extrairIdInscricaoDireto(normal);
  if (idDireto) {
    const inscricao = inscricoes.find((i) => i.id === idDireto);
    if (inscricao) {
      const qrDaInscricao = qrCodes.find((q) => q.inscricaoId === inscricao.id);
      return { qr: qrDaInscricao, inscricao, porIdentificador: false };
    }
  }

  return null;
}

// Valida se a inscrição resolvida pertence ao evento em que o leitor foi
// aberto. Nunca deixa um QR de outro evento ser tratado como válido.
export function validarEventoDaResolucao(
  resolucao: ResolucaoQr,
  eventoId: string | undefined
): { ok: boolean; motivo?: string } {
  if (!eventoId) return { ok: false, motivo: "evento_indefinido" };
  if (resolucao.inscricao.eventoId !== eventoId) {
    return { ok: false, motivo: "outro_evento" };
  }
  return { ok: true };
}