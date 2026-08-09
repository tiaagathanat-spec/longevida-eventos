"use client";

import { useEffect, useState, FormEvent } from "react";
import { CorFaixa, COR_FAIXA_LABEL } from "@/lib/mock/faixas-numeracao-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";

export type FaixaEmEdicao = {
  grupoId: string;
  grupoNome: string;
  numeroInicial: number;
  numeroFinal: number;
  cor: CorFaixa;
};

type EditarFaixaModalProps = {
  faixa: FaixaEmEdicao | null;
  onClose: () => void;
  onSalvar: (dados: { numeroInicial: number; numeroFinal: number; cor: CorFaixa }) => void;
};

export function EditarFaixaModal({ faixa, onClose, onSalvar }: EditarFaixaModalProps) {
  const [numeroInicial, setNumeroInicial] = useState("1");
  const [numeroFinal, setNumeroFinal] = useState("20");
  const [cor, setCor] = useState<CorFaixa>("azul");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!faixa) return;
    setNumeroInicial(String(faixa.numeroInicial));
    setNumeroFinal(String(faixa.numeroFinal));
    setCor(faixa.cor);
    setErro(null);
  }, [faixa]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const inicio = Number(numeroInicial);
    const fim = Number(numeroFinal);

    if (!inicio || !fim || inicio < 1) {
      setErro("Informe números válidos.");
      return;
    }
    if (fim < inicio) {
      setErro("O número final deve ser maior ou igual ao inicial.");
      return;
    }

    onSalvar({ numeroInicial: inicio, numeroFinal: fim, cor });
  }

  return (
    <Modal
      open={!!faixa}
      title={faixa ? `Faixa de numeração — ${faixa.grupoNome}` : ""}
      onClose={onClose}
    >
      {faixa && (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="numeroInicial"
              type="number"
              min={1}
              label="Número inicial"
              value={numeroInicial}
              onChange={(e) => setNumeroInicial(e.target.value)}
            />
            <Input
              id="numeroFinal"
              type="number"
              min={1}
              label="Número final"
              value={numeroFinal}
              onChange={(e) => setNumeroFinal(e.target.value)}
            />
          </div>

          <Select
            id="cor"
            label="Cor da faixa (crachá)"
            value={cor}
            onChange={(e) => setCor(e.target.value as CorFaixa)}
          >
            {(Object.keys(COR_FAIXA_LABEL) as CorFaixa[]).map((c) => (
              <option key={c} value={c}>
                {COR_FAIXA_LABEL[c]}
              </option>
            ))}
          </Select>

          {erro && <p className="text-sm text-red-500">{erro}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar faixa</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
