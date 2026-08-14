// Cria a conta de acesso de um funcionário (staff) e o víncula à
// organização do administrador autenticado. Usa a chave service_role
// no servidor para criar o usuário no Supabase Auth e preencher
// public.usuarios (via trigger) + public.organizacao_usuarios.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getUsuarioAtual,
  getOrganizacoesDoUsuario,
  type PapelOrganizacao,
} from "@/lib/auth";

const PAPEIS_VALIDOS: PapelOrganizacao[] = [
  "administrador",
  "organizador",
  "cronometragem",
  "financeiro",
  "leitura",
];

function gerarSenhaTemporaria(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const rnd = new Uint8Array(12);
  crypto.getRandomValues(rnd);
  return Array.from(rnd, (b) => charset[b % charset.length]).join("");
}

export async function POST(request: Request) {
  const usuario = await getUsuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const organizacoes = await getOrganizacoesDoUsuario(usuario.id);
  const orgAdmin = organizacoes.find((o) => o.papel === "administrador");
  if (!orgAdmin) {
    return NextResponse.json(
      { erro: "Você precisa ser administrador para criar funcionários." },
      { status: 403 }
    );
  }

  let body: {
    nome?: string;
    email?: string;
    telefone?: string;
    papel?: PapelOrganizacao;
    ativo?: boolean;
    senha?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const nome = body.nome?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const telefone = body.telefone?.trim() ?? "";
  const papel = body.papel;

  if (!nome || !email) {
    return NextResponse.json(
      { erro: "Informe nome e e-mail do funcionário." },
      { status: 400 }
    );
  }
  if (!papel || !PAPEIS_VALIDOS.includes(papel)) {
    return NextResponse.json({ erro: "Papel inválido." }, { status: 400 });
  }

  // Senha enviada pelo admin ou gerada automaticamente no servidor.
  const senha =
    body.senha && body.senha.length >= 6 ? body.senha : gerarSenhaTemporaria();

  let admin;
  try {
    admin = createAdminClient();
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Configuração de segurança ausente." },
      { status: 500 }
    );
  }

  // Cliente autenticado (RLS): o admin pode ler `usuarios` porque tem
  // vínculo com a organização — usado para detectar conta já existente.
  const supabase = createClient();
  const { data: existente } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let usuarioId: string;
  let criado = false;

  if (existente) {
    // Conta já existe (ex: o funcionário já foi atleta). Reaproveita e
    // redefine a senha para a temporária.
    const { error: erroReset } = await admin.auth.admin.updateUserById(
      existente.id,
      { password: senha, email_confirm: true }
    );
    if (erroReset) {
      return NextResponse.json(
        { erro: `Não foi possível redefinir a senha: ${erroReset.message}` },
        { status: 400 }
      );
    }
    usuarioId = existente.id;
  } else {
    const { data, error: erroCriar } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, tipo_conta: "staff", telefone },
    });
    if (erroCriar) {
      return NextResponse.json(
        { erro: `Não foi possível criar a conta: ${erroCriar.message}` },
        { status: 400 }
      );
    }
    usuarioId = data.user.id;
    criado = true;
  }

  // Garante perfil staff (relevante quando a conta já existia como atleta).
  await admin.from("usuarios").update({ tipo_conta: "staff" }).eq("id", usuarioId);

  // Vínculo do funcionário com a organização e seu papel.
  const { error: erroVinculo } = await admin
    .from("organizacao_usuarios")
    .upsert(
      { organizacao_id: orgAdmin.organizacaoId, usuario_id: usuarioId, papel },
      { onConflict: "organizacao_id,usuario_id" }
    );
  if (erroVinculo) {
    return NextResponse.json(
      { erro: `Não foi possível vincular à organização: ${erroVinculo.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    authUserId: usuarioId,
    senhaTemporaria: senha,
    criado,
    email,
  });
}
