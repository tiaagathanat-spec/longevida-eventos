import type { DadosParticipacao } from "@/lib/dorsais/dados-participacao";
import {
  linhaParticipante,
  percursoIndividualTexto,
} from "@/lib/dorsais/dados-participacao";

// Bloco compacto de participação para os cartões impressos (dorsal e
// credencial). Informações complementares (percurso/distância e, em
// duplas/equipes, quem faz cada etapa/função), em tamanho menor que o
// número de peito e o nome principal, porém legíveis e identificáveis.
//
// Provas individuais mostram apenas o percurso; duplas/equipes listam um
// participante por linha ("AYLA: Natação 25 m"). Nenhum texto é cortado
// (usa quebra de linha) para não perder informação na impressão.

type BlocoParticipacaoProps = {
  participacao: DadosParticipacao;
  // Variante compacta (credencial 8,5x5,5cm) em fonte ainda menor.
  compacto?: boolean;
  className?: string;
};

export function BlocoParticipacao({ participacao, compacto = false, className }: BlocoParticipacaoProps) {
  const baseClasse = compacto
    ? "text-[0.22cm] leading-snug"
    : "text-[10px] leading-snug";

  if (participacao.tipo === "individual") {
    return (
      <p
        className={`w-full break-words font-semibold uppercase tracking-wide text-slate-600 ${baseClasse} ${className ?? ""}`}
      >
        Percurso: {percursoIndividualTexto(participacao.participanteUnico)}
      </p>
    );
  }

  return (
    <div className={`w-full ${className ?? ""}`}>
      {participacao.participantes.map((p) => (
        <p
          key={p.posicao}
          className={`w-full break-words font-semibold uppercase leading-snug tracking-wide text-slate-600 ${baseClasse}`}
        >
          {linhaParticipante(p)}
        </p>
      ))}
    </div>
  );
}