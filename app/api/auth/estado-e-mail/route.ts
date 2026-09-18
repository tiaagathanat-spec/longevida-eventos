// Informa o estado do cadastro de um e-mail (se existe e se está
// confirmado), usando o admin client (service_role). Usado pelo Cadastro
// quando alguém tenta se cadastrar com um e-mail que já existe — a regra
// de negócio é NÃO criar segunda conta e orientar o usuário.
//
// Retorna:
//   { status: "inexistente" }          — sem conta nesse e-mail.
//   { status: "pendente",  email }     — conta existe, e-mail NÃO confirmado.
//   { status: "confirmado", email }    — conta existe e já confirmada.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  if (typeof email !== "string" || !email.trim() || !email.includes("@")) {
    return NextResponse.json({ erro: "Informe um e-mail válido." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const alvo = email.trim().toLowerCase();

    // Leitura admin (sem passar pelo RLS). Lista em páginas de 1000 até
    // encontrar o e-mail ou esgotar.
    let pagina = 1;
    let encontrado: { confirmed_at: string | null; email: string } | null = null;
    let temMais = true;

    while (temMais && !encontrado) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page: pagina,
        perPage: 1000,
      });
      if (error) throw error;
      const usuario = data.users.find(
        (u) => (u.email ?? "").toLowerCase() === alvo
      );
      if (usuario) {
        encontrado = {
          confirmed_at: usuario.email_confirmed_at ?? null,
          email: usuario.email ?? alvo,
        };
      }
      temMais = data.users.length === 1000;
      pagina += 1;
    }

    if (!encontrado) {
      return NextResponse.json({ status: "inexistente" });
    }

    return NextResponse.json({
      status: encontrado.confirmed_at ? "confirmado" : "pendente",
      email: encontrado.email,
    });
  } catch (err) {
    console.error("estado-e-mail: erro ao consultar usuário.", err);
    return NextResponse.json(
      { erro: "Não foi possível verificar o cadastro agora. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}