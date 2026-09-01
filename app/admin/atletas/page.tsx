"use client";

import { useMemo, useState, FormEvent } from "react";
import { Plus, Pencil, Trash2, Search, User, Users } from "lucide-react";
import { useAtletas, Atleta } from "@/lib/mock/atletas-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useTiposProva, integrantesDaProva } from "@/lib/mock/tipos-prova-store";
import { useInscricoes, InscricaoStatus } from "@/lib/mock/inscricoes-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";

type FormState = {
  nome: string;
  dataNascimento: string;
  categoriaId: string;
  genero: "masculino" | "feminino" | "outro" | "";
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
  // Inscrição (opcional, apenas no cadastro novo)
  criarInscricao: boolean;
  eventoId: string;
  provaId: string;
  status: InscricaoStatus;
  atletaNome2: string;
  atletaNome3: string;
  atletaNome4: string;
};

const FORM_VAZIO: FormState = {
  nome: "",
  dataNascimento: "",
  categoriaId: "",
  genero: "",
  cpf: "",
  endereco: "",
  email: "",
  telefone: "",
  contatoEmergenciaNome: "",
  contatoEmergenciaTelefone: "",
  observacoesSaude: "",
  responsavelNome: "",
  responsavelTelefone: "",
  responsavelCpf: "",
  parentesco: "",
  criarInscricao: false,
  eventoId: "",
  provaId: "",
  status: "pendente",
  atletaNome2: "",
  atletaNome3: "",
  atletaNome4: "",
};

function calcularIdade(dataNascimento: string) {
  if (!dataNascimento) return null;
  const nascimento = new Date(dataNascimento + "T00:00:00");
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

export default function AtletasPage() {
  const { atletas, criar, atualizar, excluir, erro: erroAtletas } = useAtletas();
  const { categorias } = useCategorias();
  const { eventos } = useEventos();
  const { modalidades } = useModalidades();
  const { provas } = useProvas();
  const { tiposProva } = useTiposProva();
  const { criar: criarInscricao, erro: erroInscricoes } = useInscricoes();

  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }

  const atletasFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return atletas;
    return atletas.filter((a) => a.nome.toLowerCase().includes(termo));
  }, [atletas, busca]);

  const atletaParaExcluir = atletas.find((a) => a.id === excluindoId);

  function descricaoProva(provaId: string) {
    const prova = provas.find((p) => p.id === provaId);
    if (!prova) return "—";
    const modalidade = modalidades.find((m) => m.id === prova.modalidadeId)?.nome ?? "—";
    const categoria = categorias.find((c) => c.id === prova.categoriaId)?.nome ?? "—";
    return `${modalidade} · ${categoria}`;
  }

  function provasDoEvento(eventoId: string) {
    return provas.filter((p) => p.eventoId === eventoId);
  }

  function qtdIntegrantes(provaId: string): number {
    const prova = provas.find((p) => p.id === provaId);
    const tipo = tiposProva.find((t) => t.id === prova?.tipoProvaId);
    return integrantesDaProva(tipo);
  }

  function abrirCriacao() {
    const eventoId = eventos[0]?.id ?? "";
    setEditandoId(null);
    setForm({
      ...FORM_VAZIO,
      eventoId,
      provaId: provasDoEvento(eventoId)[0]?.id ?? "",
    });
    setErros({});
    setModalAberto(true);
  }

  function abrirEdicao(atleta: Atleta) {
    setEditandoId(atleta.id);
    setForm({
      nome: atleta.nome,
      dataNascimento: atleta.dataNascimento,
      categoriaId: atleta.categoriaId,
      genero: atleta.genero ?? "",
      cpf: atleta.cpf ?? "",
      endereco: atleta.endereco ?? "",
      email: atleta.email,
      telefone: atleta.telefone,
      contatoEmergenciaNome: atleta.contatoEmergenciaNome ?? "",
      contatoEmergenciaTelefone: atleta.contatoEmergenciaTelefone ?? "",
      observacoesSaude: atleta.observacoesSaude ?? "",
      responsavelNome: atleta.responsavelNome,
      responsavelTelefone: atleta.responsavelTelefone ?? "",
      responsavelCpf: atleta.responsavelCpf ?? "",
      parentesco: atleta.parentesco ?? "",
      criarInscricao: false,
      eventoId: "",
      provaId: "",
      status: "pendente",
      atletaNome2: "",
      atletaNome3: "",
      atletaNome4: "",
    });
    setErros({});
    setModalAberto(true);
  }

  function validar() {
    const novosErros: Record<string, string> = {};
    if (!form.nome.trim()) novosErros.nome = "Informe o nome do atleta.";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      novosErros.email = "Informe um e-mail válido.";
    }
    if (form.cpf && form.cpf.replace(/\D/g, "").length !== 11) {
      novosErros.cpf = "Informe um CPF válido (11 dígitos).";
    }
    if (form.criarInscricao && !form.eventoId) novosErros.eventoId = "Selecione o evento.";
    if (form.criarInscricao && !form.provaId) novosErros.provaId = "Selecione a prova.";
    // Em prova de equipe, os demais integrantes são obrigatórios.
    if (form.criarInscricao && form.provaId) {
      const n = qtdIntegrantes(form.provaId);
      for (let i = 2; i <= Math.min(n, 4); i++) {
        const val = (form as unknown as Record<string, string>)[`atletaNome${i}`].trim();
        if (!val) novosErros[`atletaNome${i}`] = `Informe o ${i}º integrante.`;
      }
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validar()) return;

    const dadosAtleta: Omit<Atleta, "id"> = {
      nome: form.nome.trim(),
      dataNascimento: form.dataNascimento,
      categoriaId: form.categoriaId,
      genero: form.genero,
      cpf: form.cpf.trim(),
      endereco: form.endereco.trim(),
      email: form.email.trim(),
      telefone: form.telefone.trim(),
      contatoEmergenciaNome: form.contatoEmergenciaNome.trim(),
      contatoEmergenciaTelefone: form.contatoEmergenciaTelefone.trim(),
      observacoesSaude: form.observacoesSaude.trim(),
      responsavelNome: form.responsavelNome.trim(),
      responsavelTelefone: form.responsavelTelefone.trim(),
      responsavelCpf: form.responsavelCpf.trim(),
      parentesco: form.parentesco.trim(),
    };

    // Quando há equipe na inscrição, os outros integrantes também precisam
    // existir na base de atletas (para controle de idade/categoria).
    const criarIntegrante = (nomeStr: string) => {
      const n = nomeStr.trim();
      if (!n) return;
      if (!atletas.some((a) => a.nome === n)) {
        criar({ ...dadosAtleta, nome: n });
      }
    };

    if (editandoId) {
      atualizar(editandoId, dadosAtleta);
      setModalAberto(false);
      return;
    }

    const novo = criar(dadosAtleta);

    if (form.criarInscricao && form.eventoId && form.provaId) {
      criarIntegrante(form.atletaNome2);
      criarIntegrante(form.atletaNome3);
      criarIntegrante(form.atletaNome4);
      criarInscricao({
        eventoId: form.eventoId,
        provaId: form.provaId,
        atletaNome: novo.nome,
        atletaNome2: form.atletaNome2.trim() || undefined,
        atletaNome3: form.atletaNome3.trim() || undefined,
        atletaNome4: form.atletaNome4.trim() || undefined,
        status: form.status,
      });
    }
    setModalAberto(false);
  }

  const campos =
    form.criarInscricao && form.provaId ? Math.min(qtdIntegrantes(form.provaId), 4) : 1;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Atletas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Base completa de atletas cadastrados no sistema. Cadastre e, se quiser, inscreva
            direto em uma prova — inclusive em equipe.
          </p>
        </div>
        <Button onClick={abrirCriacao}>
          <Plus className="h-4 w-4" />
          Novo atleta
        </Button>
      </header>

      <AlertaPersistencia erro={erroAtletas ?? erroInscricoes} />

      <div className="relative mb-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10"
        />
      </div>

      {atletasFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {atletas.length === 0
              ? "Nenhum atleta cadastrado ainda."
              : "Nenhum atleta encontrado para essa busca."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {atletasFiltrados.map((atleta) => {
            const idade = calcularIdade(atleta.dataNascimento);
            return (
              <div
                key={atleta.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                    <User className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {atleta.nome}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {idade !== null ? `${idade} anos` : "Idade não informada"} ·{" "}
                      {nomeCategoria(atleta.categoriaId)}
                      {atleta.responsavelNome
                        ? ` · Responsável: ${atleta.responsavelNome}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    aria-label={`Editar ${atleta.nome}`}
                    onClick={() => abrirEdicao(atleta)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Excluir ${atleta.nome}`}
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                    onClick={() => setExcluindoId(atleta.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalAberto}
        title={editandoId ? "Editar atleta" : "Cadastrar atleta"}
        onClose={() => setModalAberto(false)}
        tamanho="lg"
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Dados pessoais
            </h3>
            <Input
              id="nome"
              label="Nome completo"
              placeholder="Ex: Marina Costa"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              error={erros.nome}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="dataNascimento"
                type="date"
                label="Data de nascimento"
                value={form.dataNascimento}
                onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
              />
              <Select
                id="categoriaId"
                label="Categoria"
                value={form.categoriaId}
                onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
              >
                <option value="">Sem categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                id="genero"
                label="Gênero"
                value={form.genero}
                onChange={(e) =>
                  setForm({
                    ...form,
                    genero: e.target.value as FormState["genero"],
                  })
                }
              >
                <option value="">Não informado</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
              </Select>
              <Input
                id="cpf"
                label="CPF"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                error={erros.cpf}
              />
              <Input
                id="telefone"
                label="Telefone"
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="email"
                type="email"
                label="E-mail"
                placeholder="Opcional"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                error={erros.email}
              />
              <Input
                id="endereco"
                label="Endereço"
                placeholder="Rua, número, bairro, cidade"
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Contato de emergência
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="contatoEmergenciaNome"
                label="Nome do contato"
                placeholder="Opcional"
                value={form.contatoEmergenciaNome}
                onChange={(e) =>
                  setForm({ ...form, contatoEmergenciaNome: e.target.value })
                }
              />
              <Input
                id="contatoEmergenciaTelefone"
                label="Telefone do contato"
                placeholder="Opcional"
                value={form.contatoEmergenciaTelefone}
                onChange={(e) =>
                  setForm({ ...form, contatoEmergenciaTelefone: e.target.value })
                }
              />
            </div>
            <Textarea
              id="observacoesSaude"
              label="Observações de saúde"
              placeholder="Alergias, restrições, medicamentos, condições (opcional)"
              rows={2}
              value={form.observacoesSaude}
              onChange={(e) => setForm({ ...form, observacoesSaude: e.target.value })}
            />
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Responsável legal (se menor de idade)
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="responsavelNome"
                label="Nome do responsável"
                placeholder="Opcional"
                value={form.responsavelNome}
                onChange={(e) => setForm({ ...form, responsavelNome: e.target.value })}
              />
              <Input
                id="parentesco"
                label="Parentesco"
                placeholder="Ex: Pai, Mãe, Tio"
                value={form.parentesco}
                onChange={(e) => setForm({ ...form, parentesco: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="responsavelCpf"
                label="CPF do responsável"
                placeholder="Opcional"
                value={form.responsavelCpf}
                onChange={(e) => setForm({ ...form, responsavelCpf: e.target.value })}
              />
              <Input
                id="responsavelTelefone"
                label="Telefone do responsável"
                placeholder="Opcional"
                value={form.responsavelTelefone}
                onChange={(e) =>
                  setForm({ ...form, responsavelTelefone: e.target.value })
                }
              />
            </div>
          </section>

          {!editandoId && (
            <section className="rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.criarInscricao}
                  onChange={(e) =>
                    setForm({ ...form, criarInscricao: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                />
                Criar inscrição agora neste cadastro
              </label>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Preencha para cadastrar o atleta e inscrevê-lo em uma prova no mesmo passe —
                útil para atender pessoas no balcão.
              </p>

              {form.criarInscricao && (
                <div className="mt-4 flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Select
                      id="eventoId"
                      label="Evento"
                      value={form.eventoId}
                      onChange={(e) => {
                        const eventoId = e.target.value;
                        const p = provasDoEvento(eventoId)[0]?.id ?? "";
                        setForm({
                          ...form,
                          eventoId,
                          provaId: p,
                          atletaNome2: "",
                          atletaNome3: "",
                          atletaNome4: "",
                        });
                      }}
                      error={erros.eventoId}
                    >
                      {eventos.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.nome}
                        </option>
                      ))}
                    </Select>
                    <Select
                      id="provaId"
                      label="Prova"
                      value={form.provaId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          provaId: e.target.value,
                          atletaNome2: "",
                          atletaNome3: "",
                          atletaNome4: "",
                        })
                      }
                      error={erros.provaId}
                      disabled={provasDoEvento(form.eventoId).length === 0}
                    >
                      {provasDoEvento(form.eventoId).length === 0 && (
                        <option value="">Nenhuma prova neste evento</option>
                      )}
                      {provasDoEvento(form.eventoId).map((p) => (
                        <option key={p.id} value={p.id}>
                          {descricaoProva(p.id)}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {campos > 1 && (
                    <div className="rounded-xl border border-brand-blue/30 bg-white p-3 dark:bg-slate-950">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                        <Users className="h-3.5 w-3.5 text-brand-blue" />
                        Prova em equipe — {qtdIntegrantes(form.provaId)} integrantes (o
                        atleta cadastrado é o 1º)
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {Array.from({ length: campos - 1 }).map((_, idx) => {
                          const i = idx + 2;
                          const chave = `atletaNome${i}` as
                            | "atletaNome2"
                            | "atletaNome3"
                            | "atletaNome4";
                          return (
                            <Input
                              key={chave}
                              id={chave}
                              label={`${i}º integrante`}
                              placeholder="Nome completo"
                              value={form[chave]}
                              onChange={(e) =>
                                setForm({ ...form, [chave]: e.target.value })
                              }
                              error={erros[chave]}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Select
                    id="status"
                    label="Status da inscrição"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as InscricaoStatus })
                    }
                  >
                    <option value="pendente">Pendente</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="cancelada">Cancelada</option>
                  </Select>
                </div>
              )}
            </section>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit">{editandoId ? "Salvar alterações" : "Salvar"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!atletaParaExcluir}
        title="Excluir atleta"
        description={
          atletaParaExcluir
            ? `Tem certeza que deseja excluir "${atletaParaExcluir.nome}"? Essa ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Excluir"
        onCancel={() => setExcluindoId(null)}
        onConfirm={() => {
          if (excluindoId) excluir(excluindoId);
          setExcluindoId(null);
        }}
      />
    </div>
  );
}
