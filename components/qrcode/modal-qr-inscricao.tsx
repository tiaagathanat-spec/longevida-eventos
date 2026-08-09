"use client";

// Modal que exibe o QR Code de uma inscrição no Portal do Atleta,
// com o identificador legível para conferência manual e botão de
// download da imagem (PNG) para impressão.

import { QrCodeImagem } from "@/components/qrcode/qr-code-imagem";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

type ModalQrInscricaoProps = {
  aberto: boolean;
  onFechar: () => void;
  conteudo: string; // identificador único impresso no QR
  identificador: string;
  titulo?: string;
  subtitulo?: string;
};

export function ModalQrInscricao({
  aberto,
  onFechar,
  conteudo,
  identificador,
  titulo = "QR Code da inscrição",
  subtitulo,
}: ModalQrInscricaoProps) {
  function baixarPng() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = document.querySelector<HTMLImageElement>('[data-qr-inscricao]');
    if (!ctx || !img?.complete) return;

    canvas.width = 420;
    canvas.height = 460;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, (420 - 320) / 2, 20, 320, 320);

    ctx.fillStyle = "#0f172a";
    ctx.font = "600 18px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Inscrição confirmada", canvas.width / 2, 370);
    ctx.font = "14px monospace";
    ctx.fillText(identificador, canvas.width / 2, 398);

    const link = document.createElement("a");
    link.download = `qr-${identificador}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <Modal open={aberto} onClose={onFechar} title={titulo}>
      <div className="flex flex-col items-center gap-4">
        {subtitulo && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            {subtitulo}
          </p>
        )}
        <QrCodeImagem conteudo={conteudo} tamanho={220} />
        <div className="w-full rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Identificador
          </p>
          <p className="mt-1 break-all font-mono text-xs text-slate-700 dark:text-slate-300">
            {identificador}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={baixarPng} className="flex-1">
            Baixar QR (PNG)
          </Button>
          <Button variant="secondary" onClick={onFechar} className="flex-1">
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
