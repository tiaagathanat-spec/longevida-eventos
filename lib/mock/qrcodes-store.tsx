"use client";

// Store temporário do módulo de QR Codes das inscrições, em memória
// (Context + useState). Mesmo padrão dos demais módulos: substituir por
// Server Actions + Prisma quando o backend real entrar.
//
// Corresponde às tabelas `inscricao_qr_codes` e `leitura_qr_codes` da
// modelagem: cada inscrição ganha um QR Code com identificador único e
// seguro (o conteúdo impresso no QR), que a Organização lê no dia do
// evento para abrir a tela "após leitura" com as ações de check-in/kit.
//
// O QR é criado de forma preguiçosa: a primeira vez que uma inscrição
// é consultada (portal ou leitor), o identificador é gerado. Assim toda
// inscrição — inclusive as semeadas nos mocks — já possui QR sem
// alterar os stores existentes.

import { createContext, useContext, useMemo, useState, ReactNode, useEffect } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";

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
  } = usePersistencia<InscricaoQrCode>(
    "app_qrcodes",
    [],
    { ordem: "id" }
  );

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
        qrCodes.find((q) => q.identificador === identificador),
      registrarLeitura: (inscricaoId, dados) => {
        setQrCodes((atual) =>
          atual.map((q) =>
            q.inscricaoId === inscricaoId
              ? {
                  ...q,
                  leituras: [
                    ...q.leituras,
                    {
                      id: gerarId(),
                      lidaEm: new Date().toISOString(),
                      local: dados?.local,
                      usuario: dados?.usuario,
                    },
                  ],
                }
              : q
          )
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
