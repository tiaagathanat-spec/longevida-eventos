// Callback do Supabase Auth (fluxo de link por e-mail / OAuth).
// Recebe `?code=...&next=...`, troca o code por uma sessão e grava os
// cookies via createServerClient, redirecionando de volta para o app.
//
// Configurar no painel do Supabase (Authentication > URL Configuration):
// redirect URLs de produção/dev apontando para /api/auth.
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const redirectUrl = new URL(next, origin);
      // Só redireciona para dentro do próprio app.
      if (redirectUrl.origin === origin) {
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return NextResponse.redirect(`${origin}/?erro=auth_callback_invalido`);
}
