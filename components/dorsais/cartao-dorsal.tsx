import { COR_FAIXA_HEX, CorFaixa } from "@/lib/mock/faixas-numeracao-store";
import { QrCodeImagem } from "@/components/qrcode/qr-code-imagem";

type CartaoDorsalProps = {
  numero: number;
  atletaNome: string;
  categoriaNome: string;
  eventoNome: string;
  dataEvento: string; // já formatada
  logoUrl?: string;
  cor: CorFaixa;
  medalhaEntregue: boolean;
  alimentacaoEntregue: boolean;
  kitEntregue: boolean;
  qrcodeConteudo?: string; // identificador do QR da inscrição (lido no leitor)
};

export function CartaoDorsal({
  numero,
  atletaNome,
  categoriaNome,
  eventoNome,
  dataEvento,
  logoUrl,
  cor,
  medalhaEntregue,
  alimentacaoEntregue,
  kitEntregue,
  qrcodeConteudo,
}: CartaoDorsalProps) {
  const corHex = COR_FAIXA_HEX[cor];

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white break-inside-avoid">
      {/* Faixa superior colorida conforme a categoria */}
      <div
        className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-white"
        style={{ backgroundColor: corHex }}
      >
        <span className="min-w-0 truncate">{categoriaNome}</span>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={eventoNome} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[9px] font-bold leading-none">
              {eventoNome.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center px-4 py-5 text-center">
        <span className="text-6xl font-bold leading-none text-slate-900">
          {String(numero).padStart(3, "0")}
        </span>
        <p className="mt-3 text-base font-semibold text-slate-900">{atletaNome}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {eventoNome} · {dataEvento}
        </p>

        <div className="mt-4 flex items-center gap-5 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border ${
                kitEntregue ? "border-brand-green bg-brand-green text-white" : "border-slate-300"
              }`}
            >
              {kitEntregue ? "✓" : ""}
            </span>
            Kit
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border ${
                medalhaEntregue ? "border-brand-green bg-brand-green text-white" : "border-slate-300"
              }`}
            >
              {medalhaEntregue ? "✓" : ""}
            </span>
            Medalha
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border ${
                alimentacaoEntregue
                  ? "border-brand-green bg-brand-green text-white"
                  : "border-slate-300"
              }`}
            >
              {alimentacaoEntregue ? "✓" : ""}
            </span>
            Alimentação
          </span>
        </div>
      </div>

      {qrcodeConteudo ? (
        <div className="flex flex-col items-center border-t border-slate-100 px-4 py-3">
          <QrCodeImagem conteudo={qrcodeConteudo} tamanho={84} />
          <p className="mt-1.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">
            Digitalize para check-in
          </p>
        </div>
      ) : null}
    </div>
  );
}
