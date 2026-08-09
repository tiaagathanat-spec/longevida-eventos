// Cliente Supabase para uso no SERVIDOR (Server Components, Server
// Actions, Route Handlers). NUNCA importar este arquivo a partir de um
// Client Component ("use client") — ele depende de next/headers, que
// só existe no servidor.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Chamado a partir de um Server Component (não pode
            // escrever cookies). Seguro ignorar: o middleware já
            // renova a sessão a cada request.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Idem: ignorado quando chamado a partir de um Server
            // Component.
          }
        },
      },
    }
  );
}
