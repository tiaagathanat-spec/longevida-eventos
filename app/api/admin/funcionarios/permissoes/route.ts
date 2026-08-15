// Gestão das permissões (ações) de um funcionário POR EVENTO.
//
// Modelo (migration 0010, app_funcionario_eventos):
//   * Sem NENHUMA linha do funcionário na organização => ele vê TODOS
//     os eventos da organização (comportamento padrão preservado).
//   * Com linhas => vê SOMENTE os eventos listados nas linhas.
//   * permissoes = [] (vazio) => herda as permissões padrão do papel.
//   * permissoes preenchido => usa SOMENTE os módulos listados no vínculo.
//
// Endpoints:
//   GET ?usuarioId=<uuid>  -> eventos da org do admin + vínculos atuais
//                             do funcionário (eventoId + módulos).
//   PUT                    -> substitui os vínculos do funcionário na org:
//                             { usuarioId, eventos: [{ eventoId, permissoes }] }
//                             (eventos ausentes da lista têm o vínculo revogado).
//
// Usa service_role no servidor (mesmo padrão do /api/admin/funcionarios) e
// valida explicitamente que o funcionário pertence à organização do admin.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getUsuarioAtual,
  getOrganizacoesDoUsuario,
} from "@/lib/auth";

const MODULOS_VALIDOS = [
  "eventos",
  "provas",
  "inscritos",
  "kits",
  "resultados",
  "classificacao",
  "cronometragem",
  "financeiro",
  "configuracoes",
] as const;

type VinculoEvento = {
  eventoId: string;
  permissoes: string[];
};

async function exigirAdmin() {
  const usuario = await getUsuarioAtual();
  if (!usuario) {
    return { sucesso: false as const, status: 401, mensagem: "Não autenticado." };
  }
  const organizacoes = await getOrganizacoesDoUsuario(usuario.id);
  const orgAdmin = organizacoes.find((o) => o.papel === "administrador");
  if (!orgAdmin) {
    return {
      sucesso: false as const,
      status: 403,
      mensagem: "Você precisa ser administrador para gerenciar permissões.",
    };
  }
  return { sucesso: true as const, usuario, orgAdmin };
}

// Confirma que o funcionário (usuarioId) está vinculado à organização do
// admin e devolve o cliente service_role. Retorna NextResponse em erro.
async function confiarFuncionario(
  admin: ReturnType<typeof createAdminClient>,
  organizacaoId: string,
  usuarioId: string
): Promise<
  | { ok: true }
  | { ok: false; resposta: NextResponse }
> {
  const { data: vinculo, error } = await admin
    .from("organizacao_usuarios")
    .select("usuario_id")
    .eq("organizacao_id", organizacaoId)
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  if (error) {
    return {
      ok: false,
      resposta: NextResponse.json(
        { erro: `Não foi possível carregar o vínculo: ${error.message}` },
        { status: 500 }
      ),
    };
  }
  if (!vinculo) {
    return {
      ok: false,
      resposta: NextResponse.json(
        { erro: "Funcionário não está vinculado à sua organização." },
        { status: 404 }
      ),
    };
  }
  return { ok: true };
}

function respostaAdmin() {
  return NextResponse.json(
    { erro: "Configuração de segurança ausente." },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  const contexto = await exigirAdmin();
  if (!contexto.sucesso) {
    return NextResponse.json({ erro: contexto.mensagem }, { status: contexto.status });
  }
  const { orgAdmin } = contexto;

  const usuarioId = new URL(request.url).searchParams.get("usuarioId")?.trim();
  if (!usuarioId) {
    return NextResponse.json({ erro: "Informe o funcionário." }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return respostaAdmin();
  }

  const confianca = await confiarFuncionario(admin, orgAdmin.organizacaoId, usuarioId);
  if (!confianca.ok) return confianca.resposta;

  // Eventos da organização do admin (fonte para a lista da interface).
  const { data: eventos, error: erroEventos } = await admin
    .from("app_eventos")
    .select("id, nome, status")
    .eq("organizacao_id", orgAdmin.organizacaoId)
    .order("data");

  if (erroEventos) {
    return NextResponse.json(
      { erro: `Não foi possível carregar os eventos: ${erroEventos.message}` },
      { status: 500 }
    );
  }

  // Vínculos atuais do funcionário (só os da organização do admin).
  const idsEventos = (eventos ?? []).map((e) => e.id);
  const vinculos: VinculoEvento[] = [];
  if (idsEventos.length > 0) {
    const { data: linhas, error: erroVinculos } = await admin
      .from("app_funcionario_eventos")
      .select("evento_id, permissoes")
      .eq("usuario_id", usuarioId)
      .in("evento_id", idsEventos);
    if (erroVinculos) {
      return NextResponse.json(
        { erro: `Não foi possível carregar as permissões: ${erroVinculos.message}` },
        { status: 500 }
      );
    }
    for (const linha of linhas ?? []) {
      const lista = Array.isArray(linha.permissoes)
        ? (linha.permissoes as unknown[]).filter((m): m is string => typeof m === "string")
        : [];
      vinculos.push({ eventoId: linha.evento_id as string, permissoes: lista });
    }
  }

  return NextResponse.json({
    eventos: (eventos ?? []).map((e) => ({
      id: e.id as string,
      nome: (e.nome as string) ?? "",
      status: (e.status as string) ?? "",
    })),
    vinculos,
  });
}

export async function PUT(request: Request) {
  const contexto = await exigirAdmin();
  if (!contexto.sucesso) {
    return NextResponse.json({ erro: contexto.mensagem }, { status: contexto.status });
  }
  const { usuario, orgAdmin } = contexto;

  let body: { usuarioId?: string; eventos?: VinculoEvento[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const usuarioId = body.usuarioId?.trim();
  if (!usuarioId) {
    return NextResponse.json({ erro: "Informe o funcionário." }, { status: 400 });
  }
  if (usuarioId === usuario.id) {
    return NextResponse.json(
      { erro: "Você não pode alterar as suas próprias permissões." },
      { status: 400 }
    );
  }
  if (!Array.isArray(body.eventos)) {
    return NextResponse.json(
      { erro: "Informe a lista de eventos com as permissões." },
      { status: 400 }
    );
  }

  // Valida a lista recebida (eventos duplicados e módulos inválidos).
  const vistos = new Set<string>();
  for (const item of body.eventos) {
    const eventoId = item?.eventoId?.trim();
    if (!eventoId || vistos.has(eventoId)) {
      return NextResponse.json(
        { erro: "Lista de eventos inválida (evento ausente ou duplicado)." },
        { status: 400 }
      );
    }
    vistos.add(eventoId);
    if (!Array.isArray(item.permissoes)) {
      return NextResponse.json({ erro: "Permissões de evento inválidas." }, { status: 400 });
    }
    for (const modulo of item.permissoes) {
      if (!MODULOS_VALIDOS.includes(modulo as (typeof MODULOS_VALIDOS)[number])) {
        return NextResponse.json(
          { erro: `Módulo inválido: ${modulo}.` },
          { status: 400 }
        );
      }
    }
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { erro: "Configuração de segurança ausente." },
      { status: 500 }
    );
  }

  const confianca = await confiarFuncionario(admin, orgAdmin.organizacaoId, usuarioId);
  if (!confianca.ok) return confianca.resposta;

  // Todos os eventos da organização (para conferir que os informados
  // pertencem à org do admin — service_role ignora RLS, a checagem é aqui).
  const { data: eventos } = await admin
    .from("app_eventos")
    .select("id")
    .eq("organizacao_id", orgAdmin.organizacaoId);
  const idsValidos = new Set((eventos ?? []).map((e) => e.id as string));
  for (const eventoId of vistos) {
    if (!idsValidos.has(eventoId)) {
      return NextResponse.json(
        { erro: "Evento não pertence à sua organização." },
        { status: 400 }
      );
    }
  }

  // Concessões atuais do funcionário na organização.
  const { data: atuais } = await admin
    .from("app_funcionario_eventos")
    .select("id, evento_id")
    .eq("usuario_id", usuarioId)
    .in("evento_id", Array.from(idsValidos));

  const atuaisPorEvento = new Map(
    (atuais ?? []).map((a) => [a.evento_id as string, a.id as string])
  );
  const desejados = new Map(
    body.eventos.map((e) => [e.eventoId.trim(), e.permissoes])
  );

  // Remove vínculos que saíram da lista (revoga o acesso ao evento).
  for (const [eventoId, vinculoId] of atuaisPorEvento) {
    if (!desejados.has(eventoId)) {
      const { error } = await admin
        .from("app_funcionario_eventos")
        .delete()
        .eq("id", vinculoId);
      if (error) {
        return NextResponse.json(
          { erro: `Não foi possível revogar o acesso ao evento: ${error.message}` },
          { status: 500 }
        );
      }
    }
  }

  // Insere/atualiza os vínculos da lista.
  for (const [eventoId, permissoes] of desejados) {
    const vinculoId = atuaisPorEvento.get(eventoId);
    const dados = { usuario_id: usuarioId, evento_id: eventoId, permissoes };
    if (vinculoId) {
      const { error } = await admin
        .from("app_funcionario_eventos")
        .update({ permissoes })
        .eq("id", vinculoId);
      if (error) {
        return NextResponse.json(
          { erro: `Não foi possível atualizar o evento: ${error.message}` },
          { status: 500 }
        );
      }
    } else {
      const { error } = await admin
        .from("app_funcionario_eventos")
        .insert({ ...dados });
      if (error) {
        return NextResponse.json(
          { erro: `Não foi possível conceder acesso ao evento: ${error.message}` },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
