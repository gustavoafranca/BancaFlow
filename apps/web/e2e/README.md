# E2E de browser (Playwright)

Desenvolvimento e E2E usam sempre hosts `.localhost` (`BANCA_HOST_SUFFIX=".localhost"`,
já o padrão de `apps/backend/.env.example`) — resolvem para `127.0.0.1`
nativamente em Chromium/Firefox (RFC 6761), sem editar `/etc/hosts`. Produção
usa `.bancaflow.com.br`, configurado por variável de ambiente do deploy, nunca
neste arquivo de exemplo.

`perfil-navigation.e2e.spec.ts` cobre a navegação de `align-profile-settings-experience`
(login → menu da conta → **Meu Perfil** → `/perfil`) contra o tenant isolado
`pw-e2e.localhost` — o mesmo seed/tenant descartável já usado por
`login-to-dashboard.e2e.spec.ts`, não `farizeu.localhost` (a Banca de seed
geral de desenvolvimento, que este runner não deve destruir/recriar). A
jornada validada não depende do código da Banca; `farizeu.localhost`
permanece válido como smoke test manual do ambiente local.

Cobre o requisito de `web-frontend-testing` que o teste de componente mockado
(`src/app/login-to-dashboard-flow.spec.tsx`) não satisfaz: navegação real,
cookies HttpOnly reais, o rewrite `/api/:path*` de `next.config.ts`, o
`proxy.ts` e a resolução de tenant por `Host` — tudo contra um backend e um
Postgres reais.

`profile-security.e2e.spec.ts` cobre a aba **Segurança** de `/perfil`
(`enable-profile-security-management`), também contra `pw-e2e.localhost`:

- duas sessões reais (dois contextos de browser via `browser.newContext()`),
  identificação da sessão atual (`isCurrent` calculado pelo Backend) e
  revogação de outra sessão com confirmação — prova que a sessão revogada
  perde acesso de fato (o contexto revogado é redirecionado para `/login` ao
  navegar, não apenas removido da lista do outro contexto);
- troca voluntária de senha: sucesso mantém a sessão atual autenticada (sem
  chamada manual a `refresh()`, o Backend já reemite o cookie), a senha
  antiga deixa de autenticar e a nova sim;
- senha atual incorreta exibe mensagem específica e nunca desloga o usuário
  (regressão do bug corrigido em `credential-management`: senha incorreta
  não é mais confundida com sessão expirada).

Como o seed cria a conta com `mustChangePassword: true`, o primeiro login de
cada teste completa a troca obrigatória antes de qualquer asserção sobre
sessões/senha — mesmo padrão de `login-to-dashboard.e2e.spec.ts`.

Este runner **não** orquestra os serviços automaticamente (sem `webServer` no
`playwright.config.ts`): subir múltiplos processos com estado (DB real) a
partir do test runner tende a ser mais frágil do que documentar o
pré-requisito. Antes de rodar `npx playwright test`, com o Postgres já no ar
(`npm run db:start` em `apps/backend`):

```bash
# 1. Backend (porta padrão 4000)
cd apps/backend && npm run build && npm run start:prod

# 2. Seed do usuário/banca de teste (idempotente — recria do zero a cada execução).
#    DESTRUTIVO: apaga sessão/conta/banca do código "pw-e2e" e cria uma senha
#    conhecida. Falha fechado a menos que NODE_ENV seja development/test,
#    DATABASE_URL aponte para localhost/127.0.0.1, E ALLOW_E2E_SEED=true seja
#    passada explicitamente (a suíte do Playwright já passa isso sozinha no
#    seu próprio beforeEach — só rodar manualmente precisa disto).
cd apps/backend && ALLOW_E2E_SEED=true npm run seed:e2e

# 3. Frontend (porta padrão 3000)
cd apps/web && npm run dev

# 4. Rodar os testes
cd apps/web && npx playwright test
```

O host de teste é `pw-e2e.localhost` — resolve para `127.0.0.1` nativamente em
Chromium/Firefox (RFC 6761), sem precisar editar `/etc/hosts`. Requer
`BANCA_HOST_SUFFIX=".localhost"` no `.env` do backend (já é o padrão de dev,
ver `apps/backend/.env`).

Para apontar para servidores já rodando em portas diferentes das padrão, use
`E2E_BASE_URL` (ex.: `E2E_BASE_URL=http://pw-e2e.localhost:3922 npx playwright test`).

Instalação do browser (uma vez, requer os pacotes de sistema do Chromium):

```bash
npx playwright install --with-deps chromium
```

Em sandboxes sem acesso a `sudo`/apt (`--with-deps` falha por exigir root),
baixe só o binário (`npx playwright install chromium`, sem `--with-deps`) e
resolva as bibliotecas nativas faltantes (`libnspr4`, `libnss3`,
`libnssutil3`, `libasound.so.2` — confira com `ldd <chrome-headless-shell>
| grep "not found"`) baixando os `.deb` sem privilégio (`apt-get download
<pacote>`), extraindo localmente (`dpkg-deb -x pacote.deb <dir>`) e apontando
`LD_LIBRARY_PATH` para `<dir>/usr/lib/x86_64-linux-gnu` antes de rodar os
testes.

Confirmado funcionando (tarefa 9.4 de `refine-tenant-user-administration-experience`):
`apt-get download libnspr4 libnss3 libasound2t64` (pacote `libnssutil3`
não existe mais separado — `libnssutil3.so` já vem dentro do `.deb` de
`libnss3`) cobre as 4 bibliotecas. `libasound.so.2` só é necessária pelo
Chromium completo (não pelo `chrome-headless-shell`), mas não há problema em
extrair de qualquer forma.
