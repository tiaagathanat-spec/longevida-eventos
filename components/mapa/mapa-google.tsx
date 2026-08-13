// Mapa do evento embutido via Google Maps (embed sem API key) a partir de
// um endereço/termo de busca. O mesmo endereço também abre no Google Maps
// em nova aba pelo link "Abrir no Google Maps".
export function urlBuscaGoogleMaps(endereco: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
}

export function urlEmbedGoogleMaps(endereco: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(endereco)}&output=embed&hl=pt-BR`;
}

type MapaGoogleProps = {
  endereco: string; // endereço ou termo de busca (enderecoParaMapa do evento)
  titulo?: string;
};

export function MapaGoogle({ endereco, titulo = "Mapa do evento" }: MapaGoogleProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <iframe
        src={urlEmbedGoogleMaps(endereco)}
        title={titulo}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        className="h-64 w-full border-0"
      />
    </div>
  );
}
