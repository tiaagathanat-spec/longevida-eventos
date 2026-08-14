"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { UploadCloud, ImageOff, Loader2 } from "lucide-react";
import {
  CategoriaImagem,
  CATEGORIA_LABEL,
  CATEGORIAS_ORDENADAS,
  Visibilidade,
} from "@/lib/mock/galeria-store";
import { tipoDaMidia, ehMidiaSuportada, TipoMidia } from "@/lib/mock/galeria-midias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";

const TAMANHO_MAXIMO = 100 * 1024 * 1024; // 100 MB

type UploadImagemModalProps = {
  open: boolean;
  categoriaInicial?: CategoriaImagem;
  onClose: () => void;
  onEnviar: (dados: {
    nome: string;
    categoria: CategoriaImagem;
    visibilidade: Visibilidade;
    tipo: TipoMidia;
    arquivo: File;
  }) => Promise<void>;
};

export function UploadImagemModal({
  open,
  categoriaInicial,
  onClose,
  onEnviar,
}: UploadImagemModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoMidia>("imagem");
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<CategoriaImagem>(categoriaInicial ?? "evento");
  const [visibilidade, setVisibilidade] = useState<Visibilidade>("privada");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Revoga a URL de pré-visualização quando ela muda ou ao desmontar.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Mantém o formulário sincronizado quando o modal abre ou quando a
  // categoria inicial muda (ex: clique no botão de upload dentro da aba
  // de uma categoria específica).
  useEffect(() => {
    if (open) {
      setCategoria(categoriaInicial ?? "evento");
    }
  }, [open, categoriaInicial]);

  function limparPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setArquivo(null);
  }

  function resetar() {
    limparPreview();
    setTipo("imagem");
    setNome("");
    setCategoria(categoriaInicial ?? "evento");
    setVisibilidade("privada");
    setErro(null);
    setEnviando(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    if (enviando) return;
    resetar();
    onClose();
  }

  function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const selecionado = e.target.files?.[0];
    if (!selecionado) return;

    if (!ehMidiaSuportada(selecionado.type)) {
      setErro("Selecione um arquivo de imagem ou vídeo (MP4, WebM ou OGG).");
      return;
    }

    if (selecionado.size > TAMANHO_MAXIMO) {
      setErro("O arquivo excede o limite de 100 MB.");
      return;
    }

    setErro(null);
    setTipo(tipoDaMidia(selecionado.type));
    if (!nome) setNome(selecionado.name.replace(/\.[^/.]+$/, ""));

    limparPreview();
    setArquivo(selecionado);
    setPreviewUrl(URL.createObjectURL(selecionado));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!arquivo) {
      setErro("Selecione um arquivo de imagem ou vídeo para enviar.");
      return;
    }
    if (!nome.trim()) {
      setErro("Informe um nome para a mídia.");
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      await onEnviar({ nome: nome.trim(), categoria, visibilidade, tipo, arquivo });
      resetar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao enviar o arquivo.");
      setEnviando(false);
    }
  }

  return (
    <Modal open={open} title="Enviar mídia" onClose={handleClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Arquivo
          </label>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-brand-blue/50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
          >
            {previewUrl ? (
              tipo === "video" ? (
                <video
                  src={previewUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-28 w-full rounded-lg object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Pré-visualização"
                  className="h-28 w-full rounded-lg object-cover"
                />
              )
            ) : (
              <>
                <UploadCloud className="h-6 w-6 text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Clique para escolher um arquivo de imagem ou vídeo
                </span>
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime"
            onChange={handleArquivoSelecionado}
            className="hidden"
          />
        </div>

        <Input
          id="nome"
          label="Nome da mídia"
          placeholder="Ex: Vídeo demonstrativo do percurso"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={enviando}
        />

        <Select
          id="categoria"
          label="Categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaImagem)}
          disabled={enviando}
        >
          {CATEGORIAS_ORDENADAS.map((c) => (
            <option key={c} value={c}>
              {CATEGORIA_LABEL[c]}
            </option>
          ))}
        </Select>

        <Select
          id="visibilidade"
          label="Visibilidade"
          value={visibilidade}
          onChange={(e) => setVisibilidade(e.target.value as Visibilidade)}
          disabled={enviando}
        >
          <option value="privada">Privada (só admin/organização)</option>
          <option value="publica">Pública (visível aos atletas)</option>
        </Select>

        {erro && (
          <p role="alert" className="flex items-center gap-1.5 text-sm text-red-500">
            <ImageOff className="h-4 w-4" />
            {erro}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando…
              </>
            ) : (
              "Enviar"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
