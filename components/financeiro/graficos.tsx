"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type GraficosFinanceiroProps = {
  receitaPorEvento: { nome: string; receita: number }[];
  inscritosPorCategoria: { nome: string; quantidade: number }[];
};

function formatarMoedaCurta(valor: number) {
  return `R$ ${valor.toLocaleString("pt-BR")}`;
}

export function GraficosFinanceiro({
  receitaPorEvento,
  inscritosPorCategoria,
}: GraficosFinanceiroProps) {
  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
          Receita por evento
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={receitaPorEvento} margin={{ left: -16, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="nome"
                tick={{ fontSize: 11, fill: "#64748b" }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={formatarMoedaCurta} />
              <Tooltip
                formatter={(value: number) => formatarMoedaCurta(value)}
                contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 13 }}
              />
              <Bar dataKey="receita" fill="#00A6D6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
          Inscritos por categoria
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={inscritosPorCategoria} margin={{ left: -16, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="nome"
                tick={{ fontSize: 11, fill: "#64748b" }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 13 }} />
              <Bar dataKey="quantidade" fill="#7CC242" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
