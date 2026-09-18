"use client";

// Store do módulo de QR Codes das inscrições, em memória (Context +
// useState) persistido no Supabase via `app_qrcodes`. Mesmo padrão dos
// demais módulos.
//
// Corresponde à tabela `app_qrcodes`: cada inscrição ganha um QR Code com
// identificador único e seguro (o conteúdo impresso no QR), que a
// Organização lê no dia do evento para abrir a tela "após leitura" com as
// ações de check-in/kit.
//
// O QR é criado de forma preguiçosa: a primeira vez que uma inscrição
// é consultada (portal, impressão ou leitor), o identificador é gerado e
// persistido. Toda inscrição — inclusive as semeadas via banco — possui QR.
//
// A localização pelo identificador usa `lib/qrcodes/resolver.ts` (lógica
// pura, testada): normaliza a leitura da câmera (BOM/controles/espaços),
// compara de forma tolerante e NUNCA usa nome de atleta.

import { createContext, useContext, useMemo, useState, ReactNode, useEffect } from "react";
import { usePersistencia, buscarLinhas, gravarLinhas } from "@/lib/supabase/persistencia";
import { localizarQrPorIdentificador, normalizarIdentificador } from "@/lib/qrcodes/resolver";

export type LeituraQrCode = {
  id: string;
  lidaEm: string; // ISO datetime
  local?: string;
  usuario?: string;
};

export type InscricaoQrCode = {
  id: string;
  inscricaoId: string;
  identificador: string; // conteúdo impresso no QR (único)
  ativo: boolean;
  criadoEm: string; // ISO datetime
  leituras: LeituraQrCode[];
};

type QrCodesContextValue = {
  qrCodes: InscricaoQrCode[];
  pronto: boolean;
  erro: string | null;
  obterPorInscricao: (inscricaoId: string) => InscricaoQrCode | undefined;
  localizarPorIdentificador: (identificador: string) => InscricaoQrCode | undefined;
  // Fallback direto ao banco (não depende do estado em memória): retorna o
  // QR da inscrição e o adiciona ao estado local quando encontrado.
  buscarPorIdentificadorNoBanco: (identificador: string) => Promise<InscricaoQrCode | null>;
  registrarLeitura: (
    inscricaoId: string,
    dados?: { local?: string; usuario?: string }
  ) => void;
  alternarAtivo: (inscricaoId: string, ativo: boolean) => void;
};

const QrCodesContext = createContext<QrCodesContextValue | null>(null);

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

function gerarIdentificador() {
  // Identificador único/seguro do QR: prefixo fixo + aleatório longo,
  // para não ser adivinhado nem confundido com outro conteúdo.
  return "LQ-" + gerarId() + gerarId() + gerarId();
}

export function QrCodesProvider({ children }: { children: ReactNode }) {
  const {
    dados: qrCodes,
    setDados: setQrCodes,
    pronto,
    erro,
  } = usePersistencia<InscricaoQrCode>("app_qrcodes", [], { ordem: "id" });

  const value = useMemo<QrCodesContextValue>(
    () => ({
      qrCodes,
      pronto,
      erro,
      obterPorInscricao: (inscricaoId) => {
        const existente = qrCodes.find((q) => q.inscricaoId === inscricaoId);
        if (existente) return existente;

        // Cria preguiçosamente na primeira consulta.
        const novo: InscricaoQrCode = {
          id: gerarId(),
          inscricaoId,
          identificador: gerarIdentificador(),
          ativo: true,
          criadoEm: new Date().toISOString(),
          leituras: [],
        };
        setQrCodes((atual) => [...atual, novo]);
        return novo;
      },
      localizarPorIdentificador: (identificador) =>
        localizarQrPorIdentificador(qrCodes, identificador),
      buscarPorIdentificadorNoBanco: async (identificador) => {
        const local = localizarQrPorIdentificador(qrCodes, identificador);
        if (local) return local;
        const normal = normalizarIdentificador(identificador);
        if (!normal) return null;
        try {
          const linhas = await buscarLinhas<InscricaoQrCode>(
            "app_qrcodes",
            "identificador",
            normal
          );
          const encontrado = linhas?.[0];
          if (encontrado) {
            setQrCodes((atual) =>
              atual.some((q) => q.id === encontrado.id) ? atual : [encontrado, ...atual]
            );
          }
          return encontrado ?? null;
        } catch {
          return null;
        }
      },
      registrarLeitura: async (inscricaoId, dados) => {
        const leitura: LeituraQrCode = {
          id: gerarId(),
          lidaEm: new Date().toISOString(),
          local: dados?.local,
          usuario: dados?.usuario,
        };
        const existente = qrCodes.find((q) => q.inscricaoId === inscricaoId);

        // Em memória: atualiza e deixa a sincronização persistir.
        if (existente) {
          setQrCodes((atual) =>
            atual.map((q) =>
              q.inscricaoId === inscricaoId
                ? { ...q, leituras: [...q.leituras, leitura] }
                : q
            )
          );
          return;
        }

        // Fora de memória (ex.: resolução via banco direto no leitor):
        // busca a linha e grava a leitura de forma idempotente. Se a
        // inscrição ainda não tem QR, cria um (comportamento preguiçoso).
        const linhas = await buscarLinhas<InscricaoQrCode>(
          "app_qrcodes",
          "inscricao_id",
          inscricaoId
        );
        const linhaNoBanco = linhas?.find((q) => q.inscricaoId === inscricaoId);
        const alvo = linhaNoBanco ?? {
          id: gerarId(),
          inscricaoId,
          identificador: gerarIdentificador(),
          ativo: true,
          criadoEm: new Date().toISOString(),
          leituras: [] as LeituraQrCode[],
        };
        await gravarLinhas<InscricaoQrCode>(
          "app_qrcodes",
          [
            {
              ...alvo,
              leituras: [...alvo.leituras, leitura],
            },
          ],
          "id"
        );
        setQrCodes((atual) =>
          atual.some((q) => q.inscricaoId === inscricaoId)
            ? atual
            : [
                { ...alvo, leituras: [...alvo.leituras, leitura] },
                ...atual,
              ]
        );
      },
      alternarAtivo: (inscricaoId, ativo) => {
        setQrCodes((atual) =>
          atual.map((q) => (q.inscricaoId === inscricaoId ? { ...q, ativo } : q))
        );
      },
    }),
    [qrCodes, pronto, erro]
  );

  return <QrCodesContext.Provider value={value}>{children}</QrCodesContext.Provider>;
}

export function useQrCodes() {
  const ctx = useContext(QrCodesContext);
  if (!ctx) {
    throw new Error("useQrCodes precisa ser usado dentro de <QrCodesProvider>");
  }
  return ctx;
}

// Hook de conveniência: retorna o QR Code de uma inscrição, criando-o
// de forma preguiçosa em um efeito (evita setState durante render). Se
// ainda não existir, retorna undefined na primeira renderização.
export function useQrDaInscricao(inscricaoId: string) {
  const { qrCodes, obterPorInscricao } = useQrCodes();

  const existente = qrCodes.find((q) => q.inscricaoId === inscricaoId);

  useEffect(() => {
    if (!existente) obterPorInscricao(inscricaoId);
  }, [existente, inscricaoId, obterPorInscricao]);

  return existente;
}