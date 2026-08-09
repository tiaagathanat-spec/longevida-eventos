import { redirect } from "next/navigation";

// Relatórios e exportações são feitos na tela principal do Financeiro.
export default function FinanceiroRelatoriosPage() {
  redirect("/admin/financeiro");
}
