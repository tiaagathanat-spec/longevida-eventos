"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  CategoriaImagem,
  CATEGORIA_LABEL,
  CATEGORIAS_ORDENADAS,
  ImagemGaleria,
  Visibilidade,
} from "@/lib/mock/galeria-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";

type EditarImagemModalProps = {
  imagem: ImagemGaleria | null;
  onClose: () => void;
  onSalvar: (dados: { nome: string; categoria: CategoriaImagem; visibilidade: Visibilidade }) => void;
};

export function EditarImagemModal({ imagem, onClose, onSalvar }: EditarImagemModalProps) {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<CategoriaImagem>("evento");
  const [visibilidade, setVisibilidade] = useState<Visibilidade>("privada");

  useEffect(() => {
    if (!imagem) return;
    setNome(imagem.nome);
    setCategoria(imagem.categoria);
    setVisibilidade(imagem.visibilidade);
  }, [imagem]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nome.trim()) return;
    onSalvar({ nome: nome.trim(), categoria, visibilidade });
  }

  return (
    <Modal open={!!imagem} title="Editar imagem" onClose={onClose}>
      {imagem && (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagem.url} alt={imagem.nome} className="h-32 w-full rounded-lg object-cover" />

          <Input
            id="nome"
            label="Nome da imagem"
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

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar alterações</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
