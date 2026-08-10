"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  ListChecks,
  Users,
  Timer,
  Trophy,
  Package,
  QrCode,
} from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useResultados } from "@/lib/mock/resultados-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import { useUsuarioOrganizacao } from "@/lib/supabase/usuario-organizacao";
import { ModuloOrganizacao } from "@/lib/mock/funcionarios-store";

const MODULOS: {
  href: string;
  titulo: string;
  descricao: string;
  icon: typeof ListChecks;
  cor: string;
  permissao?: ModuloOrganizacao;
}[] = [
  {
    href: "provas",
    titulo: "Provas",
    descricao: "Modalidades, categorias e horários do evento.",
    icon: ListChecks,
    cor: "bg-brand-blue/10 text-brand-blue",
    permissao: "provas",
  },
  {
    href: "inscritos",
    titulo: "Atletas inscritos",
    descricao: "Confira quem está inscrito em cada prova.",
    icon: Users,
    cor: "bg-brand-green/10 text-brand-green",
    permissao: "inscritos",
  },
  {
    href: "resultados",
    titulo: "Lançar resultados",
    descricao: "Informe os tempos de cada atleta por prova.",
    icon: Timer,
    cor: "bg-violet-100 text-violet-600",
    permissao: "resultados",
  },
  {
    href: "classificacao",
    titulo: "Classificação geral",
    descricao: "Acompanhe o ranking por prova e publique.",
    icon: Trophy,
    cor: "bg-amber-100 text-amber-600",
    permissao: "classificacao",
  },
  {
    href: "kits",
    titulo: "Entrega de kits",
    descricao: "Confirme a entrega do kit para cada inscrito.",
    icon: Package,
    cor: "bg-orange-100 text-orange-700",
    permissao: "kits",
  },
  {
    href: "leitor-qr",
    titulo: "Leitor de QR Code",
    descricao: "Leia o QR da inscrição e faça o check-in no dia do evento.",
    icon: QrCode,
    cor: "bg-teal-100 text-teal-700",
    permissao: "inscritos",
  },
];

export default function OrganizacaoEventoPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { obterPorInscricao } = useResultados();
  const { obterPorInscricao: obterDorsal } = useDorsais();
  const { permissoes } = useUsuarioOrganizacao();

  const modulosPermitidos = MODULOS.filter(
    (modulo) => !modulo.permissao || permissoes.includes(modulo.permissao)
  );

  const evento = obterEvento(eventoId);

  const resumo = useMemo(() => {
    const provasDoEvento = provas.filter((p) => p.eventoId === eventoId);
    const inscricoesConfirmadas = inscricoes.filter(
      (i) => i.eventoId === eventoId && i.status === "confirmada"
    );
    const semTempo = inscricoesConfirmadas.filter((i) => !obterPorInscricao(i.id)?.tempo);
    const kitsEntregues = inscricoesConfirmadas.filter((i) => obterDorsal(i.id)?.kitEntregue);
    return {
      provasDoEvento,
      inscricoesConfirmadas,
      semTempo,
      kitsEntregues,
    };
  }, [provas, inscricoes, eventoId, obterPorInscricao, obterDorsal]);

  if (!evento) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
        <Link
          href="/organizacao/eventos"
          className="mt-4 inline-block text-sm font-medium text-brand-green hover:underline"
        >
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href="/organizacao/eventos"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Eventos
      </Link>

      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{evento.nome}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {new Date(evento.data + "T00:00:00").toLocaleDateString("pt-BR")}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {evento.local}
          </span>
        </div>
      </header>

      {/* Resumo do evento */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ResumoCard label="Provas" valor={resumo.provasDoEvento.length} />
        <ResumoCard label="Inscritos confirmados" valor={resumo.inscricoesConfirmadas.length} />
        <ResumoCard label="Sem tempo lançado" valor={resumo.semTempo.length} alerta />
        <ResumoCard label="Kits entregues" valor={resumo.kitsEntregues.length} />
      </div>

      {/* Módulos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modulosPermitidos.map(({ href, titulo, descricao, icon: Icon, cor }) => (
          <Link
            key={href}
            href={`/organizacao/eventos/${eventoId}/${href}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand-green/50 dark:border-slate-800 dark:bg-slate-950"
          >
            <div className={`mb-3 inline-flex rounded-xl p-2.5 ${cor}`}>
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{titulo}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{descricao}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ResumoCard({
  label,
  valor,
  alerta,
}: {
  label: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          alerta ? "text-amber-600" : "text-slate-900 dark:text-white"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
