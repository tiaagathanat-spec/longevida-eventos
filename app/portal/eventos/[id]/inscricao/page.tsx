"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Users, UserPlus, Copy, Check } from "lucide-react";
import { useEventos, inscricoesEstaoAbertas } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useTiposProva, eTipoDupla } from "@/lib/mock/tipos-prova-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useSessao } from "@/lib/mock/sessao";
import { eMenorDeIdade, calcularIdadeNaData } from "@/lib/idade";
import { CHAVE_PIX_LONGEVIDA, QR_PIX_LONGEVIDA } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";

export default function InscricaoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventoId = params.id;

  const { sessao } = useSessao();
  const { obterPorId: obterEvento } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { tiposProva } = useTiposProva();
  const { atletas, criar: criarAtleta, atualizar: atualizarAtleta, erro: erroAtletas } =
    useAtletas();
  const { inscricoes, criar, erro: erroInscricoes } = useInscricoes();

  const evento = obterEvento(eventoId);
  const inscritosConfirmados = inscricoes.filter(
    (i) => i.eventoId === eventoId && i.status === "confirmada"
  ).length;
  const inscricoesAbertas = evento ? inscricoesEstaoAbertas(evento, inscritosConfirmados) : false;
  const provasDoEvento = useMemo(
    () => provas.filter((p) => p.eventoId === eventoId),
    [provas, eventoId]
  );
  const meusAtletas = useMemo(
    () => atletas.filter((a) => a.responsavelNome === sessao.nome),
    [atletas, sessao.nome]
  );

  // Perfil de atleta do usuário logado ("Eu mesmo(a)"), casado pelo
  // e-mail da conta (fallback: mesmo nome). Se não existir, é criado na
  // própria página antes de escolher a prova.
  const selfAtleta = useMemo(
    () =>
      atletas.find(
        (a) =>
          (sessao.email ? a.email === sessao.email : false) ||
          (sessao.nome ? a.nome === sessao.nome : false)
      ),
    [atletas, sessao.email, sessao.nome]
  );

  const [atletaId, setAtletaId] = useState(meusAtletas[0]?.id ?? "");
  const [provaId, setProvaId] = useState("");
  const [parceiroNome, setParceiroNome] = useState("");
  const [erroParceiro, setErroParceiro] = useState(false);
  const [copiadoPix, setCopiadoPix] = useState(false);
  const [termos, setTermos] = useState({
    imagem: false,
    saude: false,
    responsabilidade: false,
  });
  const [erroTermos, setErroTermos] = useState(false);

  // "Eu mesmo(a)" ou "Outro atleta (responsável)". `null` = escolha
  // automática: sem dependentes ou já com perfil próprio → "Para mim".
  const [paraMim, setParaMim] = useState<boolean | null>(null);
  const paraMimEfetivo = paraMim ?? (!!selfAtleta || meusAtletas.length === 0);
  const [formEu, setFormEu] = useState({ nome: sessao.nome, dataNascimento: "", telefone: "" });
  const [errosEu, setErrosEu] = useState<{ nome?: string; dataNascimento?: string }>({});

  // Dados do responsável legal, exigidos quando o atleta é menor de idade
  // na data do evento (regra central: menores de 18 precisam de
  // responsável legal).
  const [responsavel, setResponsavel] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    parentesco: "",
  });
  const [termoResponsavel, setTermoResponsavel] = useState(false);
  const [erroResponsavel, setErroResponsavel] = useState(false);

  const atletaSelecionado = paraMimEfetivo
    ? selfAtleta
    : meusAtletas.find((a) => a.id === atletaId);
  const idadeNaData = atletaSelecionado && evento
    ? calcularIdadeNaData(atletaSelecionado.dataNascimento, evento.data)
    : null;
  const atletaMenor = atletaSelecionado && evento
    ? eMenorDeIdade(atletaSelecionado.dataNascimento, evento.data)
    : false;

  // Mesma regra do banco (unique atleta_id + prova_id): não permite
  // mais de uma inscrição ativa do mesmo atleta na mesma prova.
  function jaInscrito(atletaNome: string, pId: string) {
    return inscricoes.some(
      (i) =>
        i.eventoId === eventoId &&
        i.provaId === pId &&
        i.atletaNome === atletaNome &&
        i.status !== "cancelada"
    );
  }

  const provasDisponiveis = useMemo(
    () =>
      provasDoEvento.filter(
        (p) => !jaInscrito(atletaSelecionado?.nome ?? "", p.id)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [provasDoEvento, atletaSelecionado, inscricoes]
  );

  // Mantém a prova selecionada válida quando o atleta muda ou a prova
  // em questão deixa de estar disponível.
  useEffect(() => {
    if (!provasDisponiveis.some((p) => p.id === provaId)) {
      setProvaId(provasDisponiveis[0]?.id ?? "");
    }
  }, [provasDisponiveis, provaId]);

  // Pré-preenche os dados do responsável legal quando o atleta muda,
  // reaproveitando o que já estiver registrado no cadastro do atleta.
  useEffect(() => {
    if (atletaSelecionado) {
      setResponsavel((atual) => ({
        nome: atletaSelecionado.responsavelNome ?? atual.nome,
        cpf: atletaSelecionado.responsavelCpf ?? atual.cpf,
        telefone: atletaSelecionado.responsavelTelefone ?? atual.telefone,
        parentesco: atletaSelecionado.parentesco ?? atual.parentesco,
      }));
    }
  }, [atletaSelecionado?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seleciona o primeiro dependente quando a lista carrega e ainda não há
  // atleta escolhido (a persistência do Supabase carrega de forma assíncrona).
  useEffect(() => {
    if (!atletaId && meusAtletas.length > 0) {
      setAtletaId(meusAtletas[0].id);
    }
  }, [atletaId, meusAtletas]);

  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }

  const provaSelecionada = provasDisponiveis.find((p) => p.id === provaId);
  const tipoProvaDaProva = tiposProva.find((t) => t.id === provaSelecionada?.tipoProvaId);
  const eDupla = eTipoDupla(tipoProvaDaProva);

  // Prova nova selecionada: limpa o nome do 2º participante da dupla.
  useEffect(() => {
    setParceiroNome("");
    setErroParceiro(false);
  }, [provaId]);

  function formatarMoeda(valor: number) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function copiarChavePix() {
    navigator.clipboard.writeText(CHAVE_PIX_LONGEVIDA);
    setCopiadoPix(true);
    setTimeout(() => setCopiadoPix(false), 2000);
  }

  if (!evento) {
    return (
      <div className="mx-auto max-w-xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
        <Link href="/portal/eventos" className="mt-4 inline-block text-sm font-medium text-brand-blue hover:underline">
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  if (!inscricoesAbertas) {
    return (
      <div className="mx-auto max-w-xl px-6 py-8">
        <Link
          href="/portal/eventos"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Eventos
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Inscrição</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{evento.nome}</p>
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {evento.status === "em_espera"
              ? "As inscrições para este evento ainda não começaram."
              : evento.status === "rascunho"
              ? "As informações deste evento ainda não foram publicadas."
              : "As inscrições para este evento estão encerradas ou as vagas foram preenchidas."}
          </p>
        </div>
      </div>
    );
  }

  function handleConfirmar() {
    const atleta = atletaSelecionado;
    if (!atleta || !provaId) return;

    // Termos obrigatórios: autorização de imagem, termo de saúde e
    // termo de responsabilidade precisam estar aceitos.
    if (!termos.imagem || !termos.saude || !termos.responsabilidade) {
      setErroTermos(true);
      return;
    }
    setErroTermos(false);

    // Prova em dupla: exige o nome do 2º participante.
    if (eDupla && !parceiroNome.trim()) {
      setErroParceiro(true);
      return;
    }
    setErroParceiro(false);

    // Menor de idade: dados completos do responsável legal + aceite
    // do termo de autorização do responsável.
    if (atletaMenor) {
      const dadosResponsavelValidos = [responsavel.nome, responsavel.cpf, responsavel.telefone, responsavel.parentesco]
        .every((campo) => campo.trim() !== "");
      if (!dadosResponsavelValidos || !termoResponsavel) {
        setErroResponsavel(true);
        return;
      }
      setErroResponsavel(false);

      // Garante que os dados do responsável ficam registrados no atleta,
      // para uso operacional no dia do evento.
      atualizarAtleta(atleta.id, {
        nome: atleta.nome,
        dataNascimento: atleta.dataNascimento,
        categoriaId: atleta.categoriaId,
        responsavelNome: responsavel.nome.trim(),
        responsavelCpf: responsavel.cpf.trim(),
        responsavelTelefone: responsavel.telefone.trim(),
        parentesco: responsavel.parentesco.trim(),
        email: atleta.email,
        telefone: atleta.telefone,
      });
    }

    // Não cria duplicata se o atleta já estiver inscrito na prova —
    // apenas segue para o pagamento.
    if (!jaInscrito(atleta.nome, provaId)) {
      criar({
        eventoId,
        provaId,
        atletaNome: atleta.nome,
        status: "pendente",
        atletaNome2: eDupla ? parceiroNome.trim() : undefined,
      });
    }

    router.push(`/portal/eventos/${eventoId}/pagamento`);
  }

  // Cria o perfil de atleta do usuário logado ("Eu mesmo(a)") quando ele
  // ainda não tem um cadastro, antes de escolher a prova.
  function handleSalvarEu(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const novosErros: { nome?: string; dataNascimento?: string } = {};
    if (!formEu.nome.trim()) novosErros.nome = "Informe seu nome.";
    if (!formEu.dataNascimento) novosErros.dataNascimento = "Informe sua data de nascimento.";
    setErrosEu(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    criarAtleta({
      nome: formEu.nome.trim(),
      dataNascimento: formEu.dataNascimento,
      categoriaId: "",
      responsavelNome: sessao.nome,
      email: sessao.email,
      telefone: formEu.telefone.trim(),
    });
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <Link
        href="/portal/eventos"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Eventos
      </Link>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Inscrição</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{evento.nome}</p>

      <AlertaPersistencia erro={erroAtletas ?? erroInscricoes} />

      <div className="mt-8 flex flex-col gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Para quem é esta inscrição?
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setParaMim(true)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                paraMimEfetivo
                  ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                  : "border-slate-200 text-slate-600 hover:border-brand-blue/50 dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Eu mesmo(a)
            </button>
            <button
              type="button"
              onClick={() => setParaMim(false)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                !paraMimEfetivo
                  ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                  : "border-slate-200 text-slate-600 hover:border-brand-blue/50 dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              <Users className="h-4 w-4" />
              Outro atleta (responsável)
            </button>
          </div>
        </div>

        {provasDoEvento.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Este evento ainda não tem provas disponíveis para inscrição.
            </p>
          </div>
        ) : paraMimEfetivo && !selfAtleta ? (
          <form
            onSubmit={handleSalvarEu}
            noValidate
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Complete seus dados para se inscrever
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Você ainda não tem um cadastro de atleta nesta conta. Preencha abaixo para criar o
              seu e continuar.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <Input
                id="formEuNome"
                label="Nome completo"
                value={formEu.nome}
                onChange={(e) => setFormEu((atual) => ({ ...atual, nome: e.target.value }))}
                error={errosEu.nome}
              />
              <Input
                id="formEuDataNascimento"
                type="date"
                label="Data de nascimento"
                value={formEu.dataNascimento}
                onChange={(e) =>
                  setFormEu((atual) => ({ ...atual, dataNascimento: e.target.value }))
                }
                error={errosEu.dataNascimento}
              />
              <Input
                id="formEuTelefone"
                label="Telefone (opcional)"
                value={formEu.telefone}
                onChange={(e) => setFormEu((atual) => ({ ...atual, telefone: e.target.value }))}
              />
            </div>
            <Button type="submit" className="mt-4">
              Salvar e continuar
            </Button>
          </form>
        ) : !paraMimEfetivo && meusAtletas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Você ainda não tem atletas cadastrados.
            </p>
            <Link href="/portal/meus-atletas" className="mt-4 inline-block">
              <Button>Adicionar atleta</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {paraMimEfetivo && selfAtleta ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-brand-blue/10 p-2">
                    <User className="h-4 w-4 text-brand-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {selfAtleta.nome}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selfAtleta.email || sessao.email}
                    </p>
                  </div>
                </div>
                <Link
                  href="/portal/perfil"
                  className="text-xs font-medium text-brand-blue hover:underline"
                >
                  Editar perfil
                </Link>
              </div>
            ) : (
              <Select
                id="atletaId"
                label="Atleta"
                value={atletaId}
                onChange={(e) => setAtletaId(e.target.value)}
              >
                {meusAtletas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </Select>
            )}

          {provasDisponiveis.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {atletaSelecionado?.nome} já está inscrito em todas as provas deste evento.
              </p>
              <Link href="/portal/minhas-inscricoes" className="mt-3 inline-block">
                <Button variant="secondary">Ver minhas inscrições</Button>
              </Link>
            </div>
          ) : (
            <>
              <Select
                id="provaId"
                label="Prova"
                value={provaId}
                onChange={(e) => setProvaId(e.target.value)}
              >
                {provasDisponiveis.map((p) => (
                  <option key={p.id} value={p.id}>
                    {nomeModalidade(p.modalidadeId)} · {nomeCategoria(p.categoriaId)}
                    {p.horario ? ` · ${p.horario}` : ""}
                  </option>
                ))}
              </Select>

              {eDupla && (
                <div className="rounded-2xl border border-brand-blue/30 bg-brand-blue/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-brand-blue/10 p-2">
                      <Users className="h-4 w-4 text-brand-blue" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Prova em dupla
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Informe o nome do segundo participante. O valor da inscrição cobre a
                        dupla completa.
                      </p>
                      <div className="mt-3">
                        <Input
                          id="parceiroNome"
                          label="2º participante (dupla)"
                          placeholder="Nome completo do parceiro(a)"
                          value={parceiroNome}
                          onChange={(e) => setParceiroNome(e.target.value)}
                          error={erroParceiro ? "Informe o nome do 2º participante." : undefined}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {provaSelecionada && (
                <div className="rounded-xl bg-brand-blue/5 p-4 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-brand-blue" />
                      Valor da inscrição
                    </div>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {formatarMoeda(provaSelecionada.valor)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-dashed border-brand-blue/30 bg-white/60 p-2.5 dark:bg-slate-900/60">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Chave Pix
                      </p>
                      <p className="truncate font-mono text-xs text-slate-700 dark:text-slate-200">
                        {CHAVE_PIX_LONGEVIDA}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={copiarChavePix}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {copiadoPix ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiadoPix ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3 rounded-lg border border-dashed border-brand-blue/30 bg-white/60 p-2.5 dark:bg-slate-900/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={QR_PIX_LONGEVIDA}
                      alt="QR Code PIX para pagamento"
                      className="h-14 w-14 shrink-0 rounded bg-white object-contain"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Escaneie o QR Code com o app do seu banco para pagar via PIX.
                    </p>
                  </div>
                </div>
              )}

              <div
                className={`rounded-2xl border p-4 ${
                  erroTermos
                    ? "border-red-300 bg-red-50 dark:border-red-500/50 dark:bg-red-950/20"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                }`}
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Termos obrigatórios
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Marque todos os campos para continuar.
                </p>

                <label className="mt-3 flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={termos.imagem}
                    onChange={(e) =>
                      setTermos((atual) => ({ ...atual, imagem: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    <strong className="font-bold text-slate-900 dark:text-white">
                      Autorização de uso de imagem.
                    </strong>{" "}
                    Autorizo o Espaço Longevida a captar, reproduzir e divulgar imagens e vídeos
                    do atleta durante o evento, em qualquer meio de comunicação, para fins de
                    divulgação, sem qualquer ônus.
                  </span>
                </label>

                <label className="mt-3 flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={termos.saude}
                    onChange={(e) =>
                      setTermos((atual) => ({ ...atual, saude: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    <strong className="font-bold text-slate-900 dark:text-white">
                      Termo de ciência sobre saúde.
                    </strong>{" "}
                    Declaro que o atleta está em boas condições de saúde e apto para a prática
                    esportiva, assumindo a responsabilidade pela participação.
                  </span>
                </label>

                <label className="mt-3 flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={termos.responsabilidade}
                    onChange={(e) =>
                      setTermos((atual) => ({
                        ...atual,
                        responsabilidade: e.target.checked,
                      }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    <strong className="font-bold text-slate-900 dark:text-white">
                      Termo de responsabilidade.
                    </strong>{" "}
                    Assumo integral responsabilidade pelos dados informados e isento a
                    organização de qualquer obrigação relacionada a acidentes ou imprevistos
                    decorrentes da participação no evento.
                  </span>
                </label>

                {erroTermos && (
                  <p className="mt-3 text-xs font-bold text-red-600 dark:text-red-400">
                    É obrigatório aceitar os três termos para continuar.
                  </p>
                )}
              </div>

              {atletaMenor && (
                <div
                  className={`rounded-2xl border p-4 ${
                    erroResponsavel
                      ? "border-red-300 bg-red-50 dark:border-red-500/50 dark:bg-red-950/20"
                      : "border-amber-300 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-950/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-amber-100 p-2 dark:bg-amber-900/40">
                      <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Atleta menor de idade
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {atletaSelecionado?.nome} tem {idadeNaData} anos na data do evento.
                        A inscrição de menores de 18 anos exige os dados do responsável legal e
                        sua autorização.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Input
                        id="responsavelNome"
                        label="Nome completo do responsável legal"
                        value={responsavel.nome}
                        onChange={(e) =>
                          setResponsavel((atual) => ({ ...atual, nome: e.target.value }))
                        }
                        error={erroResponsavel && !responsavel.nome ? "Informe o responsável." : undefined}
                      />
                    </div>
                    <Input
                      id="responsavelCpf"
                      label="CPF do responsável"
                      value={responsavel.cpf}
                      onChange={(e) =>
                        setResponsavel((atual) => ({ ...atual, cpf: e.target.value }))
                      }
                      error={erroResponsavel && !responsavel.cpf ? "Informe o CPF." : undefined}
                    />
                    <Input
                      id="responsavelTelefone"
                      label="Telefone do responsável"
                      value={responsavel.telefone}
                      onChange={(e) =>
                        setResponsavel((atual) => ({ ...atual, telefone: e.target.value }))
                      }
                      error={erroResponsavel && !responsavel.telefone ? "Informe o telefone." : undefined}
                    />
                    <div className="sm:col-span-2">
                      <Input
                        id="responsavelParentesco"
                        label="Parentesco"
                        placeholder="Ex.: mãe, pai, avó, tio(a)"
                        value={responsavel.parentesco}
                        onChange={(e) =>
                          setResponsavel((atual) => ({ ...atual, parentesco: e.target.value }))
                        }
                        error={erroResponsavel && !responsavel.parentesco ? "Informe o parentesco." : undefined}
                      />
                    </div>
                  </div>

                  <label className="mt-4 flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={termoResponsavel}
                      onChange={(e) => setTermoResponsavel(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
                    />
                    <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      <strong className="font-bold text-slate-900 dark:text-white">
                        Autorização do responsável legal.
                      </strong>{" "}
                      Na condição de responsável legal do atleta, autorizo sua participação no
                      evento e confirmo que estou ciente das informações acima, incluindo o
                      termo de saúde e o termo de responsabilidade.
                    </span>
                  </label>

                  {erroResponsavel && (
                    <p className="mt-3 text-xs font-bold text-red-600 dark:text-red-400">
                      Preencha os dados do responsável legal e marque a autorização para continuar.
                    </p>
                  )}
                </div>
              )}

              <Button onClick={handleConfirmar} className="mt-2">
                Continuar para pagamento
              </Button>
            </>
          )}
          </div>
        )}
      </div>
    </div>
  );
}
