"use client";

import { X } from "lucide-react";
import { ImagemGaleria } from "@/lib/mock/galeria-store";

type VisualizarImagemModalProps = {
  imagem: ImagemGaleria | null;
  onClose: () => void;
};

export function VisualizarImagemModal({ imagem, onClose }: VisualizarImagemModalProps) {
  if (!imagem) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 px-4"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="max-h-[85vh] max-w-3xl" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagem.url}
          alt={imagem.nome}
          className="max-h-[75vh] w-full rounded-xl object-contain"
        />
        <p className="mt-3 text-center text-sm text-white/80">{imagem.nome}</p>
      </div>
    </div>
  );
}
