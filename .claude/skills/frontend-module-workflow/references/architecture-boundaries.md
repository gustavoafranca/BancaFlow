# Architecture Boundaries

## Direção de dependências

```
app/**  (rotas, route groups)
  │  pode importar
  ▼
modules/<domain>
  │  pode importar
  ▼
shared/
```

- `app/**` pode importar `modules/*` e `shared/`.
- `modules/*` pode importar `shared/`, mas **nunca** outro `modules/<outro-domain>` diretamente — se dois módulos precisam do mesmo dado/comportamento, o candidato é promover para `shared` (se for genérico) ou expor via um contrato explícito (query/API), não um import cruzado direto.
- `shared/` **nunca** importa de `modules/*`. Se `shared/` "precisar" de algo de um módulo, é sinal de que aquele algo não é genérico o suficiente para estar em `shared` — mover para o módulo em vez de criar a dependência invertida.
- `shared/` não contém DTO, texto (copy) ou regra de validação amarrados a um bounded context específico. Um schema/validador em `shared/form` pode fornecer primitives (`v.defineObject`, resolver), mas o schema concreto de "cadastro de pessoa" vive no módulo `pessoas`.

Exemplo de violação comum: um componente em `shared/components/ui/pessoa-badge.tsx` que conhece os `Tipo` (`Dono`/`Funcionário`/`Recolhe`) do módulo `pessoas`. Isso é conhecimento de domínio vazando para `shared` — o componente correto é `modules/pessoas/components/pessoa-badge.tsx`, opcionalmente composto sobre uma primitive genérica de `shared/components/ui/badge.tsx`.

## Server Components por padrão

- Todo arquivo em `app/**` e a maioria dos componentes de módulo devem ser Server Components (sem `'use client'`).
- Adicionar `'use client'` apenas no componente-folha que precisa de:
  - estado local (`useState`, `useReducer`);
  - efeito (`useEffect`) para algo que só existe no browser (resize, drag, `IntersectionObserver`);
  - handler de evento do DOM (`onClick`, `onChange`, `onMouseDown`);
  - API de browser (`window`, `document`, `localStorage`).
- Não propagar `'use client'` para cima "para simplificar" — isso transforma a árvore inteira em client-side e perde os benefícios de RSC (menos JS no cliente, fetch direto no servidor).
- Fetch de dados que não depende de interação do usuário deve rodar no Server Component (page ou componente pai), passando os dados já resolvidos como props para o componente client que só cuida de interação.
- Uma primitive puramente visual (`Button`, `Input`, `Badge`, `Table`) não deve conter `fetch` nem side effects de dados — ela recebe dados prontos via props.

## Composição cross-module

**Regra única, sem exceção implícita**: um módulo nunca importa outro módulo — nem por caminho interno, nem através do `index.ts`/barrel dele. Importar pelo barrel encapsula melhor, mas não elimina a dependência: `modules/acerto` importando `@/modules/cambistas` (mesmo que só o `index.ts`) ainda é uma aresta `modules/acerto → modules/cambistas` no grafo de dependências, com o mesmo risco de ciclo, acoplamento entre bounded contexts e propagação indevida de tipos/componentes que um import direto teria.

Quando uma tela precisa combinar dados/UI de mais de um domínio (ex.: a tela de "Acerto" precisa listar "Cambistas"), a composição acontece **somente** na camada de rota — nunca dentro do núcleo de outro módulo:

```tsx
// app/(private)/acerto/_components/acerto-screen.tsx
import { AcertoPageContent } from '@/modules/acerto'
import { CambistaSelector } from '@/modules/cambistas'

export function AcertoScreen() {
  return <AcertoPageContent cambistaSelector={<CambistaSelector />} />
}
```

- A rota/`_components` da rota pode importar a API pública (`index.ts`) de quantos módulos precisar — é o único lugar onde isso é permitido.
- Cada módulo continua expondo só sua API pública pelo `index.ts`; import por caminho interno (`modules/cambistas/components/xyz` direto) continua proibido em qualquer camada.
- Se a composição se repetir em várias telas, é candidato a virar um componente `shared` — mas só se o resultado for genérico (ex.: "seletor de entidade com busca") e não amarrado à linguagem de `cambistas` especificamente; nesse caso o componente `shared` recebe os dados/render props já resolvidos, sem importar `modules/cambistas`.
- Uma dependência direta `module → module` só é aceitável se for deliberadamente aprovada, documentada como aciclica e exposta exclusivamente pela API pública do módulo dependido — tratar como exceção registrada, nunca como padrão default.

## Limites domínio / backend / Web

- `apps/web` nunca importa `@prisma/client`, adapters Prisma, ou qualquer pacote de infraestrutura do backend (`apps/backend/src/**`, módulos `modules/*` do domínio server-side).
- Toda regra que decide um resultado de negócio (elegibilidade, cálculo autoritativo, permissão) vive no backend/domínio. O Web só replica uma versão "otimista"/de UX quando isso melhora a experiência (ex.: desabilitar um botão enquanto o formulário é inválido no cliente) — mas a chamada real ao backend é sempre a fonte de verdade, e o Web trata o erro retornado por ela como autoritativo.
- Validação de schema no Web (`v.defineObject`, Zod, etc.) é para UX (feedback antes do submit), não para impor a regra de negócio final — o backend valida de novo e pode rejeitar mesmo que o schema do Web tenha passado.
- Sinal de violação: um componente/hook do Web que decide sozinho (sem chamar o backend) se uma operação é permitida com base em regra de domínio (ex.: "só pode editar se `status === 'ATIVO'` E `saldo > 0`" replicado inteiramente no cliente) em vez de refletir o que o backend informou.
