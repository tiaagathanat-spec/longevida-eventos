"use client";

import { useEffect, useState, FormEvent } from "react";
import { Plus, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  FormaPagamento,
  StatusPagamento,
  FORMA_PAGAMENTO_LABEL,
  STATUS_PAGAMENTO_LABEL,
} from "@/lib/mock/pagamentos-store";
import { useCreditos } from "@/lib/mock/creditos-store";
import {
  conferirPagamento,
  formatarMoeda,
  normalizarItens,
  somarItens,
  type ItemPagamento,
} from "@/lib/financeiro/pagamentos-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";

export type LinhaFinanceiroEdicao = {
  inscricaoId: string;
  atletaNome: string;
  numeroPeito: string;
  valor: number;
  /** Valor da inscrição (prova), para a conferência do total. */
  valorInscricao: number;
  itens?: ItemPagamento[];
  formaPagamento: FormaPagamento | null;
  status: StatusPagamento;
  dataPagamento: string | null;
  observacao?: string;
  clienteId?: string;
};

type ItemEdicao = { id: string; forma: FormaPagamento; valor: string };

type EditarPagamentoModalProps = {
  linha: LinhaFinanceiroEdicao | null;
  /** Valor da inscrição/prova, para conferência do total. */
  valorInscricao: number;
  creditos: ReturnType<typeof useCreditos>;
  onClose: () => void;
  onSalvar: (dados: {
    numeroPeito: string;
    itens: ItemPagamento[];
    status: StatusPagamento;
    dataPagamento: string | null;
    observacao: string;
    clienteId: string;
  }) => void;
};

function gerarId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function EditarPagamentoModal({
  linha,
  valorInscricao,
  creditos,
  onClose,
  onSalvar,
}: EditarPagamentoModalProps) {
  const [numeroPeito, setNumeroPeito] = useState("");
  const [itens, setItens] = useState<ItemEdicao[]>([]);
  const [status, setStatus] = useState<StatusPagamento>("pendente");
  const [dataPagamento, setDataPagamento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!linha) return;
    setNumeroPeito(linha.numeroPeito);
    const inicial: ItemEdicao[] =
      linha.itens && linha.itens.length > 0
        ? linha.itens.map((i) => ({
            id: gerarId(),
            forma: i.forma,
            valor: String(i.valor),
          }))
        : [];
    setItens(inicial);
    setStatus(linha.status);
    setDataPagamento(linha.dataPagamento ?? "");
    setObservacao(linha.observacao ?? "");
    setClienteId(linha.clienteId ?? "");
    setErro(null);
  }, [linha]);

  function alterarItem(id: string, campos: Partial<ItemEdicao>) {
    setItens((atual) =>
      atual.map((i) => (i.id === id ? { ...i, ...campos } : i))
    );
  }

  function removerItem(id: string) {
    setItens((atual) => atual.filter((i) => i.id !== id));
  }

  function adicionarItem() {
    setItens((atual) => [...atual, { id: gerarId(), forma: "pix", valor: "0" }]);
  }

  // Ao sair de "pago", o crédito não pode ser consumido (não há
  // transação) — remove as linhas de crédito automaticamente.
  function alterarStatus(novo: StatusPagamento) {
    setStatus(novo);
    if (novo !== "pago") {
      setItens((atual) => atual.filter((i) => i.forma !== "credito"));
    }
  }

  const valorTotal = somarItens(
    itens.map((i) => ({ forma: i.forma, valor: Number(i.valor) || 0 }))
  );
  const conferencia = conferirPagamento(
    itens.map((i) => ({ forma: i.forma, valor: Number(i.valor) || 0 })),
    valorInscricao
  );

  const saldoCliente = creditos.saldoDe(clienteId.trim());
  const creditoUtilizado = itens
    .filter((i) => i.forma === "credito")
    .reduce((soma, i) => soma + (Number(i.valor) || 0), 0);
  const saldoAposCredito = saldoCliente - creditoUtilizado;
  const creditoInsuficiente = creditoUtilizado > saldoCliente + 0.0001;

  const formasDisponiveis = (Object.keys(FORMA_PAGAMENTO_LABEL) as FormaPagamento[]).filter(
    (f) => f !== "credito" || status === "pago"
  );

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const itensNormalizados = normalizarItens(
      itens.map((i) => ({ forma: i.forma, valor: Number(i.valor) || 0 }))
    );

    if (status === "pago" && itensNormalizados.length === 0) {
      setErro(
        "Para um pagamento 'Pago', informe ao menos uma forma de pagamento com valor."
      );
      return;
    }
    if (creditoInsuficiente) {
      setErro(
        `Crédito insuficiente: o saldo do cliente é ${formatarMoeda(
          saldoCliente
        )} e a transação usa ${formatarMoeda(creditoUtilizado)} de crédito.`
      );
      return;
    }
    setErro(null);
    onSalvar({
      numeroPeito: numeroPeito.trim(),
      itens: itensNormalizados,
      status,
      dataPagamento: dataPagamento || null,
      observacao: observacao.trim(),
      clienteId: clienteId.trim(),
    });
  }

  return (
    <Modal
      open={!!linha}
      title={linha ? `Editar pagamento — ${linha.atletaNome}` : ""}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="numeroPeito"
            label="Número de peito"
            placeholder="Opcional"
            value={numeroPeito}
            onChange={(e) => setNumeroPeito(e.target.value)}
          />
          <Input
            id="cliente"
            label="Cliente (para crédito pré-existente)"
            placeholder="Nome do cliente/responsável"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          />
        </div>

        {/* Formas de pagamento e respectivos valores */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Formas de pagamento
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={adicionarItem}
            >
              <Plus className="h-4 w-4" />
              Adicionar forma
            </Button>
          </div>

          {itens.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900">
              Nenhuma forma de pagamento informada.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {itens.map((item) => (
                <div
                  key={item.id}
                  className="flex items-end gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800"
                >
                  <div className="flex-1">
                    <Select
                      id={`item-forma-${item.id}`}
                      label="Forma"
                      value={item.forma}
                      onChange={(e) =>
                        alterarItem(item.id, {
                          forma: e.target.value as FormaPagamento,
                        })
                      }
                    >
                      {formasDisponiveis.map((f) => (
                        <option key={f} value={f}>
                          {FORMA_PAGAMENTO_LABEL[f]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-36">
                    <Input
                      id={`item-valor-${item.id}`}
                      type="number"
                      min={0}
                      step="0.01"
                      label="Valor (R$)"
                      value={item.valor}
                      onChange={(e) =>
                        alterarItem(item.id, { valor: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Remover forma de pagamento"
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => removerItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Total da transação + conferência com a inscrição */}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total da transação
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {formatarMoeda(valorTotal)}
              </p>
            </div>
            {linha && (
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Valor da inscrição
                </p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {formatarMoeda(valorInscricao)}
                </p>
              </div>
            )}
            {conferencia.confere ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-2.5 py-1 text-xs font-medium text-brand-green">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Confere com a inscrição
              </span>
            ) : (
              !conferencia.confere &&
              conferencia.referencia != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Diferença de {formatarMoeda(conferencia.diferenca)}
                </span>
              )
            )}
          </div>

          {/* Bloco de crédito pré-existente */}
          {itens.some((i) => i.forma === "credito") && (
            <div className="mt-3 rounded-xl border border-brand-green/30 bg-brand-green/5 p-3">
              <p className="text-xs font-medium text-brand-green">
                Crédito pré-existente
              </p>
              {clienteId.trim() ? (
                <>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-white p-2 dark:bg-slate-900">
                      <p className="text-slate-500 dark:text-slate-400">
                        Crédito disponível
                      </p>
                      <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                        {formatarMoeda(saldoCliente)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white p-2 dark:bg-slate-900">
                      <p className="text-slate-500 dark:text-slate-400">
                        Valor a utilizar
                      </p>
                      <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                        {formatarMoeda(creditoUtilizado)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white p-2 dark:bg-slate-900">
                      <p className="text-slate-500 dark:text-slate-400">
                        Saldo após utilização
                      </p>
                      <p
                        className={`mt-0.5 font-semibold ${
                          creditoInsuficiente
                            ? "text-red-500"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {formatarMoeda(Math.max(0, saldoAposCredito))}
                      </p>
                    </div>
                  </div>
                  {creditoInsuficiente && (
                    <p className="mt-2 text-xs font-medium text-red-500">
                      O crédito utilizado não pode ultrapassar o saldo
                      disponível do cliente.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Informe o cliente no campo acima para conferir o saldo
                  disponível.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            id="status"
            label="Status"
            value={status}
            onChange={(e) => alterarStatus(e.target.value as StatusPagamento)}
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

        <Textarea
          id="observacao"
          label="Observação (opcional)"
          placeholder='Ex.: "R$ 50 via Pix + R$ 30 em dinheiro"'
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />

        {erro && <p className="text-xs font-medium text-red-500">{erro}</p>}

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