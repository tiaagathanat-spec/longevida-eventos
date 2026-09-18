import { describe, expect, it } from "vitest";
import {
  normalizarIdentificador,
  identificadoresCondizem,
  localizarQrPorIdentificador,
  extrairIdInscricaoDireto,
  localizarResolucao,
  validarEventoDaResolucao,
  type ResolucaoQr,
} from "@/lib/qrcodes/resolver";
import type { InscricaoQrCode } from "@/lib/mock/qrcodes-store";
import type { Inscricao } from "@/lib/mock/inscricoes-store";

// ── fixtures ────────────────────────────────────────────────────────

const QR_INDIVIDUAL: InscricaoQrCode = {
  id: "qr1",
  inscricaoId: "ins001",
  identificador: "LQ-abcdefghij1234567890",
  ativo: true,
  criadoEm: "2025-10-01T10:00:00Z",
  leituras: [],
};

const QR_DUPLA: InscricaoQrCode = {
  id: "qr2",
  inscricaoId: "ins002",
  identificador: "LQ-xkcd000000000000000",
  ativo: true,
  criadoEm: "2025-10-01T10:00:00Z",
  leituras: [],
};

const QR_CANCELADO: InscricaoQrCode = {
  id: "qr3",
  inscricaoId: "ins003",
  identificador: "LQ-cancelado000000000",
  ativo: false,
  criadoEm: "2025-10-01T10:00:00Z",
  leituras: [],
};

const QR_OUTRO_EVENTO: InscricaoQrCode = {
  id: "qr4",
  inscricaoId: "ins004",
  identificador: "LQ-outroevento0000000",
  ativo: true,
  criadoEm: "2025-10-01T10:00:00Z",
  leituras: [],
};

const INSC_INDIVIDUAL: Inscricao = {
  id: "ins001",
  eventoId: "ev01",
  provaId: "prov01",
  status: "confirmada",
  atletaNome: "MARIA SILVA",
  dataInscricao: "2025-09-01",
};

const INSC_DUPLA: Inscricao = {
  id: "ins002",
  eventoId: "ev01",
  provaId: "prov02",
  status: "confirmada",
  atletaNome: "JOAO PEREIRA",
  atletaNome2: "ANA PEREIRA",
  dataInscricao: "2025-09-01",
};

const INSC_CANCELADA: Inscricao = {
  id: "ins003",
  eventoId: "ev01",
  provaId: "prov03",
  status: "cancelada",
  atletaNome: "PEDRO CANCELADO",
  dataInscricao: "2025-09-01",
};

const INSC_OUTRO_EVENTO: Inscricao = {
  id: "ins004",
  eventoId: "ev02",
  provaId: "prov04",
  status: "confirmada",
  atletaNome: "OUTRO EVENTO",
  dataInscricao: "2025-09-01",
};

const QRCODES = [QR_INDIVIDUAL, QR_DUPLA, QR_CANCELADO, QR_OUTRO_EVENTO];
const INSCRICOES = [
  INSC_INDIVIDUAL,
  INSC_DUPLA,
  INSC_CANCELADA,
  INSC_OUTRO_EVENTO,
];

// ── normalizarIdentificador ─────────────────────────────────────────

describe("normalizarIdentificador", () => {
  it("remove BOM e caracteres de largura zero", () => {
    expect(normalizarIdentificador("\uFEFFLQ-abc")).toBe("LQ-abc");
    expect(normalizarIdentificador("LQ\u200B-\u200Cabc")).toBe("LQ-abc");
  });

  it("remove quebras de linha e espaços externos", () => {
    expect(normalizarIdentificador("  LQ-abc  \n")).toBe("LQ-abc");
    expect(normalizarIdentificador("\rLQ-abc\r\n")).toBe("LQ-abc");
  });

  it("remove caracteres de controle (CC/CF)", () => {
    expect(normalizarIdentificador("LQ-\u0003abc\u0007")).toBe("LQ-abc");
  });

  it("retorna vazio para entrada vazia ou não-string", () => {
    expect(normalizarIdentificador("")).toBe("");
    expect(normalizarIdentificador(null as unknown as string)).toBe("");
    expect(normalizarIdentificador(undefined as unknown as string)).toBe("");
  });
});

// ── identificadoresCondizem ─────────────────────────────────────────

describe("identificadoresCondizem", () => {
  it("aceita igualdade exata", () => {
    expect(identificadoresCondizem("LQ-abc", "LQ-abc")).toBe(true);
  });

  it("aceita diferença de caixa", () => {
    expect(identificadoresCondizem("LQ-ABC", "LQ-abc")).toBe(true);
    expect(identificadoresCondizem("lq-abc", "LQ-ABC")).toBe(true);
  });

  it("rejeita identificadores diferentes", () => {
    expect(identificadoresCondizem("LQ-abc", "LQ-def")).toBe(false);
  });
});

// ── localizarQrPorIdentificador ─────────────────────────────────────

describe("localizarQrPorIdentificador", () => {
  it("encontra por identificador exato", () => {
    expect(
      localizarQrPorIdentificador(QRCODES, "LQ-abcdefghij1234567890")
    ).toBe(QR_INDIVIDUAL);
  });

  it("encontra tolerando caixa", () => {
    expect(
      localizarQrPorIdentificador(QRCODES, "lq-abcdefghij1234567890")
    ).toBe(QR_INDIVIDUAL);
  });

  it("encontra tolerando BOM", () => {
    expect(
      localizarQrPorIdentificador(QRCODES, "\uFEFFLQ-xkcd000000000000000")
    ).toBe(QR_DUPLA);
  });

  it("retorna undefined para identificador inexistente", () => {
    expect(localizarQrPorIdentificador(QRCODES, "LQ-inexistente")).toBeUndefined();
  });

  it("retorna undefined para entrada vazia", () => {
    expect(localizarQrPorIdentificador(QRCODES, "")).toBeUndefined();
  });
});

// ── extrairIdInscricaoDireto ─────────────────────────────────────────

describe("extrairIdInscricaoDireto", () => {
  it("extrai id de inscrição a partir de formato LQ-<id>", () => {
    expect(extrairIdInscricaoDireto("LQ-pn2cw88s")).toBe("pn2cw88s");
  });

  it("extrai id de inscrição direto (sem prefixo)", () => {
    expect(extrairIdInscricaoDireto("pn2cw88s")).toBe("pn2cw88s");
  });

  it("tolera caixa no prefixo", () => {
    expect(extrairIdInscricaoDireto("lq-pn2cw88s")).toBe("pn2cw88s");
  });

  it("retorna null para entrada vazia", () => {
    expect(extrairIdInscricaoDireto("")).toBeNull();
  });
});

// ── localizarResolucao ──────────────────────────────────────────────

describe("localizarResolucao", () => {
  it("resolve inscrição individual pelo identificador do QR", () => {
    const resolucao = localizarResolucao(
      QRCODES,
      INSCRICOES,
      "LQ-abcdefghij1234567890"
    );
    expect(resolucao).not.toBeNull();
    expect(resolucao?.inscricao.id).toBe("ins001");
    expect(resolucao?.qr?.id).toBe("qr1");
    expect(resolucao?.porIdentificador).toBe(true);
  });

  it("resolve inscrição Family/Dupla (atletaNome2 presente)", () => {
    const resolucao = localizarResolucao(
      QRCODES,
      INSCRICOES,
      "LQ-xkcd000000000000000"
    );
    expect(resolucao).not.toBeNull();
    expect(resolucao?.inscricao.id).toBe("ins002");
    expect(resolucao?.inscricao.atletaNome2).toBe("ANA PEREIRA");
  });

  it("resolve por id direto (QR antigos sem registro em app_qrcodes)", () => {
    const qrcodesSemInsc001 = QRCODES.filter(
      (q) => q.inscricaoId !== "ins001"
    );
    const resolucao = localizarResolucao(qrcodesSemInsc001, INSCRICOES, "ins001");
    expect(resolucao).not.toBeNull();
    expect(resolucao?.inscricao.id).toBe("ins001");
    expect(resolucao?.porIdentificador).toBe(false);
  });

  it("retorna null para identificador inexistente", () => {
    expect(localizarResolucao(QRCODES, INSCRICOES, "LQ-naoexiste")).toBeNull();
  });

  it("retorna null para entrada vazia", () => {
    expect(localizarResolucao(QRCODES, INSCRICOES, "")).toBeNull();
  });
});

// ── validarEventoDaResolucao ─────────────────────────────────────────

describe("validarEventoDaResolucao", () => {
  it("aceita inscrição do mesmo evento", () => {
    const resolucao: ResolucaoQr = {
      qr: QR_INDIVIDUAL,
      inscricao: INSC_INDIVIDUAL,
      porIdentificador: true,
    };
    expect(validarEventoDaResolucao(resolucao, "ev01")).toEqual({ ok: true });
  });

  it("rejeita inscrição de outro evento", () => {
    const resolucao: ResolucaoQr = {
      qr: QR_OUTRO_EVENTO,
      inscricao: INSC_OUTRO_EVENTO,
      porIdentificador: true,
    };
    expect(validarEventoDaResolucao(resolucao, "ev01")).toEqual({
      ok: false,
      motivo: "outro_evento",
    });
  });

  it("rejeita quando o evento do leitor não foi informado", () => {
    const resolucao: ResolucaoQr = {
      qr: QR_INDIVIDUAL,
      inscricao: INSC_INDIVIDUAL,
      porIdentificador: true,
    };
    expect(validarEventoDaResolucao(resolucao, undefined)).toEqual({
      ok: false,
      motivo: "evento_indefinido",
    });
  });
});

// ── integração: formato impresso na dorsal = formato lido pela câmera ─

describe("formato dorsal <-> câmera", () => {
  it("identificador impresso (LQ- longo) é localizado após normalização da câmera", () => {
    const lidoCamera = "\uFEFF  LQ-abcdefghij1234567890  \n";
    expect(localizarQrPorIdentificador(QRCODES, lidoCamera)).toBe(QR_INDIVIDUAL);
    expect(
      localizarResolucao(QRCODES, INSCRICOES, lidoCamera)?.inscricao.id
    ).toBe("ins001");
  });

  it("câmera em caixa alta encontra identificador salvo em minúsculas", () => {
    const impresso = "lq-abcdefghij1234567890";
    const qrcodesMinusculo: InscricaoQrCode[] = [
      { ...QR_INDIVIDUAL, identificador: impresso },
    ];
    expect(
      localizarQrPorIdentificador(qrcodesMinusculo, "LQ-ABCDEFGHIJ1234567890")
    ).toEqual(expect.objectContaining({ identificador: impresso }));
  });
});