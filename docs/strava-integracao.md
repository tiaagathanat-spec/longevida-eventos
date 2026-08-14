# Integração / Experiência Strava — Documentação da dependência

> Estado: **NÃO implementada**. Este documento registra a dependência e o
> plano mínimo, conforme o Prompt Mestre (item 17): não criar integração
> falsa nem simulação de API. A implementação só deve começar com
> credenciais reais e autorização explícita.

## O que já existe no sistema

Nenhum código de integração com a API do Strava está presente no
repositório. Busca por `strava` no código não retorna resultados.

O módulo que consome a experiência no futuro é a **Minha Jornada**
(`app/portal/minha-jornada/page.tsx`), que hoje mostra provas disputadas,
pódios e próximos desafios do atleta — o vínculo com atividades Strava
entraria como uma evidência/companheiro de treino, não como fonte dos
resultados oficiais (que sempre vêm da cronometragem oficial).

## Dependência (API Strava)

Para integrar de verdade é necessário:

| Item | Onde | Observação |
| --- | --- | --- |
| `client_id` | API Strava (dev) | Segredo de servidor, nunca no cliente |
| `client_secret` | API Strava (dev) | Segredo de servidor, nunca no cliente |
| `redirect_uri` | API Strava (dev) | Rota de callback da aplicação |
| `APP_NAME` / refresh token | Strava OAuth | Necessários ao fluxo de conexão de conta |
| Aprovação do app Strava | Strava | Apps novos operam em modo de desenvolvimento até revisão |

### Escopos mínimos sugeridos

- `activity:read` — ler atividades do atleta para a "experiência" (percurso
  do evento comparado com treino).
- `read` — perfil básico (nome) para vincular conta Strava ao atleta.

Não solicitar escopos de escrita sem necessidade.

## Fluxo proposto (quando implementar)

1. Botão "Conectar com Strava" em `portal/perfil` → redireciona para
   `https://www.strava.com/oauth/authorize` com `client_id`, `redirect_uri`
   e escopos de leitura.
2. Rota de callback (server) troca o código pelo token via `oauth/token`
   e guarda o **refresh token** (criptografado, server-side) vinculado ao
   perfil do atleta.
3. Rota server `atividades` usa o refresh token para obter atividades
   recentes e expõe apenas os campos necessários à UI.
4. Em "Minha Jornada", o atleta vê os percursos dos eventos que disputou
   lado a lado com as atividades Strava (informação pública do atleta).

### Restrições

- Nenhuma credencial Strava no cliente (browser).
- Nenhum dado Strava vira resultado oficial.
- Bloqueio por RLS deve valer para o vínculo de conta (cada atleta só
  acessa o próprio).
- Enquanto não houver credenciais reais, a UI não deve exibir botões que
  simulam conexão.

## Critérios de aceite

- [ ] Conectar conta Strava abre o fluxo oficial de autorização.
- [ ] Refresh token guardado de forma segura, do lado do servidor.
- [ ] "Minha Jornada" mostra atividades vinculadas (somente do próprio atleta).
- [ ] Sem integração falsa: se a API não estiver disponível, a área fica oculta.
