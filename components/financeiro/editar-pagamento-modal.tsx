"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  FormaPagamento,
  StatusPagamento,
  FORMA_PAGAMENTO_LABEL,
  STATUS_PAGAMENTO_LABEL,
} from "@/lib/mock/pagamentos-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";

export type LinhaFinanceiroEdicao = {
  inscricaoId: string;
  atletaNome: string;
  numeroPeito: string;
  valor: number;
  formaPagamento: FormaPagamento | null;
  status: StatusPagamento;
  dataPagamento: string | null;
};

type EditarPagamentoModalProps = {
  linha: LinhaFinanceiroEdicao | null;
  onClose: () => void;
  onSalvar: (dados: {
    numeroPeito: string;
    valor: number;
    formaPagamento: FormaPagamento | null;
    status: StatusPagamento;
    dataPagamento: string | null;
  }) => void;
};

export function EditarPagamentoModal({ linha, onClose, onSalvar }: EditarPagamentoModalProps) {
  const [numeroPeito, setNumeroPeito] = useState("");
  const [valor, setValor] = useState("0");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | "">("");
  const [status, setStatus] = useState<StatusPagamento>("pendente");
  const [dataPagamento, setDataPagamento] = useState("");

  useEffect(() => {
    if (!linha) return;
    setNumeroPeito(linha.numeroPeito);
    setValor(String(linha.valor));
    setFormaPagamento(linha.formaPagamento ?? "");
    setStatus(linha.status);
    setDataPagamento(linha.dataPagamento ?? "");
  }, [linha]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSalvar({
      numeroPeito: numeroPeito.trim(),
      valor: Number(valor) || 0,
      formaPagamento: formaPagamento === "" ? null : formaPagamento,
      status,
      dataPagamento: dataPagamento || null,
    });
  }

  return (
    <Modal open={!!linha} title={linha ? `Editar pagamento — ${linha.atletaNome}` : ""} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          id="numeroPeito"
          label="Número de peito"
          placeholder="Opcional"
          value={numeroPeito}
          onChange={(e) => setNumeroPeito(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="valor"
            type="number"
            min={0}
            step="0.01"
            label="Valor (R$)"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <Select
            id="formaPagamento"
            label="Forma de pagamento"
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento | "")}
          >
            <option value="">Não informado</option>
            {(Object.keys(FORMA_PAGAMENTO_LABEL) as FormaPagamento[]).map((f) => (
              <option key={f} value={f}>
                {FORMA_PAGAMENTO_LABEL[f]}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            id="status"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusPagamento)}
          >
            {(Object.keys(STATUS_PAGAMENTO_LABEL) as StatusPagamento[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_PAGAMENTO_LABEL[s]}
              </option>
            ))}
          </Select>
          <Input
            id="dataPagamento"
            type="date"
            label="Data do pagamento"
            value={dataPagamento}
            onChange={(e) => setDataPagamento(e.target.value)}
          />
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
