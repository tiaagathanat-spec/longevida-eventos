"use client";

import { useState, FormEvent } from "react";
import { Wallet, Plus, History } from "lucide-react";
import { useCreditos, type MovimentacaoCredito } from "@/lib/mock/creditos-store";
import { formatarMoeda } from "@/lib/financeiro/pagamentos-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

const TIPO_MOVIMENTACAO_LABEL: Record<MovimentacaoCredito["tipo"], { texto: string; cls: string }> = {
  concedido: { texto: "Crédito concedido", cls: "bg-brand-green/10 text-brand-green" },
  utilizado: { texto: "Crédito utilizado", cls: "bg-amber-100 text-amber-600" },
  estornado: { texto: "Crédito devolvido", cls: "bg-brand-blue/10 text-brand-blue" },
};

type CreditosModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CreditosModal({ open, onClose }: CreditosModalProps) {
  const { creditos, movimentacoes, saldoDe, conceder } = useCreditos();
  const [clienteSelecionado, setClienteSelecionado] = useState("");
  const [novoCliente, setNovoCliente] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novoMotivo, setNovoMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const clientes = [
    // Clientes com saldo cadastrado, do maior saldo ao menor.
    ...creditos
      .filter((c) => c.saldo > 0)
      .sort((a, b) => b.saldo - a.saldo)
      .map((c) => c.clienteId),
    // Cliente selecionado pode ter sido excluído do filtro — garante a exibição.
    ...(clienteSelecionado && !creditos.some((c) => c.clienteId === clienteSelecionado)
      ? [clienteSelecionado]
      : []),
  ];

  const clienteAtivo = clienteSelecionado || (clientes[0] ?? "");
  const historico = movimentacoes
    .filter((m) => m.clienteId === clienteAtivo)
    .sort((a, b) =>
      a.data < b.data ? 1 : a.data > b.data ? -1 : a.id < b.id ? 1 : -1
    );

  function handleConceder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const valor = Number(novoValor) || 0;
    if (!novoCliente.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }
    if (valor <= 0) {
      setErro("Informe um valor maior que zero.");
      return;
    }
    conceder(novoCliente.trim(), valor, novoMotivo.trim() || "Crédito concedido manualmente");
    setErro(null);
    setNovoCliente("");
    setNovoValor("");
    setNovoMotivo("");
    setClienteSelecionado(novoCliente.trim());
  }

  return (
    <Modal open={open} title="Crédito pré-existente dos clientes" onClose={onClose}>
      <div className="flex flex-col gap-5">
        {/* Conceder crédito */}
        <form onSubmit={handleConceder} noValidate className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Plus className="h-4 w-4 text-brand-green" />
            Conceder crédito
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="creditoCliente"
              label="Cliente"
              placeholder="Nome do cliente/responsável"
              value={novoCliente}
              onChange={(e) => setNovoCliente(e.target.value)}
            />
            <Input
              id="creditoValor"
              type="number"
              min={0}
              step="0.01"
              label="Valor (R$)"
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
            />
          </div>
          <Input
            id="creditoMotivo"
            label="Origem / motivo (opcional)"
            placeholder='Ex.: "Estorno de inscrição", "Cortesia promoção"'
            value={novoMotivo}
            onChange={(e) => setNovoMotivo(e.target.value)}
          />
          {erro && <p className="text-xs font-medium text-red-500">{erro}</p>}
          <div className="flex justify-end">
            <Button type="submit" variant="secondary">
              Conceder
            </Button>
          </div>
        </form>

        {/* Saldo e histórico */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <Wallet className="h-4 w-4 text-brand-blue" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Saldo e histórico por cliente
            </p>
          </div>

          {clientes.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhum cliente com crédito cadastrado ainda. Conceda o primeiro
              crédito no formulário acima.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                {clientes.map((cliente) => (
                  <button
                    key={cliente}
                    type="button"
                    onClick={() => setClienteSelecionado(cliente)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      cliente === clienteAtivo
                        ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                        : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-900 dark:border-slate-800"
                    }`}
                  >
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {cliente}
                    </span>
                    <span className="ml-2 shrink-0 font-semibold text-slate-900 dark:text-white">
                      {formatarMoeda(saldoDe(cliente))}
                    </span>
                  </button>
                ))}
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <History className="h-3.5 w-3.5" />
                  Histórico de {clienteAtivo}
                </div>
                {historico.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                    Cliente sem movimentações ainda.
                  </div>
                ) : (
                  <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1">
                    {historico.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="min-w-0">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${TIPO_MOVIMENTACAO_LABEL[m.tipo].cls}`}
                          >
                            {TIPO_MOVIMENTACAO_LABEL[m.tipo].texto}
                          </span>
                          {m.motivo && (
                            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              {m.motivo}
                              {m.inscricaoId ? ` · Inscrição ${m.inscricaoId}` : ""}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {formatarMoeda(m.valor)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatarData(m.data)} · saldo {formatarMoeda(m.saldoApos)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}