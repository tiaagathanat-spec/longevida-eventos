import { redirect } from "next/navigation";

// A gestão de pagamentos é feita na tela principal do Financeiro.
export default function FinanceiroPagamentosPage() {
  redirect("/admin/financeiro");
}
