// Middleware raiz do Next.js.
//
// Responsabilidade única aqui: exigir autenticação (usuário logado)
// nas três áreas da aplicação — Admin (/admin), Organização
// (/organizacao) e Portal do Atleta (/portal). A checagem de PAPEL
// (quem pode ver o quê dentro de uma rota autenticada) fica a cargo de
// cada página/layout — ver, por exemplo,
// app/organizacao/cronometragem/page.tsx, que é um Server Component e
// checa o papel via lib/auth.ts antes de renderizar.
import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/organizacao/:path*",
    "/portal/:path*",
  ],
};
