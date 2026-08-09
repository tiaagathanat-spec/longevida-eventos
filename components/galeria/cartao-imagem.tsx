"use client";

import { Eye, Pencil, Trash2, Globe, Lock } from "lucide-react";
import { ImagemGaleria } from "@/lib/mock/galeria-store";

type CartaoImagemProps = {
  imagem: ImagemGaleria;
  onVisualizar: () => void;
  onEditar?: () => void;
  onExcluir?: () => void;
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function CartaoImagem({ imagem, onVisualizar, onEditar, onExcluir }: CartaoImagemProps) {
  const somenteLeitura = !onEditar && !onExcluir;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <button type="button" onClick={onVisualizar} className="block w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imagem.url} alt={imagem.nome} className="h-36 w-full object-cover" />
      </button>

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
            {imagem.nome}
          </p>
          {!somenteLeitura && (
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                imagem.visibilidade === "publica"
                  ? "bg-brand-green/10 text-brand-green"
                  : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {imagem.visibilidade === "publica" ? (
                <Globe className="h-3 w-3" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
              {imagem.visibilidade === "publica" ? "Pública" : "Privada"}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Enviada em {formatarData(imagem.enviadoEm)}
        </p>

        <div className="mt-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onVisualizar}
            aria-label={`Visualizar ${imagem.nome}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Eye className="h-4 w-4" />
          </button>
          {onEditar && (
            <button
              type="button"
              onClick={onEditar}
              aria-label={`Editar ${imagem.nome}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onExcluir && (
            <button
              type="button"
              onClick={onExcluir}
              aria-label={`Excluir ${imagem.nome}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
