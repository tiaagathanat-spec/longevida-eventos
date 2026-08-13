import { COR_FAIXA_HEX, CorFaixa } from "@/lib/mock/faixas-numeracao-store";
import { QrCodeImagem } from "@/components/qrcode/qr-code-imagem";
import { LogoLongevida } from "@/components/brand/logo-longevida";

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

// Credencial oficial do atleta, tamanho físico de 8,5cm x 5,5cm
// (padrão de crachá). Usada no Portal do Atleta para impressão e
// apresentação no check-in do evento.
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
}: CrachaAtletaProps) {
  const corHex = COR_FAIXA_HEX[cor];

  return (
    <div className="relative flex h-[5.5cm] w-[8.5cm] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      {/* Faixa superior: marca Longevida + evento */}
      <div className="flex shrink-0 items-center justify-between gap-1 bg-gradient-to-r from-brand-green to-emerald-500 px-2 py-[0.14cm]">
        <div className="flex min-w-0 items-center gap-1">
          <LogoLongevida className="h-[0.5cm] w-auto" />
          <span className="truncate text-[0.42cm] font-extrabold uppercase tracking-wider text-white">
            Longevida
          </span>
        </div>
        <span className="truncate text-right text-[0.32cm] font-bold uppercase tracking-wide text-white/90">
          {eventoNome}
        </span>
      </div>

      {/* Corpo: foto + dados do atleta */}
      <div className="flex min-h-0 flex-1 items-center gap-2 px-2 py-1">
        <div
          className="flex h-[2.4cm] w-[2.4cm] shrink-0 items-center justify-center overflow-hidden rounded-lg"
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
            <span className="text-[1.15cm] font-black leading-none text-white">
              {iniciaisDe(atletaNome)}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[0.28cm] font-semibold uppercase tracking-widest text-slate-400">
            Atleta
          </span>
          <p className="truncate text-[0.55cm] font-extrabold leading-tight text-slate-900">
            {atletaNome}
          </p>
          <span
            className="mt-[0.12cm] w-fit max-w-full truncate rounded-full px-2 py-[0.05cm] text-[0.3cm] font-bold uppercase tracking-wide text-white"
            style={{ backgroundColor: corHex }}
          >
            {categoriaNome}
          </span>
          <p className="mt-[0.14cm] text-[0.3cm] font-medium text-slate-500">
            {dataEvento}
            {localEvento ? ` · ${localEvento}` : ""}
          </p>
        </div>
      </div>

      {/* Rodapé: QR + identificador da inscrição */}
      <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 px-2 py-[0.12cm]">
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
          <span className="text-[0.32cm] font-extrabold uppercase tracking-wide text-slate-900">
            Credencial oficial
          </span>
          <span className="text-[0.26cm] font-medium text-slate-500">
            Apresente no check-in do evento.
          </span>
          {identificador ? (
            <span className="mt-[0.06cm] truncate font-mono text-[0.24cm] text-slate-400">
              {identificador}
            </span>
          ) : null}
        </div>
        <LogoLongevida watermark className="h-[0.55cm] w-auto opacity-20" />
      </div>
    </div>
  );
}
