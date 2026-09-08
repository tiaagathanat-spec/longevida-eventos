"use client";

// Agrega todos os *Provider temporários (em memória) do sistema em um
// único componente, montado no layout raiz (app/layout.tsx). Isso
// permite que módulos de perfis diferentes (Admin, Organização, Atleta)
// compartilhem os mesmos dados mockados durante a navegação — por
// exemplo, a Organização precisa enxergar as mesmas Provas e Inscrições
// que o Admin cadastrou.
//
// Será removido por completo quando o backend real (Prisma/Supabase)
// entrar — cada módulo passará a buscar seus dados via Server Actions.

import { ReactNode } from "react";
import { SessaoProvider } from "@/lib/mock/sessao";
import { PerfisProvider } from "@/lib/mock/perfis-store";
import { FuncionariosProvider } from "@/lib/mock/funcionarios-store";
import { EventosProvider } from "@/lib/mock/eventos-store";
import { CategoriasProvider } from "@/lib/mock/categorias-store";
import { ModalidadesProvider } from "@/lib/mock/modalidades-store";
import { TiposProvaProvider } from "@/lib/mock/tipos-prova-store";
import { ProvasProvider } from "@/lib/mock/provas-store";
import { InscricoesProvider } from "@/lib/mock/inscricoes-store";
import { AtletasProvider } from "@/lib/mock/atletas-store";
import { ResultadosProvider } from "@/lib/mock/resultados-store";
import { PublicacoesProvider } from "@/lib/mock/publicacoes-store";
import { PagamentosProvider } from "@/lib/mock/pagamentos-store";
import { GaleriaProvider } from "@/lib/mock/galeria-store";
import { RegulamentosProvider } from "@/lib/mock/regulamentos-store";
import { FaixasNumeracaoProvider } from "@/lib/mock/faixas-numeracao-store";
import { DorsaisProvider } from "@/lib/mock/dorsais-store";
import { DorsaisAutoAssign } from "@/lib/mock/dorsais-auto-assign";
import { PatrocinadoresProvider } from "@/lib/mock/patrocinadores-store";
import { QrCodesProvider } from "@/lib/mock/qrcodes-store";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <PatrocinadoresProvider>
            <SessaoProvider>
        <PerfisProvider>
          <FuncionariosProvider>
            <QrCodesProvider>
            <EventosProvider>
              <CategoriasProvider>
                <ModalidadesProvider>
                  <TiposProvaProvider>
                    <ProvasProvider>
                      <InscricoesProvider>
                        <AtletasProvider>
                          <ResultadosProvider>
                            <PublicacoesProvider>
                              <PagamentosProvider>
                                <GaleriaProvider>
                                  <RegulamentosProvider>
                                    <FaixasNumeracaoProvider>
                                      <DorsaisProvider>
                                        <DorsaisAutoAssign />
                                        {children}
                                      </DorsaisProvider>
                                    </FaixasNumeracaoProvider>
                                  </RegulamentosProvider>
                                </GaleriaProvider>
                              </PagamentosProvider>
                            </PublicacoesProvider>
                          </ResultadosProvider>
                        </AtletasProvider>
                      </InscricoesProvider>
                    </ProvasProvider>
                  </TiposProvaProvider>
                </ModalidadesProvider>
              </CategoriasProvider>
            </EventosProvider>
          </QrCodesProvider>
          </FuncionariosProvider>
        </PerfisProvider>
      </SessaoProvider>
    </PatrocinadoresProvider>
  );
}
