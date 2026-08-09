// Logo do Espaço Longevida (arquivo em /public).
// Usado como identificação (canto superior direito) e como marca d'água
// nas telas públicas. `watermark` define alt vazio (decorativo).

type LogoLongevidaProps = {
  className?: string;
  watermark?: boolean;
  title?: string;
};

export function LogoLongevida({ className = "", watermark = false, title }: LogoLongevidaProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-longevida.png"
      alt={watermark ? "" : "Espaço Longevida"}
      title={title}
      aria-hidden={watermark || undefined}
      className={className}
    />
  );
}
