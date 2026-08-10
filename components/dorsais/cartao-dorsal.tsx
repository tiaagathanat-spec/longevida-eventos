import { COR_FAIXA_HEX, CorFaixa } from "@/lib/mock/faixas-numeracao-store";
import { QrCodeImagem } from "@/components/qrcode/qr-code-imagem";
import { LogoLongevida } from "@/components/brand/logo-longevida";

type CartaoDorsalProps = {
  numero: number;
  atletaNome: string;
  categoriaNome: string;
  eventoNome: string;
  dataEvento: string; // já formatada
  capaUrl?: string; // banner/capa do evento anexada na galeria
  logoUrl?: string;
  cor: CorFaixa;
  medalhaEntregue: boolean;
  alimentacaoEntregue: boolean;
  kitEntregue: boolean;
  qrcodeConteudo?: string; // identificador do QR da inscrição (lido no leitor)
};

// Dorsal final em peitoral 19cm x 14,5cm. A cor da categoria ocupa as
// margens laterais; as entregas ficam em marcações verticais discretas na
// margem esquerda; a capa do evento é exibida inteira (sem cortes).
export function CartaoDorsal({
  numero,
  atletaNome,
  categoriaNome,
  eventoNome,
  dataEvento,
  capaUrl,
  logoUrl,
  cor,
  medalhaEntregue,
  alimentacaoEntregue,
  kitEntregue,
  qrcodeConteudo,
}: CartaoDorsalProps) {
  const corHex = COR_FAIXA_HEX[cor];

  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-xl border border-slate-300 bg-white">
      {/* Margem lateral esquerda: cor da categoria + entregas na vertical */}
      <div
        className="flex w-[1.9cm] shrink-0 flex-col items-center justify-center gap-5"
        style={{ backgroundColor: corHex }}
      >
        <MarcadorVertical entregue={kitEntregue} label="Kit" />
        <MarcadorVertical entregue={medalhaEntregue} label="Medalha" />
        <MarcadorVertical entregue={alimentacaoEntregue} label="Alim." />
      </div>

      {/* Área central */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Capa do evento — exibida inteira, sem cortes */}
        <div className="relative h-[3.6cm] shrink-0 overflow-hidden bg-slate-100">
          {capaUrl ? (
            <>
              {/* Fundo desfocado para preencher os lados sem cortar a imagem */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capaUrl}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-sm"
              />
              <div className="relative flex h-full w-full items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capaUrl}
                  alt={eventoNome}
                  className="max-h-full max-w-full object-contain drop-shadow-sm"
                />
              </div>
            </>
          ) : (
            <div
              className="flex h-full w-full items-center justify-center px-4"
              style={{ backgroundColor: corHex }}
            >
              <span className="text-center text-2xl font-extrabold uppercase tracking-wide text-white">
                {eventoNome}
              </span>
            </div>
          )}
          {logoUrl && (
            <div className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-white/80 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={eventoNome} className="h-full w-full object-cover" />
            </div>
          )}
        </div>

        {/* Nome do evento e categoria */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-1.5 text-center">
          <p className="truncate text-base font-extrabold uppercase tracking-wide text-slate-900">
            {eventoNome}
          </p>
          <p className="truncate text-xs font-semibold uppercase tracking-widest text-slate-500">
            {categoriaNome}
          </p>
        </div>

        {/* Número + dados do atleta */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 px-3 text-center">
          <span className="text-[120px] font-black leading-none tracking-tight text-slate-900">
            {String(numero).padStart(3, "0")}
          </span>
          <p className="text-2xl font-bold text-slate-900">{atletaNome}</p>
          <p className="text-sm font-medium text-slate-500">{dataEvento}</p>
        </div>

        {/* QR */}
        {qrcodeConteudo ? (
          <div className="flex shrink-0 flex-col items-center pb-1.5 pt-0.5">
            <QrCodeImagem conteudo={qrcodeConteudo} tamanho={96} />
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Digitalize para check-in
            </p>
          </div>
        ) : null}
      </div>

      {/* Margem lateral direita: cor da categoria */}
      <div className="w-[1.2cm] shrink-0" style={{ backgroundColor: corHex }} />

      {/* Marca d'água Longevida — canto inferior direito */}
      <div className="pointer-events-none absolute bottom-2 right-[1.6cm]">
        <LogoLongevida watermark className="h-9 w-auto opacity-20" />
      </div>
    </div>
  );
}

// Marcação de entrega na vertical: quando entregue, fica preenchida e com
// "✓"; quando pendente, aparece discreta (contorno + fundo escuro suave).
function MarcadorVertical({ entregue, label }: { entregue: boolean; label: string }) {
  return (
    <div
      className={`-rotate-90 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
        entregue
          ? "bg-white text-brand-green shadow-sm"
          : "border border-white/50 bg-black/25 text-white"
      }`}
    >
      {entregue ? "✓ " : ""}
      {label}
    </div>
  );
}
