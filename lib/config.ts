// Configurações globais da organização (Espaço Longevida).
// Em produção, a chave Pix viria das configurações do evento/tenant no
// banco — aqui fica centralizada para o mock usar em todos os lugares.

export const ORGANIZACAO_NOME = "Espaço Longevida";

/** Chave Pix da organização (CNPJ) usada no pagamento das inscrições. */
export const CHAVE_PIX_LONGEVIDA = "39.554.830/0001-04";

/** Formato exibido da chave Pix (CNPJ). */
export const CHAVE_PIX_LONGEVIDA_LABEL = "CNPJ";

/** QR Code PIX da organização, exibido para o atleta escanear no pagamento. */
export const QR_PIX_LONGEVIDA = "/qr-longevida.png";
