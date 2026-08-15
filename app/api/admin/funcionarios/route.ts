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
  type UsuarioAtual,
  type OrganizacaoDoUsuario,
} from "@/lib/auth";

const PAPEIS_VALIDOS: PapelOrganizacao[] = [
  "administrador",
  "organizador",
  "cronometragem",
  "financeiro",
  "leitura",
];

// Valida que o usuário autenticado é administrador de alguma
// organização e devolve o contexto (usuário + vínculo de admin).
async function exigirAdmin(): Promise<
  | { sucesso: true; usuario: UsuarioAtual; orgAdmin: OrganizacaoDoUsuario }
  | { sucesso: false; status: number; mensagem: string }
> {
  const usuario = await getUsuarioAtual();
  if (!usuario) {
    return { sucesso: false, status: 401, mensagem: "Não autenticado." };
  }
  const organizacoes = await getOrganizacoesDoUsuario(usuario.id);
  const orgAdmin = organizacoes.find((o) => o.papel === "administrador");
  if (!orgAdmin) {
    return {
      sucesso: false,
      status: 403,
      mensagem: "Você precisa ser administrador para gerenciar funcionários.",
    };
  }
  return { sucesso: true, usuario, orgAdmin };
}

function gerarSenhaTemporaria(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const rnd = new Uint8Array(12);
  crypto.getRandomValues(rnd);
  return Array.from(rnd, (b) => charset[b % charset.length]).join("");
}

// Lista a equipe REAL vinculada à organização do administrador: vínculos
// de public.organizacao_usuarios + perfis de public.usuarios. Usa o
// cliente autenticado (RLS): o admin lê os vínculos da própria org e os
// perfis de todos os usuários por ter vínculo — sem service_role.
export async function GET() {
  const usuario = await getUsuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const organizacoes = await getOrganizacoesDoUsuario(usuario.id);
  const orgAdmin = organizacoes.find((o) => o.papel === "administrador");
  if (!orgAdmin) {
    return NextResponse.json(
      { erro: "Você precisa ser administrador para ver os funcionários." },
      { status: 403 }
    );
  }

  const supabase = createClient();

  const { data: vinculos, error: erroVinculos } = await supabase
    .from("organizacao_usuarios")
    .select("usuario_id, papel, vinculado_em")
    .eq("organizacao_id", orgAdmin.organizacaoId);

  if (erroVinculos) {
    return NextResponse.json(
      { erro: `Não foi possível carregar a equipe: ${erroVinculos.message}` },
      { status: 500 }
    );
  }

  const ids = (vinculos ?? []).map((v) => v.usuario_id);
  const perfis = ids.length > 0
    ? await supabase.from("usuarios").select("id, nome, email, telefone, tipo_conta").in("id", ids)
    : { data: [], error: null };

  if (perfis.error) {
    return NextResponse.json(
      { erro: `Não foi possível carregar os perfis: ${perfis.error.message}` },
      { status: 500 }
    );
  }

  const perfilPorId = new Map(
    (perfis.data ?? []).map((p) => [p.id, p])
  );

  const funcionarios = (vinculos ?? [])
    .map((v) => {
      const perfil = perfilPorId.get(v.usuario_id);
      return {
        authUserId: v.usuario_id,
        nome: perfil?.nome ?? "Sem nome cadastrado",
        email: perfil?.email ?? "",
        telefone: perfil?.telefone ?? "",
        papel: v.papel,
        ativo: true,
        vinculadoEm: v.vinculado_em ?? null,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return NextResponse.json({ funcionarios });
}

// Atualiza um funcionário REAL da organização: papel (autorização) e
// dados de perfil (nome/telefone). Usa service_role e valida
// explicitamente que o vínculo pertence à organização do admin.
export async function PATCH(request: Request) {
  const contexto = await exigirAdmin();
  if (!contexto.sucesso) {
    return NextResponse.json({ erro: contexto.mensagem }, { status: contexto.status });
  }
  const { usuario, orgAdmin } = contexto;

  let body: {
    usuarioId?: string;
    nome?: string;
    telefone?: string;
    papel?: PapelOrganizacao;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const usuarioId = body.usuarioId?.trim();
  if (!usuarioId) {
    return NextResponse.json({ erro: "Informe o funcionário a atualizar." }, { status: 400 });
  }
  if (usuarioId === usuario.id) {
    return NextResponse.json(
      { erro: "Você não pode alterar o seu próprio vínculo." },
      { status: 400 }
    );
  }
  if (body.papel && !PAPEIS_VALIDOS.includes(body.papel)) {
    return NextResponse.json({ erro: "Papel inválido." }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Configuração de segurança ausente." },
      { status: 500 }
    );
  }

  // service_role ignora RLS: confere explicitamente o vínculo na org.
  const { data: vinculo, error: erroVinculo } = await admin
    .from("organizacao_usuarios")
    .select("papel")
    .eq("organizacao_id", orgAdmin.organizacaoId)
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  if (erroVinculo) {
    return NextResponse.json(
      { erro: `Não foi possível carregar o vínculo: ${erroVinculo.message}` },
      { status: 500 }
    );
  }
  if (!vinculo) {
    return NextResponse.json(
      { erro: "Funcionário não está vinculado à sua organização." },
      { status: 404 }
    );
  }

  const atualizacoes: Record<string, unknown> = {};
  if (body.papel) atualizacoes.papel = body.papel;
  if (Object.keys(atualizacoes).length > 0) {
    const { error: erroAtualizar } = await admin
      .from("organizacao_usuarios")
      .update(atualizacoes)
      .eq("organizacao_id", orgAdmin.organizacaoId)
      .eq("usuario_id", usuarioId);
    if (erroAtualizar) {
      return NextResponse.json(
        { erro: `Não foi possível atualizar o papel: ${erroAtualizar.message}` },
        { status: 500 }
      );
    }
  }

  const perfil: Record<string, unknown> = {};
  if (typeof body.nome === "string" && body.nome.trim()) perfil.nome = body.nome.trim();
  if (typeof body.telefone === "string") perfil.telefone = body.telefone.trim();
  if (Object.keys(perfil).length > 0) {
    const { error: erroPerfil } = await admin.from("usuarios").update(perfil).eq("id", usuarioId);
    if (erroPerfil) {
      return NextResponse.json(
        { erro: `Não foi possível atualizar o perfil: ${erroPerfil.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}

// Revoga o acesso de um funcionário REAL à organização do admin:
// remove as concessões por evento (app_funcionario_eventos) e o
// vínculo (organizacao_usuarios). O usuário do Supabase Auth é
// mantido (ele pode ser atleta/responsável no portal).
export async function DELETE(request: Request) {
  const contexto = await exigirAdmin();
  if (!contexto.sucesso) {
    return NextResponse.json({ erro: contexto.mensagem }, { status: contexto.status });
  }
  const { usuario, orgAdmin } = contexto;

  let body: { usuarioId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const usuarioId = body.usuarioId?.trim();
  if (!usuarioId) {
    return NextResponse.json({ erro: "Informe o funcionário a remover." }, { status: 400 });
  }
  if (usuarioId === usuario.id) {
    return NextResponse.json(
      { erro: "Você não pode remover o seu próprio vínculo." },
      { status: 400 }
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Configuração de segurança ausente." },
      { status: 500 }
    );
  }

  const { data: vinculo, error: erroVinculo } = await admin
    .from("organizacao_usuarios")
    .select("usuario_id")
    .eq("organizacao_id", orgAdmin.organizacaoId)
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  if (erroVinculo) {
    return NextResponse.json(
      { erro: `Não foi possível carregar o vínculo: ${erroVinculo.message}` },
      { status: 500 }
    );
  }
  if (!vinculo) {
    return NextResponse.json(
      { erro: "Funcionário não está vinculado à sua organização." },
      { status: 404 }
    );
  }

  // Remove concessões por evento da organização antes de revogar o
  // vínculo (sem elas, o ex-funcionário não ganha acesso, mas sobra
  // lixo na junção).
  const { data: eventos } = await admin
    .from("app_eventos")
    .select("id")
    .eq("organizacao_id", orgAdmin.organizacaoId);
  const ids = (eventos ?? []).map((e) => e.id);
  if (ids.length > 0) {
    await admin
      .from("app_funcionario_eventos")
      .delete()
      .eq("usuario_id", usuarioId)
      .in("evento_id", ids);
  }

  const { error: erroRemover } = await admin
    .from("organizacao_usuarios")
    .delete()
    .eq("organizacao_id", orgAdmin.organizacaoId)
    .eq("usuario_id", usuarioId);
  if (erroRemover) {
    return NextResponse.json(
      { erro: `Não foi possível remover o vínculo: ${erroRemover.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {  const usuario = await getUsuarioAtual();
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
