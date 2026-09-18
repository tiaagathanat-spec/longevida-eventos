// Utilitário para normalização de nomes de pessoas.
// Converte para MAIÚSCULAS preservando acentos e caracteres especiais do português.

export function normalizarNomePessoa(nome: string): string {
  if (!nome || typeof nome !== "string") return "";
  return nome.trim().toUpperCase().normalize("NFC");
}

/**
 * Aplica normalização a um objeto que contém campos de nome de pessoa.
 * Retorna um novo objeto com os campos normalizados.
 */
export function normalizarNomesPessoa<T extends Record<string, unknown>>(
  obj: T,
  camposNomes: (keyof T)[]
): T {
  const resultado = { ...obj };
  for (const campo of camposNomes) {
    const valor = resultado[campo];
    if (typeof valor === "string" && valor.trim()) {
      resultado[campo] = normalizarNomePessoa(valor) as T[typeof campo];
    }
  }
  return resultado;
}