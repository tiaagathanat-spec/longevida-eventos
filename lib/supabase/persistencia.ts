"use client";

// Camada de persistência real das stores mockadas (lib/mock/*-store.tsx).
//
// As tabelas-espelho (`app_*`) são criadas pela migration
// supabase/migrations/0005_persistencia_app.sql. Elas reproduzem o
// formato dos dados usados pelas telas, com a coluna id TEXT para
// manter compatibilidade com os dados de demonstração existentes.
//
// Como as tabelas usam snake_case e as telas camelCase, esta camada
// converte automaticamente nas duas direções.

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  enfileirarFila,
  notificarMudancaFila,
  obterPendentesFila,
  removerDaFila,
  totalPendentesFila,
} from "@/lib/supabase/fila-offline";

export type Linha = Record<string, unknown>;

export function snakeParaCamel(linha: Linha): Linha {
  const saida: Linha = {};
  for (const [chave, valor] of Object.entries(linha)) {
    const camel = chave.replace(/_([a-z0-9])/g, (_, letra: string) =>
      letra.toUpperCase()
    );
    saida[camel] = valor;
  }
  return saida;
}

export function camelParaSnake(linha: Linha): Linha {
  const saida: Linha = {};
  for (const [chave, valor] of Object.entries(linha)) {
    const snake = chave.replace(/[A-Z0-9]/g, (letra) => `_${letra.toLowerCase()}`);
    saida[snake] = valor;
  }
  return saida;
}

// Detecta falha de REDE (conexão instável, servidor inacessível), que o
// supabase-js pode entregar como EXCEÇÃO ("TypeError: Failed to fetch") ou
// como objeto de `error` com a mesma mensagem. Diferencia de erros de
// servidor (403/401/422…), que têm `code` e resposta HTTP. Uma queda de
// rede é transitória: o dado deve ir para a fila offline e a operação ser
// repetida, nunca mostrar um erro cru ao usuário.
export function ehErroSemRecursos(erro: unknown): boolean {
  const mensagem =
    erro instanceof Error
      ? erro.message
      : String((erro as { message?: unknown })?.message ?? "");
  // Escassez de recursos do NAVEGADOR (limite de conexões por host, abas,
  // memória — net::ERR_INSUFFICIENT_RESOURCES) ou rejeição por pressão do
  // servidor (429 too many requests). NÃO é uma falha de rede transitória:
  // na maioria das vezes é o PRÓPRIO RETRY que provoca a pressão. Re-tentar
  // em rajada só piora; o dado não deve ser enfileirado nem repetido em
  // loop — exponha o aviso e aguarde a recarga.
  return /ERR_INSUFFICIENT_RESOURCES|insufficient resource|too many requests/i.test(
    mensagem
  );
}

export function ehErroDeRede(erro: unknown): boolean {
  if (ehErroSemRecursos(erro)) return false;
  const mensagem =
    erro instanceof Error
      ? erro.message
      : String((erro as { message?: unknown })?.message ?? "");
  return /failed to fetch|fetch failed|networkerror|econnreset|enotfound|etimedout|load failed|server error|ERR_/i.test(
    mensagem
  );
}

// Omite campos `undefined` em vez de transformá-los em `null`: as
// tabelas-espelho usam `not null default ''`, e enviar `null` explícito
// viola a restrição (erro 400). Ao omitir a chave, o PostgREST aplica o
// default na criação e preserva o valor existente na edição (merge).
export function limparJson<T>(valor: T): T {
  return JSON.parse(
    JSON.stringify(valor, (_chave, item) => (item === undefined ? undefined : item))
  ) as T;
}

// Aguarda o cliente de navegador restaurar a sessão do cookie antes de
// qualquer consulta. O Supabase restaura a sessão de forma ASSÍNCRONA na
// montagem: sem esta espera, o primeiro SELECT dispara ainda sem token e
// roda como anônimo. Para as tabelas com RLS isso é erro de permissão, o
// `carregar` retorna `null` e as telas mostram o seed em memória — é o
// comportamento de "dados salvos somem ao recarregar a página".
//
// OBSERVAÇÃO: a espera precisa ser feita no MESMO client que executa a
// consulta (é por isso que `carregar` chama `getSession()` no `supabase`
// que já criou, e não num helper separado).
//
// `getSession()` é local (lê o cookie, sem ida ao servidor de auth): o
// middleware já renova a sessão a cada request, então o cookie está válido
// no momento do carregamento.

// Carrega todas as linhas de uma tabela. Retorna `null` quando a tabela
// não existe ou a consulta falhou (o chamador mantém o seed em memória).
//
// O token de acesso do cookie pode estar expirado (sessões duram ~1h). O
// middleware renova o token a cada request, mas em um reload/primeiro
// render o cliente pode disparar a consulta com um token vencido → 401/403,
// o que fazia o `carregar` retornar `null` intermitentemente e as telas
// mostrarem o seed demo como se fosse dado real ("eventos testes voltam ao
// recarregar"). Aqui, em erro de autenticação, renova a sessão e tenta UMA
// vez mais antes de desistir.
export async function carregar<T>(
  tabela: string,
  ordem?: string
): Promise<T[] | null> {
  async function consultar() {
    const supabase = createClient();
    await supabase.auth.getSession();
    let query = supabase.from(tabela).select("*");
    if (ordem) query = query.order(ordem);
    return query;
  }
  // Uma tentativa: consulta + tratamento de sessão vencida. Retorna:
  //   * T[]        → sucesso (possivelmente vazio);
  //   * [] também   → tabela inexistente/sem permissão (indefinido);
  //   * null       → falha (sem conexão ou outro erro).
  async function tentar(): Promise<T[] | null> {
    let supabase = await consultar();
    let { data, error } = await supabase;
    // Sessão vencida: renova o token e repete a consulta uma vez.
    if (error && (error.code === "401" || error.code === "403" || error.code === "PGRST301")) {
      const renovado = createClient();
      await renovado.auth.refreshSession();
      let query = renovado.from(tabela).select("*");
      if (ordem) query = query.order(ordem);
      const resultado = await query;
      data = resultado.data;
      error = resultado.error;
    }
    // Tabela não existe ou sem permissão: retorna array vazio sem erro.
    if (error && (error.code === "42P01" || error.code === "42501")) return [] as T[];
    if (error) return null;
    return ((data ?? []).map((l) => snakeParaCamel(l as Linha)) as T[]);
  }
  try {
    const resultado = await tentar();
    if (resultado !== null) return resultado;
  } catch (err) {
    if (!ehErroDeRede(err)) return null;
  }
  // Falha de rede (breve queda de conexão): espera um instante e tenta de
  // novo uma vez antes de desistir — a maioria das quedas de navegador é
  // momentânea e o retry evita a tela "não foi possível carregar".
  // Gate global anti-rajada: sem ele, os ~17 stores do layout tentariam o
  // retry ao MESMO tempo logo após uma queda, estourando o limite de
  // conexões do navegador (net::ERR_INSUFFICIENT_RESOURCES).
  if (!rotinaAutomaticaPodeRodar(1500)) return null;
  await new Promise((resolver) => setTimeout(resolver, 800));
  try {
    return await tentar();
  } catch {
    return null;
  }
}

// Consulta pontual a uma tabela por coluna exata, convertendo o resultado
// para camelCase. Usado por fluxos que precisam confirmar diretamente no
// banco (ex.: leitor de QR) sem depender do estado em memória ainda
// carregado. Respeita RLS — se a linha estiver fora do escopo do usuário,
// retorna null, nunca dado falsificado.
export async function buscarLinhas<T>(
  tabela: string,
  coluna: string,
  valor: string
): Promise<T[] | null> {
  try {
    const supabase = createClient();
    await supabase.auth.getSession();
    let query = supabase.from(tabela).select("*");
    if (coluna && valor) query = query.eq(coluna, valor);
    const { data, error } = await query;
    if (error) return null;
    return ((data ?? []).map((l) => snakeParaCamel(l as Linha)) as T[]);
  } catch {
    return null;
  }
}

// Grava as linhas na tabela, uma por uma, e retorna `{ ok, motivo }`. O
// upsert individual é necessário porque o PostgREST exige que todas as
// linhas de um array tenham as mesmas chaves: linhas recém-criadas nas
// telas têm menos campos que as carregadas do banco, e o array misto
// fazia o PostgREST preencher as chaves ausentes com NULL, violando
// colunas `not null default ''` (erro 400). No upsert individual, campos
// ausentes usam o default na criação e são preservados na edição (merge).
//
// O motivo NUNCA é omitido num erro: `usePersistencia` o repassa para a
// tela (campo `erro`), para que um cadastro que não foi persistido nunca
// "aparente salvar".
//
// SEGURANÇA (RLS por organização/evento):
//   * Array vazio NÃO apaga a tabela. Remoções são responsabilidade do
//     diff de ids em `usePersistencia`; um array vazio aqui jamais
//     autoriza operação destrutiva.
//   * Erro de permissão (42501) = linha fora do escopo do usuário: a
//     linha é PULADA e a gravação continua (o usuário só persiste o que
//     realmente pode alterar), mas o retorno vira `{ ok: false }` — o
//     bloqueio RLS nunca é tratado como sucesso e a base de sincronização
//     não avança (a linha não persistida é reenviada na próxima mudança).
//   * Demais erros (constraint etc.) abortam a gravação e retornam
//     `{ ok: false, motivo }`, como antes.
//   * Erro 42P01 (tabela ainda não criada) continua sendo ignorado.
export type ResultadoGravarLinhas = {
  ok: boolean;
  // Descrição amigável do motivo da falha (permissão, constraint, rede).
  motivo?: string;
  // Indica que a falha é TRANSITÓRIA (rede) e vale re-tentar
  // automaticamente. Erros permanentes (constraint, permissão) não são
  // re-tentados: re-tentá-los para sempre não muda o resultado.
  retentavel?: boolean;
};

export async function gravarLinhas<T>(
  tabela: string,
  linhas: T[],
  chaveColuna: string = "id"
): Promise<ResultadoGravarLinhas> {
  try {
    const supabase = createClient();
    if (linhas.length === 0) {
      return { ok: true };
    }
    // Garante que a sessão está válida antes de gravar (refresh se expirado)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        // Refresh falhando por REDE não é "sessão expirada": é a conexão que
        // voltou a faltar. Enfileira e trata como falha transitória; o
        // retry automático recupera quando a conexão voltar. Só refresh
        // inválido de verdade (token/sessão expirado) pede novo login.
        if (ehErroDeRede(refreshError)) {
          if (ehErroSemRecursos(refreshError)) {
            return {
              ok: false,
              retentavel: false,
              motivo: `Muitas solicitações abertas ao salvar em ${tabela} (o navegador esgotou recursos). Recarregue a página.`,
            };
          }
          for (const linha of linhas) {
            enfileirarFila(tabela, camelParaSnake(limparJson(linha as Linha)));
          }
          notificarMudancaFila();
          return {
            ok: false,
            retentavel: true,
            motivo: `Sem conexão com o servidor ao salvar em ${tabela}. Suas alterações foram guardadas para sincronizar.`,
          };
        }
        return {
          ok: false,
          motivo: `Sessão expirada. Faça login novamente.`,
        };
      }
    }
    let bloqueioRls = false;
    let redeFalhou = false;
    for (const linha of linhas) {
      const { error } = await supabase
        .from(tabela)
        .upsert(limparJson(camelParaSnake(linha as Linha)));
      if (error && error.code !== "42P01") {
        if (error.code === "42501") {
          console.warn(
            `[persistencia] linha fora do escopo, ignorada em ${tabela}:`,
            error.message
          );
          bloqueioRls = true;
          continue;
        }
        // Falha de REDE retornada como objeto de erro (o supabase-js pode
        // devolvê-la em vez de lançar): guarda na fila offline em vez de
        // abortar com mensagem crua — é a mesma garantia do bloco catch.
        if (ehErroDeRede(error)) {
          if (ehErroSemRecursos(error)) {
            console.warn(
              `[persistencia] recursos esgotados ao gravar ${tabela}:`,
              error.message
            );
            return {
              ok: false,
              retentavel: false,
              motivo: `Muitas solicitações abertas ao salvar em ${tabela} (o navegador esgotou recursos). Recarregue a página.`,
            };
          }
          console.warn(`[persistencia] sem conexão ao gravar ${tabela}:`, error.message);
          enfileirarFila(tabela, camelParaSnake(limparJson(linha as Linha)));
          redeFalhou = true;
          continue;
        }
        // Conflito de unicidade (chave duplicada): erro PERMANENTE. Não é
        // re-tentado e é exposto numa mensagem legível pelo usuário.
        if (error.code === "23505") {
          const motivoChave = error.message.includes("prova_numero")
            ? "Já existe um dorsal com esse número para esta prova."
            : "Registro duplicado: o item já existe com os mesmos dados.";
          console.warn(`[persistencia] duplicado em ${tabela}:`, error.message);
          return {
            ok: false,
            motivo: `Não foi possível salvar em ${tabela}: ${motivoChave}`,
          };
        }
        console.warn(`[persistencia] gravar ${tabela}:`, error.message);
        return {
          ok: false,
          motivo: `Não foi possível salvar em ${tabela}: ${error.message}`,
        };
      }
    }
    if (redeFalhou) {
      notificarMudancaFila();
      return {
        ok: false,
        retentavel: true,
        motivo: `Sem conexão com o servidor ao salvar em ${tabela}. Suas alterações foram guardadas para sincronizar.`,
      };
    }
    return bloqueioRls
      ? {
          ok: false,
          motivo: `Permissão negada ao salvar em ${tabela}. Entre com um perfil com acesso a este módulo.`,
        }
      : { ok: true };
  } catch (err) {
    console.warn(`[persistencia] falha ao gravar ${tabela}:`, err);
    if (ehErroSemRecursos(err)) {
      return {
        ok: false,
        retentavel: false,
        motivo: `Muitas solicitações abertas ao salvar em ${tabela} (o navegador esgotou recursos). Recarregue a página.`,
      };
    }
    // Falha de rede (a chamada lançou): guarda as linhas na fila offline
    // para reconciliar quando a conexão voltar. O upsert é idempotente,
    // então repetir não duplica. Erros de permissão/dados não caem aqui
    // (são resposta do servidor, não exceção de rede).
    for (const linha of linhas) {
      enfileirarFila(tabela, camelParaSnake(limparJson(linha as Linha)));
    }
    notificarMudancaFila();
    return {
      ok: false,
      retentavel: true,
      motivo: `Sem conexão com o servidor ao salvar em ${tabela}. Suas alterações foram guardadas para sincronizar.`,
    };
  }
}

// Ponto único de contenção do retry AUTOMÁTICO. Cada store do layout raiz
// (~17) monta seu próprio intervalo de 15s; sem este gate, uma queda de
// rede dispararia dezenas de tentativas simultâneas a cada ciclo — o
// navegador estoura o limite de conexões por host
// (net::ERR_INSUFFICIENT_RESOURCES) e o processo vira um loop que se
// retroalimenta. Com o gate, no máximo UMA rotina global avança por janela.
let ultimaRotinaAutomatica = 0;
export function rotinaAutomaticaPodeRodar(janelaMs = 10000): boolean {
  const agora = Date.now();
  if (agora - ultimaRotinaAutomatica < janelaMs) return false;
  ultimaRotinaAutomatica = agora;
  return true;
}

// Reconcilia a fila offline: tenta reenviar cada item pendente e remove
// os que foram persistidos (ou que nunca poderão ser — tabela inexistente
// no ambiente). Bloqueios de permissão (RLS) mantêm o item na fila: o
// bloqueio nunca é tratado como sucesso e o dado não é perdido.
//
// Com guarda de reentrância: a rotina é chamada de vários pontos (montagem
// de cada store, evento `online`, intervalo periódico e botão manual), e a
// guarda evita correr a fila em paralelo e duplicar upserts concorrentes.
let filaSendoProcessada = false;
export async function processarFilaOffline(): Promise<void> {
  if (filaSendoProcessada) return;
  const pendentes = obterPendentesFila();
  if (pendentes.length === 0) return;
  filaSendoProcessada = true;
  try {
    const supabase = createClient();
    await supabase.auth.getSession();
    for (const item of pendentes) {
      try {
        const { error } = await supabase.from(item.tabela).upsert(item.linha);
        if (!error || error.code === "42P01") {
          removerDaFila(item.tabela, item.linha.id);
          continue;
        }
        if (ehErroSemRecursos(error)) {
          // Escassez de recursos navegador/servidor: NÃO é permanente (o
          // dado ainda pode sincronizar numa janela com recursos livres) e
          // não deve ser descartado. Mantém na fila; o retry global
          // (rárico) tenta de novo mais tarde.
          console.warn(
            `[persistencia] recursos esgotados ao sincronizar (${item.tabela}):`,
            error.message
          );
          continue;
        }
        if (!ehErroDeRede(error)) {
          // Erro PERMANENTE (constraint, permissão, sessão inválida):
          // re-tentar para sempre é inútil e gera ruído. Remove da fila e
          // registra; a sincronização ativa já expõe o motivo na tela.
          console.warn(
            `[persistencia] item não sincronizável, removido da fila (${item.tabela}):`,
            error.message
          );
          removerDaFila(item.tabela, item.linha.id);
        }
        // Erros de rede: mantém na fila para a próxima tentativa.
      } catch (erroInterno) {
        // Rede indisponível ou escassez de recursos: mantém na fila.
        if (ehErroSemRecursos(erroInterno)) {
          console.warn(
            `[persistencia] recursos esgotados ao sincronizar (${item.tabela}):`,
            erroInterno instanceof Error
              ? erroInterno.message
              : String(erroInterno)
          );
        }
      }
    }
  } finally {
    filaSendoProcessada = false;
    notificarMudancaFila();
  }
}

// Reação imediata do usuário ("Tentar novamente"): força uma passada na
// fila offline agora. Os stores também re-tentam a sincronização atual
// periodicamente (ver `usePersistencia`), então este botão apenas acelera.
export async function tentarReconciliarAgora(): Promise<void> {
  await processarFilaOffline();
}

type OpcoesPersistencia<T> = {
  // Coluna de ordenação da carga (snake_case). Opcional.
  ordem?: string;
  // Campo de identidade no objeto da tela (default: "id").
  idCampo?: keyof T;
  // Coluna de identidade no banco em snake_case (default: "id").
  idColuna?: string;
};

// Hook de persistência para substituir `useState` nas stores.
//
// Retorna a mesma interface de `useState` (`dados`/`setDados`), o flag
// `pronto` (carga inicial concluída) e `erro` (motivo da última
// sincronização falha, ou null). Na montagem carrega as linhas do banco;
// a partir daí, cada alteração em `dados` é sincronizada: linhas
// removidas são apagadas do banco e as demais são feitas upsert. Uma
// falha de gravação (permissão RLS, constraint ou rede) nunca é tratada
// como sucesso: o dado fica apenas em memória e o motivo é exposto em
// `erro` para a tela não "aparentar salvar".
export function usePersistencia<T>(
  tabela: string,
  estadoInicial: T[],
  opcoes: OpcoesPersistencia<T> = {}
) {
  const { ordem, idCampo = "id" as keyof T, idColuna = "id" } = opcoes;
  const [dados, setDados] = useState<T[]>(estadoInicial);
  const [pronto, setPronto] = useState(false);
  // Erro da última sincronização. Nunca é ocultado: se um cadastro/edição
  // não foi persistido (RLS, constraint ou rede), a tela precisa saber para
  // não "aparentar salvar". Limpa na próxima sincronização bem-sucedida.
  const [erro, setErro] = useState<string | null>(null);
  const prontoRef = useRef(false);
  const ultimoSincronizadoRef = useRef<T[]>(estadoInicial);
  const usuarioEditouRef = useRef(false);

  // Marca que o usuário já alterou dados antes de a carga terminar, para
  // a carga não sobrescrever essas edições (as mudanças são sincronizadas
  // logo em seguida pela lógica de persistência).
  const setDadosComControle = useCallback(
    (atualizacao: T[] | ((anterior: T[]) => T[])) => {
      usuarioEditouRef.current = true;
      setDados(atualizacao);
    },
    []
  );

  useEffect(() => {
    let ativo = true;
    carregar<T>(tabela, ordem)
      .then((linhas) => {
        if (!ativo) return;
        if (linhas === null) {
          // Falha ao carregar. Se há sessão, expõe o motivo (os dados
          // reais não chegaram) em vez de mostrar o seed silenciosamente —
          // que parece um "reset" das informações. Nesse caso o seed (dados
          // de demonstração dos primeiros rascunhos) também NÃO é exibido
          // como se fosse dado real: ele não existe no banco, não pode ser
          // excluído de verdade e voltaria a cada recarga. A tela mostra o
          // estado vazio + o motivo, e uma nova recarga busca o real.
          // Sem sessão (páginas públicas) o seed é o comportamento esperado.
          createClient()
            .auth.getSession()
            .then(({ data: sessao }) => {
              if (ativo && sessao.session) {
                setErro(
                  `Não foi possível carregar os dados de ${tabela} (sem conexão ou sem permissão). Recarregue a página.`
                );
                // Zera os dados exibidos e a base de sincronização (mesma
                // referência, para o efeito de persistência não disparar):
                // evita que o seed demo apareça como real e que uma edição
                // seguinte tente re-gravar essas linhas inexistentes.
                const vazio: T[] = [];
                ultimoSincronizadoRef.current = vazio;
                setDados(vazio);
              }
            });
          return;
        }
        if (usuarioEditouRef.current) return;
        ultimoSincronizadoRef.current = linhas;
        setDados(linhas);
      })
      .catch(() => {})
      .finally(() => {
        if (ativo) {
          prontoRef.current = true;
          setPronto(true);
        }
      });
    // Reconcilia pendências de sessões offline anteriores (falha de rede
    // gravada na fila local) e volta a reconciliar quando o navegador
    // restabelecer a conexão.
    processarFilaOffline();
    const aoFicarOnline = () => processarFilaOffline();
    window.addEventListener("online", aoFicarOnline);
    return () => {
      ativo = false;
      window.removeEventListener("online", aoFicarOnline);
    };
  }, [tabela, ordem]);

  // Sincroniza as mudanças de `dados` com o banco. Só avança a linha de
  // base (`ultimoSincronizadoRef`) quando a gravação teve sucesso: assim,
  // uma falha não "esconde" dados não persistidos (que seriam perdidos ao
  // recarregar a página) e a próxima mudança tenta sincronizar de novo.
  //
  // Extraída para `useCallback` para poder ser re-disparada sem depender
  // de uma mudança de estado: o intervalo periódico abaixo re-chama este
  // fluxo enquanto houver erro pendente, então uma queda de rede curta se
  // resolve sozinha e os dados (e a fila offline) são salvos automaticamente.
  const sincronizar = useCallback(() => {
    if (!prontoRef.current) return;
    const anterior = ultimoSincronizadoRef.current;
    if (anterior === dados) return;

    const chave = idCampo as string;
    const chaveAntes = new Set(anterior.map((x) => (x as Linha)[chave] as string));
    const chaveDepois = new Set(dados.map((x) => (x as Linha)[chave] as string));
    const removidos = [...chaveAntes].filter((id) => !chaveDepois.has(id));

    const remocao =
      removidos.length > 0
        ? createClient().from(tabela).delete().in(idColuna, removidos)
        : Promise.resolve({ error: null });

    Promise.all([remocao, gravarLinhas<T>(tabela, dados, idColuna)]).then(
      ([{ error: erroRemocao }, resultado]) => {
        const falhouRemocao = !!erroRemocao && erroRemocao.code !== "42P01";
        if (falhouRemocao) {
          console.warn(`[persistencia] remover ${tabela}:`, erroRemocao.message);
        }
        if (resultado.ok && !falhouRemocao) {
          ultimoSincronizadoRef.current = dados;
          setErro(null);
          erroRetentavelRef.current = false;
          // Drena a fila offline logo após um sucesso: reduziu o tráfego ou
          // a conexão voltou, então sincroniza qualquer linha enfileirada.
          processarFilaOffline();
          return;
        }
        // Sincronização não completou: deixa a base de sincronização onde
        // está (a próxima mudança tenta de novo) e EXPÕE o motivo na tela.
        // Só falhas TRANSITÓRIAS (rede) são re-tentadas automaticamente;
        // erros permanentes (duplicado, permissão) param de bater no banco.
        erroRetentavelRef.current = falhouRemocao ? false : !!resultado.retentavel;
        setErro(
          falhouRemocao
            ? `Não foi possível excluir dados em ${tabela}: ${erroRemocao.message}`
            : resultado.motivo ?? `Não foi possível salvar os dados em ${tabela}.`
        );
      }
    );
  }, [tabela, dados, idCampo, idColuna, pronto]);

  useEffect(() => {
    sincronizar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabela, dados, idCampo, idColuna, pronto]);

  // Referências sempre atuais para o intervalo de recuperação: sem ficar
  // preso a uma closure velha de `sincronizar`/característica do erro.
  const sincronizarRef = useRef<() => void>(() => {});
  sincronizarRef.current = sincronizar;
  const erroRetentavelRef = useRef(false);

  // Recuperação automática: enquanto houver itens na fila offline, ou um
  // erro TRANSITÓRIO de sincronização pendente, tenta de novo a cada 15s —
  // quedas de rede breves se resolvem sem precisar recarregar a página, e
  // o que foi enfileirado é enviado assim que a conexão estabiliza. Erros
  // permanentes não entram aqui (são resolvidos pela próxima edição).
  useEffect(() => {
    const requisicao = setInterval(() => {
      // Gate global: os ~17 stores montam intervalos próprios; sem ele
      // uma queda de rede dispararia dezenas de tentativas simultâneas a
      // cada 15s — o navegador estoura o limite de conexões
      // (net::ERR_INSUFFICIENT_RESOURCES) e o app entra em loop.
      if (!rotinaAutomaticaPodeRodar()) return;
      if (totalPendentesFila() > 0) {
        processarFilaOffline();
      }
      if (erroRetentavelRef.current && prontoRef.current) {
        sincronizarRef.current();
      }
    }, 15000);
    return () => clearInterval(requisicao);
  }, []);

  return { dados, setDados: setDadosComControle, pronto, erro };
}
