import { COR_FAIXA_HEX, CorFaixa } from "@/lib/mock/faixas-numeracao-store";
import { QrCodeImagem } from "@/components/qrcode/qr-code-imagem";
import { LogoLongevida } from "@/components/brand/logo-longevida";
import type { DadosParticipacao } from "@/lib/dorsais/dados-participacao";
import { BlocoParticipacao } from "@/components/dorsais/bloco-participacao";
import { normalizarNomePessoa } from "@/lib/utils/nomes";

type CrachaAtletaProps = {
  atletaNome: string;
  categoriaNome: string;
  eventoNome: string;
  dataEvento: string; // já formatada
  localEvento?: string;
  identificador?: string; // identificador único da inscrição (impresso no QR)
  qrcodeConteudo?: string; // conteúdo impresso no QR (lido no leitor da organização)
  fotoUrl?: string; // foto do atleta (data URL) quando disponível
  cor?: CorFaixa;
  participacao?: DadosParticipacao; // percurso/distância e, em equipe, quem faz o quê
};

function iniciaisDe(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

// Credencial oficial do atleta, tamanho físico de 8,5cm x 5,5cm (padrão de
// crachá). Usada no Portal do Atleta e na impressão dos Cards Oficiais.
//
// A cor da categoria vem da MESMA fonte das faixas/dorsais
// (faixas-numeracao-store) e aparece em três pontos: a faixa lateral, o
// bloco de foto/iniciais e a etiqueta da categoria. O número de peito
// (dorsal) é destacado, o nome é truncado de forma controlada e o QR Code
// é preservado integralmente.
export function CrachaAtleta({
  atletaNome,
  categoriaNome,
  eventoNome,
  dataEvento,
  localEvento,
  identificador,
  qrcodeConteudo,
  fotoUrl,
  cor = "azul",
  participacao,
}: CrachaAtletaProps) {
  const corHex = COR_FAIXA_HEX[cor];
  const nomeLimpo = normalizarNomePessoa(atletaNome);
  const peitoNumero =
    participacao?.peito?.numero != null
      ? String(participacao.peito.numero).padStart(3, "0")
      : null;

  return (
    <div className="relative flex h-[5.5cm] w-[8.5cm] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      {/* Faixa lateral esquerda: cor da categoria (mesma das faixas/dorsal) */}
      <div className="absolute inset-y-0 left-0 w-[0.25cm]" style={{ backgroundColor: corHex }} />

      {/* Faixa superior: marca Longevida + evento */}
      <div className="flex shrink-0 items-center justify-between gap-1 bg-gradient-to-r from-brand-green to-emerald-500 pl-[0.4cm] px-2 py-[0.12cm]">
        <div className="flex min-w-0 items-center gap-1">
          <LogoLongevida className="h-[0.45cm] w-auto" />
          <span className="truncate text-[0.38cm] font-extrabold uppercase tracking-wider text-white">
            Longevida
          </span>
        </div>
        <span className="truncate text-right text-[0.3cm] font-bold uppercase tracking-wide text-white/90">
          {eventoNome}
        </span>
      </div>

      {/* Corpo: foto + dorsal + nome + categoria + percurso */}
      <div className="flex min-h-0 flex-1 items-center gap-2 pl-[0.42cm] px-2 py-[0.1cm]">
        <div
          className="flex h-[2.2cm] w-[2.2cm] shrink-0 items-center justify-center overflow-hidden rounded-lg"
          style={{ backgroundColor: corHex }}
        >
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoUrl}
              alt={atletaNome}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[1cm] font-black leading-none text-white">
              {iniciaisDe(nomeLimpo)}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {peitoNumero && (
            <span
              className="w-fit text-[0.48cm] font-black leading-none tracking-tight"
              style={{ color: corHex }}
            >
              {peitoNumero}
            </span>
          )}
          <p
            className="mt-[0.05cm] truncate text-[0.5cm] font-extrabold leading-tight text-slate-900"
            title={nomeLimpo}
          >
            {nomeLimpo}
          </p>
          <span
            className="mt-[0.08cm] w-fit max-w-full truncate rounded-full px-2 py-[0.04cm] text-[0.28cm] font-bold uppercase tracking-wide text-white"
            style={{ backgroundColor: corHex }}
          >
            {categoriaNome}
          </span>
          {participacao ? (
            <BlocoParticipacao participacao={participacao} compacto className="mt-[0.06cm]" />
          ) : null}
        </div>
      </div>

      {/* Rodapé: QR + identificação */}
      <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 pl-[0.42cm] px-2 py-[0.1cm]">
        {qrcodeConteudo ? (
          <QrCodeImagem
            conteudo={qrcodeConteudo}
            tamanho={76}
            className="shrink-0"
          />
        ) : (
          <div className="h-[2cm] w-[2cm] shrink-0 rounded-md bg-slate-100" />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[0.3cm] font-extrabold uppercase tracking-wide text-slate-900">
            Credencial oficial
          </span>
          <p className="mt-[0.04cm] text-[0.26cm] font-medium text-slate-500">
            {dataEvento}
            {localEvento ? ` · ${localEvento}` : ""}
          </p>
          {identificador ? (
            <span className="mt-[0.04cm] truncate font-mono text-[0.24cm] text-slate-400">
              {identificador}
            </span>
          ) : null}
        </div>
        <LogoLongevida watermark className="h-[0.5cm] w-auto opacity-20" />
      </div>
    </div>
  );
}