// Layout do grupo "Área pública".
// Aqui entra a navegação/sidebar específica desse perfil,
// e futuramente a checagem de permissão via middleware/auth.

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
