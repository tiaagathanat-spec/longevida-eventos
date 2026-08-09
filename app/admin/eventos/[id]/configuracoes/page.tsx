"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Settings,
  Pencil,
  ListChecks,
  Tag,
  Waves,
  Hash,
  Image as ImageIcon,
  FileText,
  Info,
} from "lucide-react";
import {
  useEventos,
  EVENTO_STATUS_LABEL,
  inscricoesEstaoAbertas,
} from "@/lib/mock/eventos-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import { useGaleria } from "@/lib/mock/galeria-store";
import { useRegulamentos } from "@/lib/mock/regulamentos-store";

// Tela: Configurações do Evento.
//
// Painel de "preparação" do evento: um checklist com o estado de cada
// parte (dados, provas, categorias, modalidades, dorsais, galeria,
// regulamento) e atalhos para configurar cada uma. Os dados são reais
// dos stores mockados.

type ItemConfiguracao = {
  titulo: string;
  descricao: string;
  status: "ok" | "parcial" | "pendente";
  detalhe: string;
  href: string;
  icon: typeof Info;
};

export default function ConfiguracoesEventoPage() {
  const params = useParams<{ id: string }>();
  const { obterPorId: obterEvento } = useEventos();
  const { listarPorEvento } = useProvas();
  const { categorias } = useCategorias();
  const { modalidades } = useModalidades();
  const { inscricoes } = useInscricoes();
  const { dorsais } = useDorsais();
  const { listarPorEvento: imagensPorEvento } = useGaleria();
  const { listarPorEvento: regulamentosPorEvento } = useRegulamentos();

  const evento = obterEvento(params.id);

  const itens = useMemo<ItemConfiguracao[]>(() => {
    if (!evento) return [];

    const provasDoEvento = listarPorEvento(evento.id);
    const inscritosDoEvento = inscricoes.filter(
      (i) => i.eventoId === evento.id && i.status === "confirmada"
    );
    const categoriasEmUso = categorias.filter((c) =>
      provasDoEvento.some((p) => p.categoriaId === c.id)
    );
    const modalidadesEmUso = modalidades.filter((m) =>
      provasDoEvento.some((p) => p.modalidadeId === m.id)
    );
    const dorsaisDoEvento = dorsais.filter((d) =>
      inscritosDoEvento.some((i) => i.id === d.inscricaoId)
    );
    const imagens = imagensPorEvento(evento.id);
    const documentos = regulamentosPorEvento(evento.id);

    const dadosCompletos =
      evento.nome && evento.data && evento.local && evento.descricao;

    return [
      {
        titulo: "Dados do evento",
        descricao: "Nome, data, local, descrição, vagas e limite de inscrições.",
        status: dadosCompletos ? "ok" : "parcial",
        detalhe: dadosCompletos
          ? "Dados básicos preenchidos."
          : "Complete nome, data, local e descrição.",
        href: `/admin/eventos/${evento.id}/editar`,
        icon: Pencil,
      },
      {
        titulo: "Fluxo de liberação",
        descricao: "Quando as informações e inscrições ficam visíveis aos atletas.",
        status: "ok",
        detalhe: `Status atual: ${EVENTO_STATUS_LABEL[evento.status]}.`,
        href: `/admin/eventos/${evento.id}`,
        icon: Settings,
      },
      {
        titulo: "Provas",
        descricao: "Combinações de modalidade + categoria + tipo de prova.",
        status: provasDoEvento.length > 0 ? "ok" : "pendente",
        detalhe:
          provasDoEvento.length > 0
            ? `${provasDoEvento.length} prova(s) cadastrada(s).`
            : "Nenhuma prova cadastrada ainda.",
        href: `/admin/eventos/${evento.id}/provas`,
        icon: ListChecks,
      },
      {
        titulo: "Categorias em uso",
        descricao: "Categorias participantes das provas deste evento.",
        status: categoriasEmUso.length > 0 ? "ok" : "pendente",
        detalhe:
          categoriasEmUso.length > 0
            ? `${categoriasEmUso.length} categoria(s) em uso.`
            : "Defina as provas para vincular categorias.",
        href: `/admin/eventos/${evento.id}/categorias`,
        icon: Tag,
      },
      {
        titulo: "Modalidades em uso",
        descricao: "Modalidades participantes das provas deste evento.",
        status: modalidadesEmUso.length > 0 ? "ok" : "pendente",
        detalhe:
          modalidadesEmUso.length > 0
            ? `${modalidadesEmUso.length} modalidade(s) em uso.`
            : "Defina as provas para vincular modalidades.",
        href: `/admin/eventos/${evento.id}/modalidades`,
        icon: Waves,
      },
      {
        titulo: "Dorsais",
        descricao: "Números de peito atribuídos às inscrições confirmadas.",
        status: dorsaisDoEvento.length > 0 ? "ok" : "pendente",
        detalhe:
          dorsaisDoEvento.length > 0
            ? `${dorsaisDoEvento.length} dorsal(ais) atribuído(s).`
            : "Atribua os números de peito às inscrições confirmadas.",
        href: `/admin/eventos/${evento.id}/dorsais`,
        icon: Hash,
      },
      {
        titulo: "Galeria",
        descricao: "Imagens públicas do evento para os atletas.",
        status: imagens.length > 0 ? (imagens.some((i) => i.visibilidade === "publica") ? "ok" : "parcial") : "pendente",
        detalhe:
          imagens.length > 0
            ? `${imagens.length} imagem(ns) enviada(s).`
            : "Nenhuma imagem enviada ainda.",
        href: `/admin/eventos/${evento.id}/galeria`,
        icon: ImageIcon,
      },
      {
        titulo: "Regulamento",
        descricao: "Documentos disponibilizados aos atletas.",
        status: documentos.length > 0 ? "ok" : "pendente",
        detalhe:
          documentos.length > 0
            ? `${documentos.length} documento(s) anexado(s).`
            : "Nenhum documento anexado ainda.",
        href: `/admin/eventos/${evento.id}/regulamento`,
        icon: FileText,
      },
    ];
  }, [
    evento,
    listarPorEvento,
    inscricoes,
    categorias,
    modalidades,
    dorsais,
    imagensPorEvento,
    regulamentosPorEvento,
  ]);

  if (!evento) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
      </div>
    );
  }

  const pendentes = itens.filter((i) => i.status === "pendente").length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href={`/admin/eventos/${evento.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para {evento.nome}
      </Link>

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Configurações do evento
        </h1>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {EVENTO_STATUS_LABEL[evento.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Checklist de preparação de {evento.nome}.{" "}
        {pendentes === 0
          ? "Tudo pronto!"
          : `${pendentes} item(ns) ainda pendente(s).`}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3">
        {itens.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.titulo}
              href={item.href}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-blue/40 dark:border-slate-800 dark:bg-slate-950"
            >
              <div
                className={`shrink-0 rounded-xl p-2 ${
                  item.status === "ok"
                    ? "bg-brand-green/10 text-brand-green"
                    : item.status === "parcial"
                    ? "bg-amber-100 text-amber-600"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {item.titulo}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {item.descricao}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {item.detalhe}
                </p>
              </div>
              {item.status === "ok" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-green" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
              )}
            </Link>
          );
        })}
      </div>

      {evento.status === "inscricoes_abertas" && (
        <p className="mt-4 text-xs text-brand-green">
          {inscricoesEstaoAbertas(
            evento,
            inscricoes.filter((i) => i.eventoId === evento.id && i.status === "confirmada")
              .length
          )
            ? "Inscrições abertas no Portal do Atleta."
            : "Inscrições abertas no cadastro, mas já lotadas ou além da data limite."}
        </p>
      )}
    </div>
  );
}
