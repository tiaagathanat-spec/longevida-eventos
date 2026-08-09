import {
  Users,
  CheckCircle2,
  Clock3,
  TrendingUp,
  Wallet,
  HourglassIcon,
  Package,
} from "lucide-react";

type CardsResumoProps = {
  totalInscritos: number;
  totalPagas: number;
  totalPendentes: number;
  receitaPrevista: number;
  receitaRecebida: number;
  receitaPendente: number;
  kitsAProduzir: number;
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CardsResumo({
  totalInscritos,
  totalPagas,
  totalPendentes,
  receitaPrevista,
  receitaRecebida,
  receitaPendente,
  kitsAProduzir,
}: CardsResumoProps) {
  const cards = [
    { label: "Total de inscritos", value: String(totalInscritos), icon: Users, cor: "blue" as const },
    { label: "Inscrições pagas", value: String(totalPagas), icon: CheckCircle2, cor: "green" as const },
    { label: "Inscrições pendentes", value: String(totalPendentes), icon: Clock3, cor: "amber" as const },
    { label: "Receita prevista", value: formatarMoeda(receitaPrevista), icon: TrendingUp, cor: "blue" as const },
    { label: "Receita recebida", value: formatarMoeda(receitaRecebida), icon: Wallet, cor: "green" as const },
    { label: "Receita pendente", value: formatarMoeda(receitaPendente), icon: HourglassIcon, cor: "amber" as const },
    { label: "Kits a produzir", value: String(kitsAProduzir), icon: Package, cor: "blue" as const },
  ];

  const corIcone: Record<string, string> = {
    blue: "bg-brand-blue/10 text-brand-blue",
    green: "bg-brand-green/10 text-brand-green",
    amber: "bg-amber-100 text-amber-600",
  };

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ label, value, icon: Icon, cor }) => (
        <div
          key={label}
          className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {label}
            </span>
            <div className={`rounded-xl p-2 ${corIcone[cor]}`}>
              <Icon className="h-4 w-4" strokeWidth={2} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
      ))}
    </section>
  );
}
