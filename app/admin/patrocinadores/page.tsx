"use client";

import { useState, FormEvent } from "react";
import { Handshake, Pencil, Plus, Trash2 } from "lucide-react";
import {
  usePatrocinadores,
  Patrocinador,
  CotaPatrocinio,
  COTA_LABEL,
} from "@/lib/mock/patrocinadores-store";
import { useEventos } from "@/lib/mock/eventos-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const COTA_STYLE: Record<CotaPatrocinio, string> = {
  ouro: "bg-amber-100 text-amber-600",
  prata: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  bronze: "bg-orange-100 text-orange-700",
  apoio: "bg-brand-blue/10 text-brand-blue",
};

type FormDados = {
  nome: string;
  siteUrl: string;
  descricao: string;
  cota: CotaPatrocinio;
  eventos: string[];
};

const FORM_VAZIO: FormDados = {
  nome: "",
  siteUrl: "",
  descricao: "",
  cota: "ouro",
  eventos: [],
};

export default function PatrocinadoresPage() {
  const { patrocinadores, criar, atualizar, excluir } = usePatrocinadores();
  const { eventos } = useEventos();

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormDados>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Patrocinador | null>(null);

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(p: Patrocinador) {
    setEditandoId(p.id);
    setForm({
      nome: p.nome,
      siteUrl: p.siteUrl,
      descricao: p.descricao,
      cota: p.cota,
      eventos: [...p.eventos],
    });
    setErro(null);
    setModalAberto(true);
  }

  function toggleEvento(eventoId: string) {
    setForm((atual) => ({
      ...atual,
      eventos: atual.eventos.includes(eventoId)
        ? atual.eventos.filter((e) => e !== eventoId)
        : [...atual.eventos, eventoId],
    }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.nome.trim()) {
      setErro("Informe o nome do patrocinador.");
      return;
    }
    if (editandoId) {
      atualizar(editandoId, form);
    } else {
      criar(form);
    }
    setModalAberto(false);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Patrocinadores
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Cadastre as marcas parceiras e vincule cada uma aos eventos em que participa.
          </p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus className="h-4 w-4" />
          Novo patrocinador
        </Button>
      </header>

      {patrocinadores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhum patrocinador cadastrado ainda.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">Patrocinador</th>
                <th className="px-4 py-3 font-medium">Cota</th>
                <th className="px-4 py-3 font-medium">Eventos</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {patrocinadores.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-brand-blue/10 p-2">
                        <Handshake className="h-4 w-4 text-brand-blue" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{p.nome}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {p.descricao || p.siteUrl || "Sem descrição"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COTA_STYLE[p.cota]}`}
                    >
                      {COTA_LABEL[p.cota]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {p.eventos.length === 0 ? (
                      <span className="text-slate-400 dark:text-slate-500">Nenhum</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {eventos
                          .filter((e) => p.eventos.includes(e.id))
                          .map((e) => (
                            <span
                              key={e.id}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {e.nome}
                            </span>
                          ))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        aria-label={`Editar ${p.nome}`}
                        onClick={() => abrirEdicao(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Excluir ${p.nome}`}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        onClick={() => setExcluindo(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalAberto}
        title={editandoId ? "Editar patrocinador" : "Novo patrocinador"}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            id="nome"
            label="Nome da marca"
            placeholder="Ex: Supermercado Bom Preço"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <Input
            id="siteUrl"
            label="Site (opcional)"
            placeholder="https://..."
            value={form.siteUrl}
            onChange={(e) => setForm({ ...form, siteUrl: e.target.value })}
          />
          <Textarea
            id="descricao"
            label="Descrição (opcional)"
            placeholder="O que o patrocinador apoia no evento?"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />
          <Select
            id="cota"
            label="Cota de patrocínio"
            value={form.cota}
            onChange={(e) => setForm({ ...form, cota: e.target.value as CotaPatrocinio })}
          >
            {(Object.keys(COTA_LABEL) as CotaPatrocinio[]).map((c) => (
              <option key={c} value={c}>
                {COTA_LABEL[c]}
              </option>
            ))}
          </Select>

          <div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Eventos em que participa
            </span>
            <div className="mt-2 flex flex-col gap-2">
              {eventos.map((e) => (
                <label
                  key={e.id}
                  className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={form.eventos.includes(e.id)}
                    onChange={() => toggleEvento(e.id)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  {e.nome}
                </label>
              ))}
            </div>
          </div>

          {erro && <p className="text-sm text-red-500">{erro}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit">{editandoId ? "Salvar" : "Cadastrar"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!excluindo}
        title="Excluir patrocinador"
        description={
          excluindo
            ? `Tem certeza que deseja excluir ${excluindo.nome}? Ele será removido dos eventos vinculados.`
            : ""
        }
        confirmLabel="Excluir"
        onCancel={() => setExcluindo(null)}
        onConfirm={() => {
          if (excluindo) excluir(excluindo.id);
          setExcluindo(null);
        }}
      />
    </div>
  );
}
