"use client";

import { useState, FormEvent, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Calendar, User, Info } from "lucide-react";
import { useInscricoes, type Inscricao, type InscricaoStatus } from "@/lib/mock/inscricoes-store";
import { useAtletas, type Atleta } from "@/lib/mock/atletas-store";
import { buscarAtletaPorNome } from "@/lib/inscricoes/computed";
import { useEventos } from "@/lib/mock/eventos-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useTiposProva, type TipoProva } from "@/lib/mock/tipos-prova-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import { usePagamentos } from "@/lib/mock/pagamentos-store";
import { normalizarNomePessoa } from "@/lib/utils/nomes";
import { determinarTipoInscricao, montarProvaCompleta, obterParticipantesComputados, calcularIdadeAtleta, formatarDistanciaMetros } from "@/lib/inscricoes/computed";
import { calcularIdadeNaData, formatarData } from "@/lib/idade";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";

export default function EditarInscricaoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const inscricaoId = params.id;

  const { inscricoes, atualizar: atualizarInscricao } = useInscricoes();
  const { atletas, atualizar: atualizarAtleta } = useAtletas();
  const { eventos } = useEventos();
  const { provas, listarPorEvento } = useProvas();
  const { categorias } = useCategorias();
  const { modalidades } = useModalidades();
  const { tiposProva } = useTiposProva();
  const { obterPorInscricao: obterDorsal } = useDorsais();
  const { obterPorInscricao: obterPagamento } = usePagamentos();

  const inscricao = inscricoes.find((i) => i.id === inscricaoId);
  const atletaPrincipal = inscricao ? buscarAtletaPorNome(inscricao.atletaNome, atletas) : undefined;
  const atleta2 = inscricao?.atletaNome2 ? buscarAtletaPorNome(inscricao.atletaNome2, atletas) : undefined;
  const atleta3 = inscricao?.atletaNome3 ? buscarAtletaPorNome(inscricao.atletaNome3, atletas) : undefined;
  const atleta4 = inscricao?.atletaNome4 ? buscarAtletaPorNome(inscricao.atletaNome4, atletas) : undefined;

  const prova = inscricao ? provas.find((p) => p.id === inscricao.provaId) : undefined;
  const evento = inscricao ? eventos.find((e) => e.id === inscricao.eventoId) : undefined;
  const provaCompleta = prova ? montarProvaCompleta(prova, modalidades, categorias, tiposProva) : undefined;
  const tipoInscricao = provaCompleta ? determinarTipoInscricao(provaCompleta.tipoProva) : "individual";
  const dorsal = inscricao ? obterDorsal(inscricao.id) : undefined;
  const pagamento = inscricao ? obterPagamento(inscricao.id) : undefined;
  const provasDoEvento = evento ? listarPorEvento(evento.id) : [];

  const participantes = provaCompleta && evento
    ? obterParticipantesComputados(inscricao!, provaCompleta, atletas, evento.data)
    : [];

  const idadePrincipal = atletaPrincipal && evento
    ? calcularIdadeNaData(atletaPrincipal.dataNascimento, evento.data)
    : null;

  type FormState = {
    atletaNome: string;
    dataNascimento: string;
    categoriaId: string;
    genero: "" | "masculino" | "feminino" | "outro";
    cpf: string;
    endereco: string;
    email: string;
    telefone: string;
    contatoEmergenciaNome: string;
    contatoEmergenciaTelefone: string;
    observacoesSaude: string;
    responsavelNome: string;
    responsavelTelefone: string;
    responsavelCpf: string;
    parentesco: string;
    atletaNome2: string;
    atletaNome3: string;
    atletaNome4: string;
    status: InscricaoStatus;
    observacoes: string;
    numeroPeito: string;
    provaId: string;
  };

  const [form, setForm] = useState<FormState>({
    // Atleta principal
    atletaNome: inscricao?.atletaNome ?? "",
    dataNascimento: atletaPrincipal?.dataNascimento ?? "",
    categoriaId: atletaPrincipal?.categoriaId ?? "",
    genero: atletaPrincipal?.genero ?? "",
    cpf: atletaPrincipal?.cpf ?? "",
    endereco: atletaPrincipal?.endereco ?? "",
    email: atletaPrincipal?.email ?? "",
    telefone: atletaPrincipal?.telefone ?? "",
    contatoEmergenciaNome: atletaPrincipal?.contatoEmergenciaNome ?? "",
    contatoEmergenciaTelefone: atletaPrincipal?.contatoEmergenciaTelefone ?? "",
    observacoesSaude: atletaPrincipal?.observacoesSaude ?? "",
    responsavelNome: atletaPrincipal?.responsavelNome ?? "",
    responsavelTelefone: atletaPrincipal?.responsavelTelefone ?? "",
    responsavelCpf: atletaPrincipal?.responsavelCpf ?? "",
    parentesco: atletaPrincipal?.parentesco ?? "",

    // Participantes extras (dupla/equipe)
    atletaNome2: inscricao?.atletaNome2 ?? "",
    atletaNome3: inscricao?.atletaNome3 ?? "",
    atletaNome4: inscricao?.atletaNome4 ?? "",

    // Inscrição
    status: (inscricao?.status ?? "pendente") as InscricaoStatus,
    observacoes: inscricao?.observacoes ?? "",
    numeroPeito: inscricao?.numeroPeito ?? "",

    // Prova/Categoria (para alteração)
    provaId: inscricao?.provaId ?? "",
  });

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mostrarDadosAtleta, setMostrarDadosAtleta] = useState(true);

  if (!inscricao) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Inscrição não encontrada</h1>
        <p className="mt-2 text-slate-500">O código da inscrição não foi encontrado.</p>
        <Link href="/admin/inscricoes" className="inline-block mt-4 text-brand-blue hover:underline">
          Voltar para inscrições
        </Link>
      </div>
    );
  }

  const categoriasDaProva = useMemo(() => {
    if (!form.provaId) return categorias;
    const p = provas.find((pr) => pr.id === form.provaId);
    return p ? categorias.filter((c) => c.id === p.categoriaId) : categorias;
  }, [form.provaId, provas, categorias]);

  const atletasFiltrados = useMemo(() => {
    return atletas.filter((a) => a.nome.toLowerCase().includes(form.atletaNome.toLowerCase()));
  }, [atletas, form.atletaNome]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!inscricao) return;
    setSalvando(true);
    setErro(null);
    try {
      // Atualizar atleta principal se vinculado
      if (atletaPrincipal) {
        atualizarAtleta(atletaPrincipal.id, {
          nome: normalizarNomePessoa(form.atletaNome),
          dataNascimento: form.dataNascimento,
          categoriaId: form.categoriaId || atletaPrincipal.categoriaId,
          genero: form.genero,
          cpf: form.cpf,
          endereco: form.endereco,
          email: form.email,
          telefone: form.telefone,
          contatoEmergenciaNome: form.contatoEmergenciaNome,
          contatoEmergenciaTelefone: form.contatoEmergenciaTelefone,
          observacoesSaude: form.observacoesSaude,
          responsavelNome: form.responsavelNome,
          responsavelTelefone: form.responsavelTelefone,
          responsavelCpf: form.responsavelCpf,
          parentesco: form.parentesco,
        } as Omit<Atleta, "id">);
      }

      // Atualizar inscrição
      const provaSelecionada = provas.find((p) => p.id === form.provaId);
      const eventoDaProva = provaSelecionada ? eventos.find((e) => e.id === provaSelecionada.eventoId) : undefined;

      atualizarInscricao(inscricao.id, {
        atletaNome: normalizarNomePessoa(form.atletaNome),
        atletaNome2: form.atletaNome2 ? normalizarNomePessoa(form.atletaNome2) : undefined,
        atletaNome3: form.atletaNome3 ? normalizarNomePessoa(form.atletaNome3) : undefined,
        atletaNome4: form.atletaNome4 ? normalizarNomePessoa(form.atletaNome4) : undefined,
        status: form.status,
        provaId: form.provaId || inscricao.provaId,
        eventoId: eventoDaProva?.id || inscricao.eventoId,
        numeroPeito: inscricao.numeroPeito, // NÃO altera - controlado pela lógica de dorsais
        observacoes: form.observacoes || undefined,
      });

      router.push("/admin/inscricoes");
    } catch (err) {
      setErro("Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  const idadeCalculada = form.dataNascimento && evento
    ? calcularIdadeNaData(form.dataNascimento, evento.data)
    : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8">
        <Link href="/admin/inscricoes" className="text-sm text-brand-blue hover:underline">← Voltar para inscrições</Link>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mt-2">Editar Inscrição</h1>
        <p className="text-sm text-slate-500 mt-1">
          {evento?.nome} — {provaCompleta?.categoria?.nome} · {provaCompleta?.modalidade?.nome}
          {provaCompleta?.tipoProva && ` · ${provaCompleta.tipoProva.nome}`}
        </p>
      </header>

      <AlertaPersistencia erro={erro} />

      <form onSubmit={salvar} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        {/* INFORMAÇÕES DO EVENTO/PROVA (somente leitura) */}
        <fieldset className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" /> Informações da Prova (somente leitura)
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400">Evento</label>
              <p className="font-medium text-slate-900 dark:text-white">{evento?.nome ?? "—"}</p>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400">Modalidade</label>
              <p className="font-medium text-slate-900 dark:text-white">{provaCompleta?.modalidade?.nome ?? "—"}</p>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400">Categoria</label>
              <p className="font-medium text-slate-900 dark:text-white">{provaCompleta?.categoria?.nome ?? "—"}</p>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400">Tipo de inscrição</label>
              <p className="font-medium text-slate-900 dark:text-white capitalize">{tipoInscricao}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs text-slate-500 dark:text-slate-400">Prova / Bateria</label>
              <p className="font-medium text-slate-900 dark:text-white">{provaCompleta?.horario ? `${provaCompleta.horario} — ` : ""}{provaCompleta?.tipoProva?.nome ?? "—"}</p>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400">Distância / Percurso</label>
              <p className="font-medium text-slate-900 dark:text-white">{formatarDistanciaMetros(provaCompleta?.modalidade?.distanciaMetros ?? null)}</p>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400">Identificação</label>
              <p className="font-medium text-slate-900 dark:text-white capitalize">{provaCompleta?.tipoIdentificacao ?? "dorsal"}</p>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400">Número de peito</label>
              <p className="font-medium text-slate-900 dark:text-white text-lg">
                {dorsal ? dorsal.numero : (inscricao.numeroPeito ? inscricao.numeroPeito : "—")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Controlado automaticamente — não editável</p>
            </div>
          </div>
        </fieldset>

        {/* ALTERAR PROVA/CATEGORIA */}
        {provasDoEvento.length > 1 && (
          <fieldset className="rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <legend className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Alterar Prova / Categoria
            </legend>
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
              Alterar a prova pode afetar categoria, valor, numeração e QR Code. Use com cautela.
            </p>
            <Select
              label="Prova"
              value={form.provaId}
              onChange={(e) => setForm((f) => ({ ...f, provaId: e.target.value }))}
            >
              {provasDoEvento.map((p) => {
                const cat = categorias.find((c) => c.id === p.categoriaId);
                const mod = modalidades.find((m) => m.id === p.modalidadeId);
                const tp = tiposProva.find((t) => t.id === p.tipoProvaId);
                return (
                  <option key={p.id} value={p.id}>
                    {mod?.nome} · {cat?.nome} · {tp?.nome} {p.horario ? `(${p.horario})` : ""} — R$ {p.valor.toFixed(2)}
                  </option>
                );
              })}
            </Select>
          </fieldset>
        )}

        {/* ATLETA PRINCIPAL */}
        <fieldset>
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <User className="h-4 w-4" /> Atleta Principal
            {atletaPrincipal && (
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                (vinculado: {atletaPrincipal.id})
              </span>
            )}
          </legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nome completo *"
              value={form.atletaNome}
              onChange={(e) => setForm((f) => ({ ...f, atletaNome: e.target.value }))}
              required
            />

            <div className="sm:grid grid-cols-2 gap-3">
              <Input
                label="Data de nascimento"
                type="date"
                value={form.dataNascimento}
                onChange={(e) => setForm((f) => ({ ...f, dataNascimento: e.target.value }))}
              />
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Idade no evento</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 font-mono text-lg">
                  {idadeCalculada !== null ? `${idadeCalculada} anos` : "—"}
                </div>
              </div>
            </div>

            <Select
              label="Gênero"
              value={form.genero}
              onChange={(e) => setForm((f) => ({ ...f, genero: (e.target.value || "") as "" | "masculino" | "feminino" | "outro" }))}
            >
              <option value="">Não informado</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
            </Select>

            <Select
              label="Categoria do atleta"
              value={form.categoriaId}
              onChange={(e) => setForm((f) => ({ ...f, categoriaId: e.target.value }))}
            >
              <option value="">Selecione</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} {c.idadeMinima != null || c.idadeMaxima != null
                    ? `(${c.idadeMinima ?? 0}–${c.idadeMaxima ?? "∞"} anos)`
                    : ""}
                </option>
              ))}
            </Select>

            <Input
              label="CPF"
              value={form.cpf}
              onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
              placeholder="000.000.000-00"
            />

            <Input
              label="Endereço"
              value={form.endereco}
              onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
              className="sm:col-span-2"
            />

            <Input
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />

            <Input
              label="Telefone"
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Contato de emergência — Nome"
              value={form.contatoEmergenciaNome}
              onChange={(e) => setForm((f) => ({ ...f, contatoEmergenciaNome: e.target.value }))}
            />
            <Input
              label="Contato de emergência — Telefone"
              value={form.contatoEmergenciaTelefone}
              onChange={(e) => setForm((f) => ({ ...f, contatoEmergenciaTelefone: e.target.value }))}
            />
            <Textarea
              label="Observações de saúde"
              value={form.observacoesSaude}
              onChange={(e) => setForm((f) => ({ ...f, observacoesSaude: e.target.value }))}
              rows={2}
              className="sm:col-span-2"
            />
          </div>
        </fieldset>

        {/* RESPONSÁVEL (para menores) */}
        <fieldset>
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <User className="h-4 w-4" /> Responsável Legal (obrigatório para menores de 18 anos)
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nome do responsável"
              value={form.responsavelNome}
              onChange={(e) => setForm((f) => ({ ...f, responsavelNome: e.target.value }))}
            />
            <Input
              label="Telefone do responsável"
              value={form.responsavelTelefone}
              onChange={(e) => setForm((f) => ({ ...f, responsavelTelefone: e.target.value }))}
            />
            <Input
              label="CPF do responsável"
              value={form.responsavelCpf}
              onChange={(e) => setForm((f) => ({ ...f, responsavelCpf: e.target.value }))}
              placeholder="000.000.000-00"
            />
            <Select
              label="Parentesco"
              value={form.parentesco}
              onChange={(e) => setForm((f) => ({ ...f, parentesco: e.target.value }))}
            >
              <option value="">Selecione</option>
              <option value="pai">Pai</option>
              <option value="mae">Mãe</option>
              <option value="avo">Avô/Avó</option>
              <option value="tio">Tio/Tia</option>
              <option value="outro">Outro</option>
            </Select>
          </div>
        </fieldset>

        {/* PARTICIPANTES EXTRAS (DUPLA/EQUIPE) */}
        {tipoInscricao !== "individual" && (
          <fieldset>
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" /> Participantes Adicionais ({tipoInscricao === "dupla" ? "Dupla" : "Equipe"})
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="2º Participante — Nome"
                value={form.atletaNome2}
                onChange={(e) => setForm((f) => ({ ...f, atletaNome2: e.target.value }))}
              />
              <Input
                label="3º Participante — Nome"
                value={form.atletaNome3}
                onChange={(e) => setForm((f) => ({ ...f, atletaNome3: e.target.value }))}
              />
              <Input
                label="4º Participante — Nome"
                value={form.atletaNome4}
                onChange={(e) => setForm((f) => ({ ...f, atletaNome4: e.target.value }))}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Os dados completos (data nascimento, categoria, etc.) dos participantes adicionais
              devem ser cadastrados/atualizados na tela de Atletas. Aqui apenas o nome é editado.
            </p>
          </fieldset>
        )}

        {/* STATUS DA INSCRIÇÃO */}
        <fieldset>
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Status da Inscrição</legend>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as InscricaoStatus }))}
          >
            <option value="pendente">Pendente</option>
            <option value="confirmada">Confirmada</option>
            <option value="cancelada">Cancelada</option>
          </Select>
        </fieldset>

        {/* OBSERVAÇÕES DA INSCRIÇÃO */}
        <fieldset>
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Observações da Inscrição</legend>
          <Textarea
            value={form.observacoes}
            onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
            rows={3}
            placeholder="Observações internas sobre esta inscrição..."
          />
        </fieldset>

        {/* INFORMAÇÕES FINANCEIRAS (somente leitura) */}
        <fieldset className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" /> Financeiro (informativo — não editável aqui)
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400">Valor da prova</label>
              <p className="font-medium text-slate-900 dark:text-white">
                R$ {prova?.valor?.toFixed(2).replace(".", ",") ?? "—"}
              </p>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400">Status do pagamento</label>
              <p className="font-medium text-slate-900 dark:text-white">
                {pagamento?.status ? pagamento.status : (inscricao.status === "confirmada" ? "Pago (derivado)" : "Pendente")}
              </p>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400">Forma(s) de pagamento</label>
              <p className="font-medium text-slate-900 dark:text-white">
                {pagamento?.itens?.length
                  ? pagamento.itens.map((i) => `${i.forma}: R$ ${i.valor.toFixed(2)}`).join(" + ")
                  : "—"}
              </p>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs text-slate-500 dark:text-slate-400">Observação financeira</label>
              <p className="font-medium text-slate-900 dark:text-white">{pagamento?.observacao ?? "—"}</p>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs text-slate-500 dark:text-slate-400">Comprovante</label>
              <p className="font-medium text-slate-900 dark:text-white">{pagamento?.comprovanteUrl ? "Anexado" : "Não anexado"}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Para alterar valores, formas de pagamento ou registrar novos pagamentos,
            use a tela <strong>Financeiro</strong> do evento ou a lista de pagamentos.
            O histórico de pagamentos, comprovantes e créditos são preservados.
          </p>
        </fieldset>

        {/* PARTICIPANTES COMPUTADOS (visualização) */}
        {participantes.length > 0 && (
          <fieldset className="rounded-xl bg-brand-blue/5 p-4 dark:bg-brand-blue/10 border border-brand-blue/20">
            <legend className="text-sm font-medium text-brand-blue dark:text-brand-blue-300 mb-3">
              Participantes da Inscrição ({participantes.length})
            </legend>
            <div className="space-y-2">
              {participantes.map((p) => (
                <div key={p.posicao} className="flex flex-wrap items-center gap-4 text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium w-24">{p.funcao}</span>
                  <span className="flex-1 min-w-[150px]">{p.nome}</span>
                  <span className="w-20">{p.idade !== null ? `${p.idade} anos` : "Idade não informada"}</span>
                  <span className="w-32">{p.percurso}</span>
                  <span className="w-24">{p.distancia}</span>
                </div>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Link href="/admin/inscricoes">
            <Button variant="ghost" type="button">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}