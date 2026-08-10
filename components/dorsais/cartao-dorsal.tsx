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
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-300 bg-white">
      {/* Faixa superior colorida conforme a categoria */}
      <div
        className="flex shrink-0 items-center justify-between gap-3 px-6 py-3 text-white"
        style={{ backgroundColor: corHex, minHeight: "2.6cm" }}
      >
        <span className="min-w-0 truncate text-xl font-extrabold uppercase leading-tight tracking-wide">
          {categoriaNome}
        </span>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={eventoNome} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold leading-none">
              {eventoNome.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Número + dados do atleta */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 px-6 text-center">
        <span className="text-[130px] font-black leading-none tracking-tight text-slate-900">
          {String(numero).padStart(3, "0")}
        </span>
        <p className="text-2xl font-bold text-slate-900">{atletaNome}</p>
        <p className="text-base font-medium text-slate-600">
          {eventoNome} · {dataEvento}
        </p>
      </div>

      {/* Marcadores de entrega */}
      <div className="flex shrink-0 items-center justify-center gap-8 border-t border-slate-200 px-6 py-3 text-lg text-slate-700">
        <span className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded border ${
              kitEntregue ? "border-brand-green bg-brand-green text-white" : "border-slate-300"
            }`}
          >
            {kitEntregue ? "✓" : ""}
          </span>
          Kit
        </span>
        <span className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded border ${
              medalhaEntregue ? "border-brand-green bg-brand-green text-white" : "border-slate-300"
            }`}
          >
            {medalhaEntregue ? "✓" : ""}
          </span>
          Medalha
        </span>
        <span className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded border ${
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

      {qrcodeConteudo ? (
        <div className="flex shrink-0 flex-col items-center border-t border-slate-100 px-6 py-2.5">
          <QrCodeImagem conteudo={qrcodeConteudo} tamanho={110} />
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Digitalize para check-in
          </p>
        </div>
      ) : null}
    </div>
  );
}
