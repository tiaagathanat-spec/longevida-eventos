// Webhook do gateway de pagamento.
// Recebe notificações de status (aprovado/recusado/estornado) via POST.
//
// Ainda não há gateway integrado: o endpoint responde 501 até a
// integração existir. Métodos diferentes de POST retornam 405.
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // TODO: validar assinatura/autenticidade da chamada (ex: verificar
  // assinatura do gateway ou um secret compartilhado) antes de confiar
  // no corpo da notificação.
  return NextResponse.json(
    { erro: "Integração com gateway de pagamento ainda não implementada." },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json(
    { erro: "Webhook só aceita POST." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function PUT() {
  return NextResponse.json(
    { erro: "Webhook só aceita POST." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { erro: "Webhook só aceita POST." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { erro: "Webhook só aceita POST." },
    { status: 405, headers: { Allow: "POST" } }
  );
}
