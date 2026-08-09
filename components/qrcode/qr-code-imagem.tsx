"use client";

// Gera e exibe o QR Code de uma inscrição a partir do identificador
// único (conteúdo impresso no QR). Usa a lib `qrcode` para gerar a
// imagem em data URL no cliente — sem dependência de servidor.

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type QrCodeImagemProps = {
  conteudo: string; // identificador único da inscrição
  tamanho?: number;
  className?: string;
};

export function QrCodeImagem({
  conteudo,
  tamanho = 176,
  className,
}: QrCodeImagemProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    QRCode.toDataURL(conteudo, {
      width: tamanho,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => {
        if (!cancelado) setSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelado) setSrc(null);
      });
    return () => {
      cancelado = true;
    };
  }, [conteudo, tamanho]);

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 ${className ?? ""}`}
        style={{ width: tamanho, height: tamanho }}
      >
        <span className="text-xs text-slate-400">Gerando…</span>
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt="QR Code da inscrição"
      data-qr-inscricao="true"
      width={tamanho}
      height={tamanho}
      className={`rounded-xl border border-slate-200 bg-white dark:border-slate-700 ${className ?? ""}`}
    />
  );
}
