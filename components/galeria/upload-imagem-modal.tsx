"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { UploadCloud, ImageOff } from "lucide-react";
import {
  CategoriaImagem,
  CATEGORIA_LABEL,
  CATEGORIAS_ORDENADAS,
  Visibilidade,
} from "@/lib/mock/galeria-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";

type UploadImagemModalProps = {
  open: boolean;
  categoriaInicial?: CategoriaImagem;
  onClose: () => void;
  onEnviar: (dados: {
    nome: string;
    categoria: CategoriaImagem;
    visibilidade: Visibilidade;
    url: string;
  }) => void;
};

export function UploadImagemModal({
  open,
  categoriaInicial,
  onClose,
  onEnviar,
}: UploadImagemModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivoUrl, setArquivoUrl] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<CategoriaImagem>(categoriaInicial ?? "evento");
  const [visibilidade, setVisibilidade] = useState<Visibilidade>("privada");
  const [erro, setErro] = useState<string | null>(null);

  // Mantém o formulário sincronizado quando o modal abre ou quando a
  // categoria inicial muda (ex: clique no botão de upload dentro da aba
  // de uma categoria específica).
  useEffect(() => {
    if (open) {
      setCategoria(categoriaInicial ?? "evento");
    }
  }, [open, categoriaInicial]);

  function resetar() {
    setArquivoUrl(null);
    setNome("");
    setCategoria(categoriaInicial ?? "evento");
    setVisibilidade("privada");
    setErro(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    resetar();
    onClose();
  }

  function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      setErro("Selecione um arquivo de imagem.");
      return;
    }

    setErro(null);
    if (!nome) setNome(arquivo.name.replace(/\.[^/.]+$/, ""));

    const leitor = new FileReader();
    leitor.onload = () => setArquivoUrl(leitor.result as string);
    leitor.readAsDataURL(arquivo);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!arquivoUrl) {
      setErro("Selecione uma imagem para enviar.");
      return;
    }
    if (!nome.trim()) {
      setErro("Informe um nome para a imagem.");
      return;
    }

    onEnviar({ nome: nome.trim(), categoria, visibilidade, url: arquivoUrl });
    resetar();
  }

  return (
    <Modal open={open} title="Enviar imagem" onClose={handleClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Arquivo
          </label>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-brand-blue/50 dark:border-slate-700 dark:bg-slate-900"
          >
            {arquivoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={arquivoUrl}
                alt="Pré-visualização"
                className="h-28 w-full rounded-lg object-cover"
              />
            ) : (
              <>
                <UploadCloud className="h-6 w-6 text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Clique para escolher uma imagem
                </span>
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleArquivoSelecionado}
            className="hidden"
          />
        </div>

        <Input
          id="nome"
          label="Nome da imagem"
          placeholder="Ex: Banner principal"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <Select
          id="categoria"
          label="Categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaImagem)}
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
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit">Enviar</Button>
        </div>
      </form>
    </Modal>
  );
}
