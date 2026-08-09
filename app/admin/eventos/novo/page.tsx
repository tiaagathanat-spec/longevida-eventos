"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEventos, EventoStatus, EVENTO_STATUS_LABEL } from "@/lib/mock/eventos-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

export default function NovoEventoPage() {
  const router = useRouter();
  const { criar } = useEventos();

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState("");
  const [local, setLocal] = useState("");
  const [status, setStatus] = useState<EventoStatus>("rascunho");
  const [dataLimiteInscricoes, setDataLimiteInscricoes] = useState("");
  const [vagas, setVagas] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  function validar() {
    const novosErros: Record<string, string> = {};
    if (!nome.trim()) novosErros.nome = "Informe o nome do evento.";
    if (!data) novosErros.data = "Informe a data do evento.";
    if (!local.trim()) novosErros.local = "Informe o local do evento.";
    if (vagas && Number(vagas) <= 0) novosErros.vagas = "Informe um número válido de vagas.";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validar()) return;

    setEnviando(true);
    setErroEnvio(null);
    try {
      const evento = await criar({
        nome,
        descricao,
        data,
        local,
        status,
        dataLimiteInscricoes,
        vagas: vagas ? Number(vagas) : null,
      });
      router.push(`/admin/eventos/${evento.id}`);
    } catch (err) {
      setErroEnvio(err instanceof Error ? err.message : "Não foi possível criar o evento.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href="/admin/eventos"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Eventos
      </Link>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Novo evento</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Preencha as informações básicas. Modalidades, categorias, regulamento e fotos são
        configurados depois.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
        <Input
          id="nome"
          label="Nome do evento"
          placeholder="Ex: Copa Longevida de Natação"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          error={erros.nome}
        />

        <Textarea
          id="descricao"
          label="Descrição"
          placeholder="Conte brevemente do que se trata o evento"
          rows={4}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="data"
            type="date"
            label="Data"
            value={data}
            onChange={(e) => setData(e.target.value)}
            error={erros.data}
          />

          <Select
            id="status"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as EventoStatus)}
          >
            {(Object.keys(EVENTO_STATUS_LABEL) as EventoStatus[]).map((s) => (
              <option key={s} value={s}>
                {EVENTO_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>

        <Input
          id="local"
          label="Local"
          placeholder="Ex: Espaço Longevida — Piscina Olímpica"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          error={erros.local}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="dataLimiteInscricoes"
            type="date"
            label="Data limite de inscrições"
            value={dataLimiteInscricoes}
            onChange={(e) => setDataLimiteInscricoes(e.target.value)}
            helper="Opcional. Depois desta data as inscrições fecham automaticamente."
          />

          <Input
            id="vagas"
            type="number"
            min={0}
            label="Número de vagas"
            placeholder="Deixe vazio para ilimitado"
            value={vagas}
            onChange={(e) => setVagas(e.target.value)}
            error={erros.vagas}
          />
        </div>

        {erroEnvio && <p className="text-sm text-red-500">{erroEnvio}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Link href="/admin/eventos">
            <Button type="button" variant="ghost">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" isLoading={enviando}>
            Criar evento
          </Button>
        </div>
      </form>
    </div>
  );
}
