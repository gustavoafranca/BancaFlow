# BancaFlow Web

Aplicação Web do BancaFlow construída com Next.js 16, React e App Router. Este README é a porta de entrada para execução e documentação; os detalhes de cada vertical ficam próximos ao respectivo módulo.

## Documentação dos módulos

- [Identity no Web](./src/modules/identity/README.md): login multi-tenant, cliente HTTP, cookies, silent refresh, `proxy.ts`, troca de senha, rotas e testes.

O diretório `src/modules/identity` ainda é um placeholder visual no MVP. A autenticação em uso vive em `src/app/login`, `src/app/trocar-senha`, `src/shared/api` e `src/shared/session`, conforme explicado no README do módulo.

## Convenção do Next.js 16

Use [`src/proxy.ts`](./src/proxy.ts), não `middleware.ts`, para a lógica executada antes da renderização. Essa é a convenção do Next.js 16 instalado e está registrada nas [regras locais do Web](./AGENTS.md). Ao adicionar uma rota privada, atualize também o matcher e os testes do proxy.

## Executar localmente

Na raiz do monorepo:

```bash
npm run dev -w apps/web
```

Por padrão, abra [http://localhost:3000](http://localhost:3000). Para validar login multi-tenant, use um hostname local com o subdomínio de uma banca de desenvolvimento e mantenha o backend acessível. As chamadas `/api/:path*` são reescritas para `BACKEND_INTERNAL_URL`, cujo default local é `http://localhost:4000`.

## Verificações

```bash
npm run lint -w apps/web
npm run test -w apps/web
npm run build -w apps/web
```

Os testes usam Jest, `next/jest` e Testing Library. Consulte [Como testar Identity](./src/modules/identity/README.md#como-testar) para saber o propósito dos specs dessa vertical.

## Estrutura principal

- `src/app`: rotas e layouts do App Router;
- `src/modules`: módulos de interface por domínio;
- `src/shared`: cliente HTTP, sessão, formulários e componentes compartilhados;
- `src/proxy.ts`: redirects leves antes da renderização;
- `next.config.ts`: configuração e rewrite `/api/:path*`.

O projeto preserva a configuração de fontes via `next/font` e os assets em `public`. A rota `/` ainda contém a página inicial do scaffold; as telas da aplicação vivem nas rotas descritas na documentação dos módulos.

## Referências do framework

- [Documentação do Next.js](https://nextjs.org/docs)
- [Tutorial Learn Next.js](https://nextjs.org/learn)
- [Repositório do Next.js](https://github.com/vercel/next.js)
- [Documentação de deployment](https://nextjs.org/docs/app/building-your-application/deploying)

A infraestrutura de produção deve manter `/api` no mesmo origin e preservar o host necessário à resolução da banca.
