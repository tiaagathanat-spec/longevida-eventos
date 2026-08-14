# Checklist de teste de aceite em produção

Roteiro manual para validar a aplicação **no ambiente real** antes de liberar para os
usuários. Cada item marca o que fazer e qual o resultado esperado. Marque os itens à
medida que forem passando. Qualquer divergência do esperado é um bug a reportar.

---

## 0. Pré-requisitos

- [ ] `main` atualizado: `git fetch origin && git log origin/main..HEAD` vazio.
- [ ] Deploy do GitHub Actions concluído (último commit "test: cobertura unitaria..." aplicado).
- [ ] Variáveis de ambiente corretas no provedor de deploy (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, etc.).
- [ ] Estrutura/colunas do banco conferidas (as alterações de persistência não exigem nova migração, mas confirmar o dump de segurança antes).
- [ ] Testar em aba anônima / dispositivo diferente do usado para desenvolver.

---

## 1. Acesso público (sem login)

| # | Rota / ação | Esperado |
|---|-------------|----------|
| 1.1 | `/` | Landing page carrega, sem erro. |
| 1.2 | Lista de eventos pública (`/eventos`) | Eventos visíveis com os dados corretos. |
| 1.3 | Detalhe do evento (`/eventos/[id]`) | Endereço completo (rua/qd/lote/CEP/setor/cidade/UF), mapa do Google Maps renderiza, percurso e horários corretos. |
| 1.4 | Provas no detalhe do evento | Seção "Provas" lista as provas com modalidade, categoria, tipo, horário, valor e situação. |
| 1.5 | Categorias e modalidades no detalhe | Seções exibem categorias (com faixa etária) e modalidades (com distância) derivadas das provas. |
| 1.6 | Patrocinadores no detalhe | Seção "Patrocinadores e apoiadores" mostra os vinculados ao evento com cota. |
| 1.7 | Contagem de inscritos no evento público | Número exibido confere com a base (via RPC `app_inscritos_publicos`). |
| 1.8 | Galeria pública (`/galeria/[id]`) | Fotos e vídeos públicos aparecem; link "entrar para ver mais" leva ao login. |
| 1.9 | Vídeos do percurso na página do evento (`/eventos/[id]`) | Seção "Percurso da prova" exibe vídeos públicos (categoria percurso) com player funcional. |
| 1.10 | Tentar acessar `/admin`, `/organizacao` ou `/portal` deslogado | Redireciona para `/login?redirect=...` e, após login, volta para a rota original. |

---

## 2. Autenticação (Supabase Auth)

| # | Ação | Esperado |
|---|------|----------|
| 2.1 | Cadastro (`/cadastro`) | Cria conta + atleta vinculado; confirmação de e-mail (se habilitada) chega e funciona. |
| 2.2 | Login (`/login`) | Entra; link "esqueci a senha" envia e-mail. |
| 2.3 | Recuperar senha (`/recuperar-senha` → link) | Redefinição funciona e a nova senha passa pelas mesmas regras. |
| 2.4 | Atualizar senha logado (`/atualizar-senha`) | Troca aplicada e próxima sessão usa a nova senha. |
| 2.5 | Senha fraca (ex.: `123456`) | Bloqueada com mensagem clara em todas as telas de senha. |

---

## 3. Papéis e permissões

| # | Ação | Esperado |
|---|------|----------|
| 3.1 | Usuário **Admin** | Acessa `/admin/**` normalmente. |
| 3.2 | Usuário **Organização** | Acessa `/organizacao/**`; tentar `/admin/**` é bloqueado. |
| 3.3 | Usuário **Atleta** | Acessa `/portal/**`; tentar `/admin/**` e `/organizacao/**` é bloqueado. |
| 3.4 | Gerenciar usuários (`/admin/configuracoes/usuarios`) | Definir/alterar papel reflete no acesso imediatamente. |

---

## 4. Admin — eventos e prova

| # | Rota / ação | Esperado |
|---|-------------|----------|
| 4.1 | Criar evento (`/admin/eventos/novo`) | Salva com endereço estruturado e mapa correto. |
| 4.2 | Editar evento (`/admin/eventos/[id]/editar`) | Alterações refletem no público e no portal. |
| 4.3 | Configurações (`/admin/eventos/[id]/configuracoes`) | Data, horários, local, percurso e configurações persistidos. |
| 4.4 | Modalidades e tipos de prova (`/modalidades`, `/tipos-prova`) | Listas de referência corretas. |
| 4.5 | Categorias do evento (`/admin/eventos/[id]/categorias`) | Criar/editar categorias (por idade/sexo) sem erro. |
| 4.6 | Provas (`/admin/eventos/[id]/provas`) | Criar prova definindo **tipo de identificação (dorsal ou card)** e situação inicial "não iniciada". |
| 4.7 | Regulamento (`/admin/eventos/[id]/regulamento`) | Salvar e visualizar. |
| 4.8 | Dorsais/cards (`/admin/eventos/[id]/dorsais` e `/cards`) | Numeração por faixas etárias aplicada; impressão em lote (`/dorsais/imprimir`) abre as fichas 8,5×5,5 cm formatadas. |
| 4.9 | Classificação automática (`/classificacao-automatica`) | Gera grupos por categoria/idade/sexo e resultados prévios. |

---

## 5. Admin — inscrições, resultados e financeiro

| # | Rota / ação | Esperado |
|---|-------------|----------|
| 5.1 | Inscrições (`/admin/inscricoes`) | Lista, filtrar e alterar status sem erro. |
| 5.2 | Resultados (`/admin/resultados`) | **Antes** de encerrar a prova: blocos por grupo presentes, mas resultado não é publicado. |
| 5.3 | Publicar resultados (`/admin/publicacao-resultados`) | Prova **não encerrada**: publicação/homologação bloqueada com mensagem clara. |
| 5.4 | Encerrar prova → publicar | Após encerrar e publicar, resultados ficam visíveis no portal e relatórios com colocação dentro do grupo. |
| 5.5 | Relatórios (`/admin/eventos/[id]/relatorios`) | Relatórios de prova geram com colocação por grupo. |
| 5.6 | Financeiro (`/admin/financeiro/pagamentos`) | Pagamentos listados/confirmados. |
| 5.7 | Financeiro — relatórios (`/financeiro/relatorios`) | Gráficos (recharts) renderizam sem erro. |
| 5.8 | Galeria (`/admin/eventos/[id]/galeria`) | Upload de fotos e vídeos (MP4/WebM/OGG) com categoria e visibilidade; vídeos aparecem na galeria pública e os da categoria "percurso" na seção "Percurso da prova" do evento. |

---

## 6. Organização — operação da prova

| # | Rota / ação | Esperado |
|---|-------------|----------|
| 6.1 | Dashboard (`/organizacao/dashboard`) | Indicadores corretos. |
| 6.2 | Inscritos (`/organizacao/eventos/[id]/inscritos`) | Lista real de inscritos com check-in, kit, medalha e alimentação (auditados por quem/quando). |
| 6.3 | Kits (`/organizacao/eventos/[id]/kits`) | Entrega de kit registrada. |
| 6.4 | Leitor QR (`/leitor-qr`) | Câmera abre; QR do atleta identifica e registra. |
| 6.5 | Cronometragem manual (`/organizacao/cronometragem`) | Modo manual continua intacto (captura por nome/numero). |
| 6.6 | Cronometragem oficial | Cronômetro contínuo, captura em 1 clique, identificação por nome/número/QR, auditoria do cronometrista, **desfazer** e histórico. |
| 6.7 | **Offline** — derrubar a internet no meio da prova | Marcação não some; banner "aguardando sincronização" aparece; ao reconectar, "Sincronizar agora" envia e os totais sobem sem duplicar. |
| 6.8 | **Offline** — recarregar a página com pendências | A fila local é reconhecida ao reabrir e sincroniza. |
| 6.9 | Classificação (`/organizacao/eventos/[id]/classificacao`) | Colocação por grupo apenas após encerramento da prova. |
| 6.10 | Resultados (`/organizacao/eventos/[id]/resultados`) | Valores batem com a cronometragem oficial. |

---

## 7. Portal do atleta

| # | Rota / ação | Esperado |
|---|-------------|----------|
| 7.1 | Dashboard (`/portal/dashboard`) | Visão geral correta. |
| 7.2 | Eventos (`/portal/eventos` e `/eventos/[id]`) | Lista pública; detalhe com inscrição. |
| 7.3 | Inscrição (`/portal/eventos/[id]/inscricao`) | Fluxo de inscrição cria o registro; pagamento (`/pagamento`) atualiza o status. |
| 7.4 | Minhas inscrições (`/portal/minhas-inscricoes`) | Inscrições com status correto. |
| 7.5 | Meus atletas (`/portal/meus-atletas`) | Gerenciar atletas. |
| 7.6 | Credenciais (`/portal/credenciais`) | Dorsal/card do atleta gerado. |
| 7.7 | Minha jornada (`/portal/minha-jornada`) | Etapas da jornada do atleta renderizam. |
| 7.8 | Meus resultados (`/portal/meus-resultados`) | Colocação dentro do grupo após publicação. |
| 7.9 | Perfil (`/portal/perfil`) | Editar dados. |

---

## 8. PWA / instalação

| # | Ação | Esperado |
|---|------|----------|
| 8.1 | Chrome/Android: "Instalar app" | O app instala e abre em janela própria. |
| 8.2 | Manifest | Ícones e nome do manifest corretos. |
| 8.3 | Funcionalidade offline básica | A tela (não os dados) abre sem internet quando já visitada. |

---

## 9. Segurança (sanidade)

| # | Ação | Esperado |
|---|------|----------|
| 9.1 | Inspecionar rede no portal | Nenhuma requisição expõe dados de outro atleta (RLS funcionando). |
| 9.2 | Relatórios/financeiro fora do admin | Bloqueado (papel + RLS). |
| 9.3 | Revisar `git log` | Nenhum segredo/`.env` versionado. |

---

## Como reportar falhas

Para cada falha, informe:
1. Rota e passo do checklist (ex.: 6.7).
2. O que fez (detalhe do passo).
3. O que aconteceu (comportamento observado, print/console).
4. O que esperava (resultado esperado).
5. Contexto: navegador, dispositivo, online/offline.

Correções serão feitas em commits no `main` com teste unitário quando aplicável.
