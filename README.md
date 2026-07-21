# BancaFlow

BancaFlow é um monorepo para a operação multi-tenant de bancas físicas. A documentação detalhada fica próxima de cada camada, para que regras de negócio, aplicação e infraestrutura tenham uma fonte única.

## Documentação da vertical Identity + Tenancy

### Domínio

- [Identity](modules/identity/README.md): contas, credenciais, sessões, regras e casos de uso.
- [Tenancy](modules/tenancy/README.md): banca, contexto de tenant e provisionamento atômico.

### Aplicações

- [Backend](apps/backend/README.md): API NestJS, adapters, Prisma, segurança e composition roots.
- [Web](apps/web/README.md): experiência de autenticação no Next.js, navegação e cliente HTTP.

## Desenvolvimento

Na raiz do monorepo:

```sh
npm install
npm run dev
npm run build
npm run test
npm run lint
```

O escopo atual da vertical é o MVP de autenticação multi-tenant. Permissões granulares, MFA e recuperação de senha por e-mail não fazem parte desta entrega.
