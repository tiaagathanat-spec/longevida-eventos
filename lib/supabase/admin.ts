// Cliente Supabase com a chave service_role — usado APENAS no servidor
// para operações administrativas (ex: criar conta de funcionário e
// vínculo de organização). NUNCA importar a partir de um Client
// Component: a chave é um segredo e não pode ir para o bundle.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor. Defina em .env.local e nas variáveis de ambiente da Vercel."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
